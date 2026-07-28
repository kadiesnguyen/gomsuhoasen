import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JobRunnerMongoService } from './job-runner-mongo.service';
import { MongoJobStatus } from './mongo-job.schema';
import type { IJobHandler } from '@vt/platform-job-runner';

type Query = Record<string, unknown>;
type Update = {
  $setOnInsert?: Record<string, unknown>;
  $set?: Record<string, unknown>;
  $unset?: Record<string, unknown>;
};

class FakeJobDocument {
  _id!: string;
  tenantId!: string;
  jobKey!: string;
  enabled = true;
  cronExpr = '* * * * * *';
  status = MongoJobStatus.OPEN;
  batchLimit = 100;
  maxRetries = 3;
  retryCount = 0;
  retryDelayMs = 60_000;
  stuckTimeoutMs = 300_000;
  createdAt = new Date(Date.now() - 60_000);
  nextRunAfter?: Date;
  lastTriggeredAt?: Date;
  lastFinishedAt?: Date;
  lastFailedAt?: Date;
  lastError?: string;
  lastSummary?: unknown;

  constructor(data: Partial<FakeJobDocument>) {
    Object.assign(this, data);
  }

  async save(): Promise<this> {
    return this;
  }
}

class FakeJobModel {
  constructor(public readonly jobs: FakeJobDocument[]) {}

  find(query: Query) {
    return {
      exec: async () => this.jobs.filter((job) => this.matches(job, query)),
    };
  }

  findOneAndUpdate(query: Query, update: Update, options: { upsert?: boolean } = {}) {
    return {
      exec: async () => {
        let job = this.jobs.find((candidate) => this.matches(candidate, query));
        if (!job && options.upsert) {
          job = new FakeJobDocument({
            _id: `${query.tenantId as string}:${query.jobKey as string}`,
            tenantId: query.tenantId as string,
            jobKey: query.jobKey as string,
          });
          Object.assign(job, update.$setOnInsert ?? {});
          this.jobs.push(job);
        }
        if (!job) return null;
        Object.assign(job, update.$set ?? {});
        for (const key of Object.keys(update.$unset ?? {})) {
          delete (job as unknown as Record<string, unknown>)[key];
        }
        return job;
      },
    };
  }

  private matches(job: FakeJobDocument, query: Query): boolean {
    return Object.entries(query).every(([key, value]) => {
      if (value && typeof value === 'object' && '$in' in value) {
        return (value as { $in: unknown[] }).$in.includes((job as unknown as Query)[key]);
      }
      return (job as unknown as Query)[key] === value;
    });
  }
}

function buildService(jobs: FakeJobDocument[]): JobRunnerMongoService {
  return new JobRunnerMongoService(new FakeJobModel(jobs) as never, {
    workerEnabled: true,
    defaultRetryDelayMs: 10,
    defaultStuckTimeoutMs: 10,
  });
}

