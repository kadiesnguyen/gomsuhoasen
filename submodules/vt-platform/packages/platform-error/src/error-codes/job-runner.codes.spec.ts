import assert from 'node:assert/strict';
import test from 'node:test';

import { JOB_RUNNER_ERROR_CODES } from './job-runner.codes';

test('job-runner error codes are symbolic and domain-scoped', () => {
  for (const value of Object.values(JOB_RUNNER_ERROR_CODES)) {
    assert.match(value, /^JOB_RUNNER_[A-Z0-9_]+$/);
  }
});
