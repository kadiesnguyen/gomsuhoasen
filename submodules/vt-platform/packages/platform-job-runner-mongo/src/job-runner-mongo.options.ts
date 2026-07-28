export interface JobRunnerMongoOptions {
  connectionName?: string;
  defaultCronExpr?: string;
  defaultBatchLimit?: number;
  defaultMaxRetries?: number;
  defaultRetryDelayMs?: number;
  defaultStuckTimeoutMs?: number;
  workerEnabled?: boolean | (() => boolean);
}

export const JOB_RUNNER_MONGO_OPTIONS = Symbol('JOB_RUNNER_MONGO_OPTIONS');

export const JOB_RUNNER_MONGO_TIME = {
  DEFAULT_RETRY_DELAY_MS: 60_000,
  DEFAULT_STUCK_TIMEOUT_MS: 300_000,
} as const;

export const DEFAULT_JOB_RUNNER_MONGO_OPTIONS: Required<Omit<JobRunnerMongoOptions, 'workerEnabled' | 'connectionName'>> = {
  defaultCronExpr: '*/5 * * * * *',
  defaultBatchLimit: 100,
  defaultMaxRetries: 3,
  defaultRetryDelayMs: JOB_RUNNER_MONGO_TIME.DEFAULT_RETRY_DELAY_MS,
  defaultStuckTimeoutMs: JOB_RUNNER_MONGO_TIME.DEFAULT_STUCK_TIMEOUT_MS,
};
