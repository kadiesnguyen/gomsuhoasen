import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Interval } from '@nestjs/schedule';
import * as cronParserNamespace from 'cron-parser';
import { Model } from 'mongoose';
import type {
  IJobHandler,
  IJobRunner,
  JobRunnerEnqueueOptions,
  JobSummary,
} from '@vt/platform-job-runner';
import {
  DEFAULT_JOB_RUNNER_MONGO_OPTIONS,
  JOB_RUNNER_MONGO_OPTIONS,
  type JobRunnerMongoOptions,
} from './job-runner-mongo.options';
import { MongoJob, MongoJobDocument, MongoJobStatus } from './mongo-job.schema';

type CronParserRuntime = Pick<typeof import('cron-parser'), 'parseExpression'>;
const cronParserRuntime = cronParserNamespace as unknown as CronParserRuntime & {
  default?: CronParserRuntime;
};
const parseCronExpression = cronParserRuntime.parseExpression
  ?? cronParserRuntime.default?.parseExpression;

@Injectable()
export class JobRunnerMongoService implements IJobRunner {
  private readonly logger = new Logger(JobRunnerMongoService.name);
  private readonly handlers = new Map<string, IJobHandler>();
  private readonly options: Required<Omit<JobRunnerMongoOptions, 'workerEnabled' | 'connectionName'>> & Pick<JobRunnerMongoOptions, 'workerEnabled'>;

  constructor(
    @InjectModel(MongoJob.name) private readonly jobModel: Model<MongoJobDocument>,
    @Optional() @Inject(JOB_RUNNER_MONGO_OPTIONS) options?: JobRunnerMongoOptions,
  ) {
    const { connectionName: _connectionName, ...runtimeOptions } = options ?? {};
    this.options = {
      ...DEFAULT_JOB_RUNNER_MONGO_OPTIONS,
      ...runtimeOptions,
    };
  }

  registerHandler(jobKey: string, handler: IJobHandler): void {
    this.handlers.set(jobKey, handler);
    this.logger.log(`Registered job runner handler for jobKey=${jobKey}`);
  }

  async enqueue(
    tenantId: string,
    jobKey: string,
    options: JobRunnerEnqueueOptions = {},
  ): Promise<void> {
    await this.jobModel.findOneAndUpdate(
      { tenantId, jobKey },
      {
        $setOnInsert: {
          cronExpr: options.cronExpr ?? this.options.defaultCronExpr,
          batchLimit: options.batchLimit ?? this.options.defaultBatchLimit,
          maxRetries: options.maxRetries ?? this.options.defaultMaxRetries,
          retryDelayMs: options.retryDelayMs ?? this.options.defaultRetryDelayMs,
          stuckTimeoutMs: options.stuckTimeoutMs ?? this.options.defaultStuckTimeoutMs,
        },
        $set: {
          enabled: true,
          status: MongoJobStatus.OPEN,
          retryCount: 0,
          correlationId: options.correlationId,
          causationId: options.causationId,
          requestedBy: options.requestedBy,
        },
        $unset: {
          nextRunAfter: '',
          lastError: '',
        },
      },
      { upsert: true, returnDocument: 'after' },
    ).exec();
  }

  @Interval(10_000)
  async runScheduledTick(): Promise<void> {
    if (!this.shouldRunWorker()) return;
    await this.tick();
  }

  async tick(): Promise<void> {
    await this.recoverStuckRunningJobs();
    const jobs = await this.jobModel
      .find({ enabled: true, status: MongoJobStatus.OPEN })
      .exec();

    for (const job of jobs) {
      if (this.isDue(job)) {
        await this.triggerJob(job);
      }
    }
  }

  private shouldRunWorker(): boolean {
    const enabled = this.options.workerEnabled;
    if (typeof enabled === 'function') return enabled();
    return enabled ?? true;
  }

