/** Platform job-runner error codes — queue execution, admin ticks, and worker boundaries. */
export const JOB_RUNNER_ERROR_CODES = {
  PLATFORM_TENANT_REQUIRED: 'JOB_RUNNER_PLATFORM_TENANT_REQUIRED',
} as const;

export type JobRunnerErrorCode = (typeof JOB_RUNNER_ERROR_CODES)[keyof typeof JOB_RUNNER_ERROR_CODES];
