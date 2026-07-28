import {
  normalizeOpenClawErrorKey,
  OPENCLAW_ERROR_CATEGORIES,
  OPENCLAW_HTTP_STATUS,
  OpenClawBoundaryError,
  classifyOpenClawError,
  defaultHttpStatusForOpenClawCategory,
} from './openclaw-boundary.error';

const UNMAPPED_HTTP_STATUS_FOR_TEST = 418;

describe('openclaw boundary error taxonomy', () => {
  it('classifies canonical upstream error keys', () => {
    expect(
      classifyOpenClawError(
        OPENCLAW_HTTP_STATUS.BAD_REQUEST,
        ` ${OPENCLAW_ERROR_CATEGORIES.PROVIDER_CONFIG_INVALID} `,
      ),
    ).toBe(OPENCLAW_ERROR_CATEGORIES.PROVIDER_CONFIG_INVALID);
    expect(
      classifyOpenClawError(
        OPENCLAW_HTTP_STATUS.BAD_REQUEST,
        OPENCLAW_ERROR_CATEGORIES.PROVIDER_UNSUPPORTED,
      ),
    ).toBe(OPENCLAW_ERROR_CATEGORIES.PROVIDER_UNSUPPORTED);
    expect(
      classifyOpenClawError(
        OPENCLAW_HTTP_STATUS.BAD_REQUEST,
        OPENCLAW_ERROR_CATEGORIES.EMBEDDING_PROVIDER_UNSUPPORTED,
      ),
    ).toBe(OPENCLAW_ERROR_CATEGORIES.EMBEDDING_PROVIDER_UNSUPPORTED);
    expect(
      classifyOpenClawError(
        OPENCLAW_HTTP_STATUS.CAPABILITY_TIMEOUT,
        OPENCLAW_ERROR_CATEGORIES.CAPABILITY_TIMEOUT,
      ),
    ).toBe(OPENCLAW_ERROR_CATEGORIES.CAPABILITY_TIMEOUT);
  });

  it('normalizes error keys before classification', () => {
    expect(normalizeOpenClawErrorKey(' provider_config_invalid ')).toBe(
      OPENCLAW_ERROR_CATEGORIES.PROVIDER_CONFIG_INVALID,
    );
    expect(normalizeOpenClawErrorKey(undefined)).toBe('');
    expect(classifyOpenClawError(OPENCLAW_HTTP_STATUS.BAD_REQUEST, undefined)).toBe(
      OPENCLAW_ERROR_CATEGORIES.BAD_REQUEST,
    );
  });

  it('classifies dependency and capability-resolution heuristics', () => {
    expect(
      classifyOpenClawError(OPENCLAW_HTTP_STATUS.BAD_REQUEST, 'unknown capability: image'),
    ).toBe(OPENCLAW_ERROR_CATEGORIES.CAPABILITY_RESOLUTION);
    expect(classifyOpenClawError(OPENCLAW_HTTP_STATUS.BAD_REQUEST, 'no-api-key for provider')).toBe(
      OPENCLAW_ERROR_CATEGORIES.PROVIDER_DEPENDENCY,
    );
    expect(classifyOpenClawError(OPENCLAW_HTTP_STATUS.BAD_REQUEST, 'rate-limited upstream')).toBe(
      OPENCLAW_ERROR_CATEGORIES.PROVIDER_DEPENDENCY,
    );
    expect(classifyOpenClawError(OPENCLAW_HTTP_STATUS.BAD_REQUEST, 'embedding unavailable')).toBe(
      OPENCLAW_ERROR_CATEGORIES.PROVIDER_DEPENDENCY,
    );
  });

  it('falls back to HTTP status categories', () => {
    expect(classifyOpenClawError(OPENCLAW_HTTP_STATUS.UNAUTHORIZED, 'unexpected')).toBe(
      OPENCLAW_ERROR_CATEGORIES.UNAUTHORIZED,
    );
    expect(classifyOpenClawError(OPENCLAW_HTTP_STATUS.NOT_FOUND, 'unexpected')).toBe(
      OPENCLAW_ERROR_CATEGORIES.NOT_FOUND,
    );
    expect(classifyOpenClawError(OPENCLAW_HTTP_STATUS.PROVIDER_DEPENDENCY, 'unexpected')).toBe(
      OPENCLAW_ERROR_CATEGORIES.PROVIDER_DEPENDENCY,
    );
    expect(classifyOpenClawError(OPENCLAW_HTTP_STATUS.CAPABILITY_TIMEOUT, 'unexpected')).toBe(
      OPENCLAW_ERROR_CATEGORIES.CAPABILITY_TIMEOUT,
    );
    expect(classifyOpenClawError(OPENCLAW_HTTP_STATUS.INTERNAL_SERVER_ERROR, 'unexpected')).toBe(
      OPENCLAW_ERROR_CATEGORIES.INTERNAL_ERROR,
    );
    expect(classifyOpenClawError(OPENCLAW_HTTP_STATUS.BAD_REQUEST, 'unexpected')).toBe(
      OPENCLAW_ERROR_CATEGORIES.BAD_REQUEST,
    );
    expect(classifyOpenClawError(UNMAPPED_HTTP_STATUS_FOR_TEST, 'unexpected')).toBe(
      OPENCLAW_ERROR_CATEGORIES.UNKNOWN,
    );
  });

  it('maps categories to stable default HTTP statuses', () => {
    expect(defaultHttpStatusForOpenClawCategory(OPENCLAW_ERROR_CATEGORIES.UNAUTHORIZED)).toBe(
      OPENCLAW_HTTP_STATUS.UNAUTHORIZED,
    );
    expect(defaultHttpStatusForOpenClawCategory(OPENCLAW_ERROR_CATEGORIES.NOT_FOUND)).toBe(
      OPENCLAW_HTTP_STATUS.NOT_FOUND,
    );
    expect(defaultHttpStatusForOpenClawCategory(OPENCLAW_ERROR_CATEGORIES.CAPABILITY_TIMEOUT)).toBe(
      OPENCLAW_HTTP_STATUS.CAPABILITY_TIMEOUT,
    );
    expect(defaultHttpStatusForOpenClawCategory(OPENCLAW_ERROR_CATEGORIES.PROVIDER_DEPENDENCY)).toBe(
      OPENCLAW_HTTP_STATUS.PROVIDER_DEPENDENCY,
    );
    expect(defaultHttpStatusForOpenClawCategory(OPENCLAW_ERROR_CATEGORIES.INTERNAL_ERROR)).toBe(
      OPENCLAW_HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
    expect(defaultHttpStatusForOpenClawCategory(OPENCLAW_ERROR_CATEGORIES.PROVIDER_CONFIG_INVALID)).toBe(
      OPENCLAW_HTTP_STATUS.BAD_REQUEST,
    );
  });

  it('preserves category, status, upstream key, and capability name on the thrown error', () => {
    const error = new OpenClawBoundaryError(
      OPENCLAW_ERROR_CATEGORIES.PROVIDER_DEPENDENCY,
      OPENCLAW_HTTP_STATUS.PROVIDER_DEPENDENCY,
      'no-api-key',
      'generateGenericContent',
    );

    expect(error.name).toBe('OpenClawBoundaryError');
    expect(error.message).toBe('OpenClaw generateGenericContent: no-api-key');
    expect(error.category).toBe(OPENCLAW_ERROR_CATEGORIES.PROVIDER_DEPENDENCY);
    expect(error.httpStatus).toBe(OPENCLAW_HTTP_STATUS.PROVIDER_DEPENDENCY);
    expect(error.upstreamError).toBe('no-api-key');
    expect(error.capabilityName).toBe('generateGenericContent');
  });
});
