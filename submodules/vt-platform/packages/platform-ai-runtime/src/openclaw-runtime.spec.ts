import {
  OPENCLAW_HTTP_STATUS,
} from './openclaw-boundary.error';
import {
  OpenClawBuildClient,
  OpenClawRuntimeClient,
  OPENCLAW_TRANSPORT_FAILURE_ERROR,
  type OpenClawHttpErrorContext,
  type OpenClawTransportErrorContext,
} from './openclaw-runtime';

describe('OpenClawRuntimeClient', () => {
  const createHttpError = vi.fn((context: OpenClawHttpErrorContext) => new Error(`http:${context.capabilityName}:${context.errorKey}:${context.status}`));
  const createTransportError = vi.fn((context: OpenClawTransportErrorContext) => new Error(`transport:${context.capabilityName}:${context.transportErrorKey}`));
  const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };

  beforeEach(() => {
    createHttpError.mockClear();
    createTransportError.mockClear();
    logger.error.mockClear();
    logger.info.mockClear();
    logger.warn.mockClear();
  });

  it('posts generateGenericContent with headers and returns parsed body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', trace: { latencyMs: 12 } }),
    });

    const client = new OpenClawRuntimeClient({
      baseUrl: 'http://openclaw.local',
      s2sToken: 's2s-token',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger,
      createHttpError,
      createTransportError,
    });

    await expect(
      client.generateGenericContent(
        'tenant-a',
        { prompt: 'hello' },
        ['project-a'],
        { model: 'gpt-4o-mini' },
        { provider: 'openai', apiKey: 'secret-key' },
      ),
    ).resolves.toEqual({ status: 'ok', trace: { latencyMs: 12 } });

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://openclaw.local/capability/generateGenericContent',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-openclaw-s2s-token': 's2s-token',
        }),
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Generic generation for tenant tenant-a: status=ok, latency=12ms',
    );
  });

  it('maps HTTP failures through the provided http error factory', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'provider_config_invalid', apiKey: 'secret-key' }),
    });

    const client = new OpenClawRuntimeClient({
      baseUrl: 'http://openclaw.local',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger,
      createHttpError,
      createTransportError,
    });

    await expect(client.searchKnowledge(['project-a'], 'hello')).rejects.toThrow(
      'http:searchKnowledge:provider_config_invalid:400',
    );

    expect(createHttpError).toHaveBeenCalledWith({
      capabilityName: 'searchKnowledge',
      status: 400,
      errorKey: 'provider_config_invalid',
    });
    expect(logger.error).toHaveBeenCalledWith(
      'OpenClaw searchKnowledge failed: {"error":"provider_config_invalid","apiKey":"[REDACTED]"}',
    );
  });

  it('maps transport failures through the provided transport error factory', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('socket hang up'));

    const client = new OpenClawRuntimeClient({
      baseUrl: 'http://openclaw.local',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger,
      createHttpError,
      createTransportError,
    });

    await expect(client.runCapability('generateTopicPlan', { title: 'topic' })).rejects.toThrow(
      `transport:generateTopicPlan:${OPENCLAW_TRANSPORT_FAILURE_ERROR}`,
    );

    expect(createTransportError).toHaveBeenCalledWith({
      capabilityName: 'generateTopicPlan',
      transportErrorKey: OPENCLAW_TRANSPORT_FAILURE_ERROR,
      error: expect.any(Error),
    });
    expect(logger.error).toHaveBeenCalledWith(
      'OpenClaw generateTopicPlan transport failed: {"error":"socket hang up","transportErrorKey":"transport_failure"}',
    );
  });

  it('classifies request timeouts as capability_timeout and passes the configured timeout budget', async () => {
    const fetchImpl = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal;
      expect(signal).toBeDefined();
      return await new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(Object.assign(new Error('request timed out'), { name: 'TimeoutError' }));
        }, { once: true });
      });
    });

    const client = new OpenClawRuntimeClient({
      baseUrl: 'http://openclaw.local',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger,
      createHttpError,
      createTransportError,
      requestTimeoutMs: 5,
    });

    await expect(client.searchKnowledge(['project-a'], 'hello')).rejects.toThrow(
      'transport:searchKnowledge:capability_timeout',
    );

    expect(createTransportError).toHaveBeenCalledWith({
      capabilityName: 'searchKnowledge',
      transportErrorKey: 'capability_timeout',
      error: expect.objectContaining({ name: 'TimeoutError' }),
      timeoutMs: 5,
    });
    expect(logger.error).toHaveBeenCalledWith(
      'OpenClaw searchKnowledge transport failed: {"error":"request timed out","transportErrorKey":"capability_timeout"}',
    );
  });

  it('falls back to canonical http error key on non-json failure payloads', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('not-json');
      },
    });

    const client = new OpenClawRuntimeClient({
      baseUrl: 'http://openclaw.local',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger,
      createHttpError,
      createTransportError,
    });

    await expect(client.searchKnowledge(['project-a'], 'hello')).rejects.toThrow(
      'http:searchKnowledge:openclaw_request_failed:502',
    );
  });

  it('routes build-time ingest, job state, delete, and health through shared transport', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({
          accepted: true,
          projectRef: 'kb__build',
          jobRef: 'job_ref_001',
          assetRef: 'asset_ref_001',
          idempotentReplay: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          jobRef: 'job_ref_001',
          projectRef: 'kb__build',
          status: 'READY',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'ok',
          projectRef: 'kb__build',
          deleted: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'ok',
          capabilities: ['searchKnowledge', 'generateGenericContent'],
        }),
      });

    const client = new OpenClawBuildClient({
      baseUrl: 'http://openclaw.local',
      s2sToken: 's2s-token',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger,
      createHttpError,
      createTransportError,
    });

    await expect(
      client.ingestRaw({
        projectRef: 'kb__build',
        asset: { name: 'doc.md', content: 'hello' },
        assetRef: 'asset_ext_001',
      }),
    ).resolves.toEqual({
      accepted: true,
      projectRef: 'kb__build',
      jobRef: 'job_ref_001',
      assetRef: 'asset_ref_001',
      idempotentReplay: true,
    });
    await expect(client.getJobState('job_ref_001')).resolves.toMatchObject({ status: 'READY' });
    await expect(client.deleteProject('kb__build')).resolves.toEqual({
      status: 'ok',
      projectRef: 'kb__build',
      deleted: true,
    });
    await expect(client.healthCheck()).resolves.toEqual({
      healthy: true,
      capabilities: ['searchKnowledge', 'generateGenericContent'],
    });

    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      'http://openclaw.local/ingest',
      'http://openclaw.local/job/job_ref_001',
      'http://openclaw.local/project/kb__build',
      'http://openclaw.local/health?check=capabilities',
    ]);
  });

  it('treats deleteProject 404 as an idempotent successful delete', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: OPENCLAW_HTTP_STATUS.NOT_FOUND,
      json: async () => ({ error: 'not_found' }),
    });

    const client = new OpenClawBuildClient({
      baseUrl: 'http://openclaw.local',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger,
      createHttpError,
      createTransportError,
    });

    await expect(client.deleteProject('missing_project')).resolves.toEqual({
      status: 'ok',
      projectRef: 'missing_project',
      deleted: true,
    });
    expect(createHttpError).not.toHaveBeenCalled();
  });

  it('maps build-time HTTP and health failures consistently', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('not-json');
        },
      })
      .mockRejectedValueOnce(new Error('health timeout'));

    const client = new OpenClawBuildClient({
      baseUrl: 'http://openclaw.local',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger,
      createHttpError,
      createTransportError,
    });

    await expect(
      client.ingestRaw({
        projectRef: 'kb__build',
        asset: { name: 'doc.md', content: 'hello' },
      }),
    ).rejects.toThrow('http:ingestRaw:openclaw_request_failed:502');

    await expect(client.healthCheck()).resolves.toEqual({ healthy: false, capabilities: [] });
    expect(logger.warn).toHaveBeenCalledWith('OpenClaw health check failed: health timeout');
  });
});