describe('JobRunnerMongoService', () => {
  it('runs due OPEN jobs and reopens them after success', async () => {
    const job = new FakeJobDocument({
      _id: 'job-1',
      tenantId: 'tenant-1',
      jobKey: 'demo.job',
      batchLimit: 5,
    });
    const service = buildService([job]);
    const handler: IJobHandler = {
      handle: async (tenantId, jobKey, batchLimit) => {
        assert.equal(tenantId, 'tenant-1');
        assert.equal(jobKey, 'demo.job');
        assert.equal(batchLimit, 5);
        return { processedCount: 1, successCount: 1, failCount: 0 };
      },
    };

    service.registerHandler('demo.job', handler);
    await service.tick();

    assert.equal(job.status, MongoJobStatus.OPEN);
    assert.equal(job.retryCount, 0);
    assert.deepEqual(job.lastSummary, { processedCount: 1, successCount: 1, failCount: 0 });
    assert.ok(job.lastFinishedAt instanceof Date);
  });

  it('reopens failed jobs for retry before retry exhaustion', async () => {
    const job = new FakeJobDocument({
      _id: 'job-2',
      tenantId: 'tenant-1',
      jobKey: 'fail.once',
      maxRetries: 3,
      retryDelayMs: 50,
    });
    const service = buildService([job]);
    service.registerHandler('fail.once', {
      handle: async () => {
        throw new Error('temporary crash');
      },
    });

    await service.tick();

    assert.equal(job.status, MongoJobStatus.OPEN);
    assert.equal(job.retryCount, 1);
    assert.equal(job.lastError, 'temporary crash');
    assert.ok(job.nextRunAfter instanceof Date);
    assert.match(String((job.lastSummary as { note?: string }).note), /^RETRY:/);
  });

  it('marks jobs FAILED when retry budget is exhausted', async () => {
    const job = new FakeJobDocument({
      _id: 'job-3',
      tenantId: 'tenant-1',
      jobKey: 'fail.final',
      maxRetries: 1,
    });
    const service = buildService([job]);
    service.registerHandler('fail.final', {
      handle: async () => {
        throw new Error('fatal crash');
      },
    });

    await service.tick();

    assert.equal(job.status, MongoJobStatus.FAILED);
    assert.equal(job.retryCount, 1);
    assert.equal(job.nextRunAfter, undefined);
    assert.match(String((job.lastSummary as { note?: string }).note), /^FAILED:/);
  });

  it('recovers stale RUNNING jobs instead of leaving them stuck forever', async () => {
    const job = new FakeJobDocument({
      _id: 'job-4',
      tenantId: 'tenant-1',
      jobKey: 'stale.job',
      status: MongoJobStatus.RUNNING,
      lastTriggeredAt: new Date(Date.now() - 10_000),
      stuckTimeoutMs: 1,
      retryDelayMs: 50,
    });
    const service = buildService([job]);

    await service.tick();

    assert.equal(job.status, MongoJobStatus.OPEN);
    assert.equal(job.retryCount, 1);
    assert.equal(job.lastError, 'STUCK: job exceeded stuckTimeoutMs=1');
    assert.ok(job.nextRunAfter instanceof Date);
  });

  it('recovers RUNNING jobs without a trigger timestamp', async () => {
    const job = new FakeJobDocument({
      _id: 'job-5',
      tenantId: 'tenant-1',
      jobKey: 'missing-trigger.job',
      status: MongoJobStatus.RUNNING,
      stuckTimeoutMs: 1,
      retryDelayMs: 50,
    });
    const service = buildService([job]);

    await service.tick();

    assert.equal(job.status, MongoJobStatus.OPEN);
    assert.equal(job.retryCount, 1);
    assert.equal(job.lastError, 'STUCK: job exceeded stuckTimeoutMs=1');
  });

  it('enqueue creates an enabled OPEN job with retry defaults', async () => {
    const jobs: FakeJobDocument[] = [];
    const service = buildService(jobs);

    await service.enqueue('tenant-1', 'new.job', {
      cronExpr: '*/10 * * * * *',
      batchLimit: 25,
      maxRetries: 5,
    });

    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].tenantId, 'tenant-1');
    assert.equal(jobs[0].jobKey, 'new.job');
    assert.equal(jobs[0].status, MongoJobStatus.OPEN);
    assert.equal(jobs[0].batchLimit, 25);
    assert.equal(jobs[0].maxRetries, 5);
  });

  it('survives if handler deletes the job before save', async () => {
    let saveCount = 0;
    const job = new FakeJobDocument({
      _id: 'job-delete-test',
      tenantId: 'tenant-1',
      jobKey: 'self.deleting.job',
      status: MongoJobStatus.OPEN,
      nextRunAfter: new Date(0),
    });

    job.save = async function() {
      saveCount++;
      const error = new Error(
        'No document found for query "{ _id: \"job-delete-test\" }"',
      ) as Error & { name: string };
      error.name = 'DocumentNotFoundError';
      throw error;
    };

    const jobs = [job];
    const service = buildService(jobs);
    service.registerHandler('self.deleting.job', {
      handle: async () => {
        // simulate deleteOne by removing it from the array
        jobs.splice(0, 1);
        return { processedCount: 1, successCount: 1, failCount: 0 };
      },
    });

    await service.tick();

    assert.equal(saveCount, 1);
    assert.equal(jobs.length, 0);
  });

  it('does not hide unrelated persistence failures', async () => {
    const job = new FakeJobDocument({
      _id: 'job-save-failure',
      tenantId: 'tenant-1',
      jobKey: 'save.failure.job',
      status: MongoJobStatus.OPEN,
      nextRunAfter: new Date(0),
    });
    const persistenceError = new Error('write concern failed');
    persistenceError.name = 'MongoServerError';
    job.save = async function() {
      throw persistenceError;
    };

    const service = buildService([job]);
    service.registerHandler('save.failure.job', {
      handle: async () => ({
        processedCount: 1,
        successCount: 1,
        failCount: 0,
      }),
    });

    await assert.rejects(service.tick(), persistenceError);
    assert.equal(job.status, MongoJobStatus.OPEN);
  });
});