  private isDue(job: MongoJobDocument): boolean {
    if (job.nextRunAfter && job.nextRunAfter.getTime() > Date.now()) {
      return false;
    }

    try {
      const now = new Date();
      const lastTrigger = job.lastTriggeredAt
        ?? job.createdAt
        ?? new Date(Date.now() - 3_600_000);
      if (!parseCronExpression) throw new Error('cron-parser parseExpression export is unavailable');
      const iterator = parseCronExpression(job.cronExpr, {
        currentDate: lastTrigger,
        endDate: now,
        iterator: true,
      });
      return iterator.hasNext();
    } catch (error) {
      this.logger.error(`Invalid cron for jobKey=${job.jobKey}: ${job.cronExpr}`, error);
      return false;
    }
  }

  private async recoverStuckRunningJobs(): Promise<void> {
    const runningJobs = await this.jobModel
      .find({ enabled: true, status: MongoJobStatus.RUNNING })
      .exec();

    const now = Date.now();
    for (const job of runningJobs) {
      const startedAt = job.lastTriggeredAt?.getTime();
      if (startedAt && now - startedAt < job.stuckTimeoutMs) continue;

      await this.markFailedAttempt(
        job,
        `STUCK: job exceeded stuckTimeoutMs=${job.stuckTimeoutMs}`,
      );
    }
  }

  private async triggerJob(job: MongoJobDocument): Promise<void> {
    const lockedJob = await this.jobModel.findOneAndUpdate(
      { _id: job._id, status: MongoJobStatus.OPEN },
      {
        $set: {
          status: MongoJobStatus.RUNNING,
          lastTriggeredAt: new Date(),
          lastError: undefined,
        },
      },
      { returnDocument: 'after' },
    ).exec();

    if (!lockedJob) return;

    const handler = this.handlers.get(lockedJob.jobKey);
    if (!handler) {
      lockedJob.status = MongoJobStatus.OPEN;
      lockedJob.lastError = `No handler registered for jobKey=${lockedJob.jobKey}`;
      await this.saveJobIfPresent(lockedJob);
      return;
    }

    try {
      const summary = await handler.handle(
        lockedJob.tenantId,
        lockedJob.jobKey,
        lockedJob.batchLimit,
      );
      lockedJob.lastSummary = summary;
      lockedJob.lastFinishedAt = new Date();
      lockedJob.status = MongoJobStatus.OPEN;
      lockedJob.retryCount = 0;
      lockedJob.nextRunAfter = undefined;
      lockedJob.lastError = undefined;
      await this.saveJobIfPresent(lockedJob);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.markFailedAttempt(lockedJob, message);
    }
  }

  private async markFailedAttempt(job: MongoJobDocument, message: string): Promise<void> {
    const nextRetryCount = (job.retryCount ?? 0) + 1;
    const exhausted = nextRetryCount >= job.maxRetries;
    const summary: JobSummary = {
      processedCount: 0,
      successCount: 0,
      failCount: 1,
      note: exhausted ? `FAILED: ${message}` : `RETRY: ${message}`,
    };

    job.retryCount = nextRetryCount;
    job.lastFailedAt = new Date();
    job.lastError = message;
    job.lastSummary = summary;
    job.status = exhausted ? MongoJobStatus.FAILED : MongoJobStatus.OPEN;
    job.nextRunAfter = exhausted ? undefined : new Date(Date.now() + job.retryDelayMs);
    await this.saveJobIfPresent(job);
  }

  private async saveJobIfPresent(job: MongoJobDocument): Promise<boolean> {
    try {
      await job.save();
      return true;
    } catch (error) {
      if (this.isDocumentMissingError(error)) {
        this.logger.warn(
          `Skipping job save because job was removed during execution: tenantId=${job.tenantId} jobKey=${job.jobKey}`,
        );
        return false;
      }
      throw error;
    }
  }

  private isDocumentMissingError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return error.name === 'DocumentNotFoundError'
      || error.message.includes('No document found for query');
  }
}
