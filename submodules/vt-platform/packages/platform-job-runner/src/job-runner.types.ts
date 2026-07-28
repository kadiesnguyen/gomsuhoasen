export interface JobSummary {
  processedCount: number;
  successCount: number;
  failCount: number;
  note?: string;
}

export interface IJobHandler {
  handle(tenantId: string, jobKey: string, batchLimit: number): Promise<JobSummary>;
}

export interface JobRunnerEnqueueOptions {
  correlationId?: string;
  causationId?: string;
  requestedBy?: string;
  cronExpr?: string;
  batchLimit?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  stuckTimeoutMs?: number;
}

export interface IJobRunner {
  registerHandler(jobKey: string, handler: IJobHandler): void;
  enqueue(tenantId: string, jobKey: string, options?: JobRunnerEnqueueOptions): Promise<void>;
  tick(): Promise<void>;
}
