import assert from 'node:assert/strict';
import test from 'node:test';
import type { IJobHandler, IJobRunner, JobRunnerEnqueueOptions, JobSummary } from './index';

const summary: JobSummary = {
  processedCount: 5,
  successCount: 5,
  failCount: 0,
  note: 'ok',
};

const handler: IJobHandler = {
  async handle() {
    return summary;
  },
};

class FakeRunner implements IJobRunner {
  public readonly handlers = new Map<string, IJobHandler>();
  public readonly queued: Array<{ tenantId: string; jobKey: string; options?: JobRunnerEnqueueOptions }> = [];

  registerHandler(jobKey: string, nextHandler: IJobHandler): void {
    this.handlers.set(jobKey, nextHandler);
  }

  async enqueue(tenantId: string, jobKey: string, options?: JobRunnerEnqueueOptions): Promise<void> {
    this.queued.push({ tenantId, jobKey, options });
  }

  async tick(): Promise<void> {
    return;
  }
}

test('job-runner contracts support compile-time handler and runner implementations', async () => {
  const runner = new FakeRunner();
  runner.registerHandler('email', handler);

  await runner.enqueue('tenant-1', 'email', {
    batchLimit: 50,
    maxRetries: 3,
    retryDelayMs: 1_000,
    stuckTimeoutMs: 60_000,
  });

  const result = await runner.handlers.get('email')?.handle('tenant-1', 'email', 50);

  assert.equal(runner.queued.length, 1);
  assert.equal(runner.queued[0]?.options?.maxRetries, 3);
  assert.deepEqual(result, summary);
});
