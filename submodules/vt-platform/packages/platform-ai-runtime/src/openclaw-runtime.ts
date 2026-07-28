import type { AiRuntimeEnginePort } from './ai-runtime-engine.port';
import {
  OPENCLAW_ERROR_CATEGORIES,
  OPENCLAW_HTTP_STATUS,
} from './openclaw-boundary.error';
import { appendUrlPathSegments } from '@vt/platform-api-contract/browser';

export type OpenClawJsonObject = Record<string, unknown>;

export interface GenerateContentInput {
  title: string;
  campaignName: string;
  topicTitle?: string;
  ancestorChain?: Array<{ title: string }>;
  channelTypes?: string[];
  existingSiblings?: Array<{ title: string }>;
  topicArgument?: { title: string; description?: string };
}

export interface GenerateContentOptions {
  model?: string;
  agentId?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: string;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface GenerateContentResult<TStructured = OpenClawJsonObject> {
  status: string;
  content?: string;
  text?: string;
  structured?: TStructured;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  trace?: {
    model: string;
    provider: string;
    latencyMs: number;
    knowledgeUsed: boolean;
    projectRefs?: string[];
    projectRef?: string | null;
  };
  error?: string;
}

export interface ProviderConfig {
  provider: string;
  apiKey: string;
  model?: string;
  embedModel?: string;
}

export interface ChatResponseInput {
  prompt: string;
  systemPrompt?: string;
  ragQuery?: string;
  ragTopK?: number;
  resolvedSnapshotId?: string;
  attachments?: Array<{ kind: string; mimeType: string; base64Data: string }>;
}

export interface GenericContentInput {
  prompt: string;
  systemPrompt?: string;
  ragQuery?: string;
  ragTopK?: number;
  resolvedSnapshotId?: string;
  responseSchema?: OpenClawJsonObject;
}

export interface OpenClawCitation {
  chunkId: string;
  text: string;
  score: number;
  sourceAssetId: string;
  sourceExternalRef?: string;
  projectRef: string;
}

export interface SearchKnowledgeResult {
  status: string;
  results: Array<{
    chunkId: string;
    text: string;
    score: number;
    sourceAssetId: string;
    sourceExternalRef?: string;
    sourceFormat?: string;
    sourcePages?: number[];
    sourceRows?: number[];
    sourceItems?: number[];
    projectRef?: string;
  }>;
  totalIndexed: number;
  searched: number;
  latencyMs: number;
  error?: string;
}

export interface IngestDocumentResponse {
  accepted: boolean;
  projectRef: string;
  jobRef: string;
  assetRef?: string;
  idempotentReplay?: boolean;
}

export interface IngestRawParams {
  projectRef: string;
  asset: { name: string; type?: string; content: string };
  assetRef?: string;
  webhookUrl?: string;
}

export interface JobState {
  jobRef: string;
  projectRef: string;
  status: 'ACCEPTED' | 'PROCESSING' | 'READY' | 'FAILED';
  summary?: {
    chunks?: number;
    embeddings?: number;
    strategy?: string;
    setId?: string;
    errors?: Array<{ assetId: string; error: string }>;
  };
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface DeleteProjectResponse {
  status: string;
  projectRef: string;
  deleted: boolean;
}

export interface OpenClawHealthResult {
  healthy: boolean;
  capabilities: string[];
}

export interface OpenClawRuntimeLogger {
  error(message: string): void;
  info?(message: string): void;
  warn?(message: string): void;
}

export interface OpenClawHttpErrorContext {
  capabilityName: string;
  status: number;
  errorKey: string;
}

export interface OpenClawTransportErrorContext {
  capabilityName: string;
  transportErrorKey: string;
  error: unknown;
  timeoutMs?: number;
}

export interface OpenClawRuntimeClientOptions {
  baseUrl: string;
  s2sToken?: string;
  fetchImpl?: typeof fetch;
  logger?: OpenClawRuntimeLogger;
  requestTimeoutMs?: number;
  healthTimeoutMs?: number;
  createHttpError(context: OpenClawHttpErrorContext): Error;
  createTransportError(context: OpenClawTransportErrorContext): Error;
}

export const OPENCLAW_TRANSPORT_FAILURE_ERROR = 'transport_failure';
export const OPENCLAW_HTTP_FAILURE_ERROR = 'openclaw_request_failed';

function redactSensitive(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((entry) => redactSensitive(entry));
  }
  if (typeof obj !== 'object') return obj;

  const result: OpenClawJsonObject = {};
  for (const [key, value] of Object.entries(obj)) {
    if (/apiKey|api_key|secret|token|password|authorization/i.test(key)) {
      result[key] = '[REDACTED]';
      continue;
    }
    result[key] = redactSensitive(value);
  }
  return result;
}

function readErrorKey(payload: unknown, fallback: string): string {
  if (typeof payload !== 'object' || payload === null) return fallback;
  const candidate = (payload as Record<string, unknown>)['error'];
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : fallback;
}

function readCapabilities(payload: unknown): string[] {
  if (typeof payload !== 'object' || payload === null) return [];
  const candidate = (payload as Record<string, unknown>)['capabilities'];
  return Array.isArray(candidate) ? candidate.filter((entry): entry is string => typeof entry === 'string') : [];
}

export class OpenClawBaseHttpClient {
  protected readonly baseUrl: string;
  protected readonly s2sToken?: string;
  protected readonly fetchImpl: typeof fetch;
  protected readonly logger?: OpenClawRuntimeLogger;
  protected readonly requestTimeoutMs: number;
  protected readonly healthTimeoutMs: number;
  protected readonly createHttpError: OpenClawRuntimeClientOptions['createHttpError'];
  protected readonly createTransportError: OpenClawRuntimeClientOptions['createTransportError'];

  constructor(options: OpenClawRuntimeClientOptions) {
    this.baseUrl = options.baseUrl;
    this.s2sToken = options.s2sToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.logger = options.logger;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 12000;
    this.healthTimeoutMs = options.healthTimeoutMs ?? 3000;
    this.createHttpError = options.createHttpError;
    this.createTransportError = options.createTransportError;
  }

  protected buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.s2sToken) {
      headers['x-openclaw-s2s-token'] = this.s2sToken;
    }
    return headers;
  }

  protected logInfo(message: string) {
    this.logger?.info?.(message);
  }

  protected logWarn(message: string) {
    this.logger?.warn?.(message);
  }

  protected logError(message: string) {
    this.logger?.error(message);
  }

  protected readTransportErrorKey(error: unknown): string {
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      return OPENCLAW_ERROR_CATEGORIES.CAPABILITY_TIMEOUT;
    }
    return OPENCLAW_TRANSPORT_FAILURE_ERROR;
  }

  protected throwTransportBoundaryError(capabilityName: string, error: unknown): never {
    const transportErrorKey = this.readTransportErrorKey(error);
    const transportErrorDetail =
      error instanceof Error && typeof error.message === 'string' && error.message.trim().length > 0
        ? error.message.trim()
        : transportErrorKey;

    this.logError(
      `OpenClaw ${capabilityName} transport failed: ${JSON.stringify(
        redactSensitive({ error: transportErrorDetail, transportErrorKey }),
      )}`,
    );

    throw this.createTransportError({
      capabilityName,
      transportErrorKey,
      error,
      timeoutMs: transportErrorKey === OPENCLAW_ERROR_CATEGORIES.CAPABILITY_TIMEOUT ? this.requestTimeoutMs : undefined,
    });
  }

  protected async requestJson<TResponse>(
    capabilityName: string,
    url: string,
    init: RequestInit,
  ): Promise<TResponse> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        ...init,
        headers: {
          ...this.buildHeaders(),
          ...(init.headers ?? {}),
        },
        signal: init.signal ?? AbortSignal.timeout(this.requestTimeoutMs),
      });
    } catch (error) {
      this.throwTransportBoundaryError(capabilityName, error);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: OPENCLAW_HTTP_FAILURE_ERROR }));
      this.logError(`OpenClaw ${capabilityName} failed: ${JSON.stringify(redactSensitive(error))}`);
      throw this.createHttpError({
        capabilityName,
        status: response.status,
        errorKey: readErrorKey(error, OPENCLAW_HTTP_FAILURE_ERROR),
      });
    }

    return (await response.json()) as TResponse;
  }

  protected async postCapability<TResponse>(
    capabilityName: string,
    payload: OpenClawJsonObject,
  ): Promise<TResponse> {
    return this.requestJson<TResponse>(
      capabilityName,
      appendUrlPathSegments(`${this.baseUrl}/capability`, capabilityName),
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  }
}

export class OpenClawRuntimeClient extends OpenClawBaseHttpClient implements AiRuntimeEnginePort {

  async generateMarketingContent(
    tenantId: string,
    input: OpenClawJsonObject,
    projectRefs?: string[],
    options?: GenerateContentOptions,
    providerConfig?: ProviderConfig,
  ): Promise<GenerateContentResult> {
    const result = await this.postCapability<GenerateContentResult>('generateMarketingContent', {
      projectRefs: Array.isArray(projectRefs) ? projectRefs : [],
      input,
      options: options ?? {},
      ...(providerConfig ? { providerConfig } : {}),
    });
    this.logInfo(
      `Generated content for tenant ${tenantId}: status=${result.status}, latency=${result.trace?.latencyMs}ms`,
    );
    return result;
  }

  async generateChatResponse(
    tenantId: string,
    input: ChatResponseInput,
    projectRefs: string[],
    options?: GenerateContentOptions,
    providerConfig?: ProviderConfig,
  ): Promise<GenerateContentResult & { citations?: OpenClawCitation[] }> {
    const result = await this.postCapability<GenerateContentResult & { citations?: OpenClawCitation[] }>(
      'generateChatResponse',
      {
        projectRefs,
        input,
        options: options ?? {},
        ...(providerConfig ? { providerConfig } : {}),
      },
    );
    this.logInfo(
      `Chat response for tenant ${tenantId}: status=${result.status}, latency=${result.trace?.latencyMs}ms`,
    );
    return result;
  }

  async generateGenericContent(
    tenantId: string,
    input: GenericContentInput,
    projectRefs: string[],
    options?: GenerateContentOptions,
    providerConfig?: ProviderConfig,
  ): Promise<GenerateContentResult & { citations?: OpenClawCitation[] }> {
    const result = await this.postCapability<GenerateContentResult & { citations?: OpenClawCitation[] }>(
      'generateGenericContent',
      {
        projectRefs,
        input,
        options: options ?? {},
        ...(providerConfig ? { providerConfig } : {}),
      },
    );
    this.logInfo(
      `Generic generation for tenant ${tenantId}: status=${result.status}, latency=${result.trace?.latencyMs}ms`,
    );
    return result;
  }

  async searchKnowledge(
    projectRefs: string[],
    query: string,
    topK = 5,
    minScore = 0.3,
    providerConfig?: ProviderConfig,
  ): Promise<SearchKnowledgeResult> {
    return this.postCapability<SearchKnowledgeResult>('searchKnowledge', {
      projectRefs,
      input: { query, topK, minScore },
      ...(providerConfig ? { providerConfig } : {}),
    });
  }

  async runCapability(
    capabilityName: string,
    input: OpenClawJsonObject,
    projectRefs?: string[],
    options?: GenerateContentOptions,
    providerConfig?: ProviderConfig,
  ): Promise<GenerateContentResult> {
    return this.postCapability<GenerateContentResult>(capabilityName, {
      projectRefs: Array.isArray(projectRefs) ? projectRefs : [],
      input,
      options: options ?? {},
      ...(providerConfig ? { providerConfig } : {}),
    });
  }
}

export class OpenClawBuildClient extends OpenClawBaseHttpClient {
  async ingestRaw(params: IngestRawParams): Promise<IngestDocumentResponse> {
    return this.requestJson<IngestDocumentResponse>('ingestRaw', `${this.baseUrl}/ingest`, {
      method: 'POST',
      body: JSON.stringify({
        projectRef: params.projectRef,
        asset: params.asset,
        assetRef: params.assetRef,
        webhookUrl: params.webhookUrl,
      }),
    });
  }

  async getJobState(jobRef: string): Promise<JobState> {
    return this.requestJson<JobState>('getJobState', appendUrlPathSegments(`${this.baseUrl}/job`, jobRef), {
      method: 'GET',
    });
  }

  async deleteProject(projectRef: string): Promise<DeleteProjectResponse> {
    let response: Response;
    try {
      response = await this.fetchImpl(appendUrlPathSegments(`${this.baseUrl}/project`, projectRef), {
        method: 'DELETE',
        headers: this.buildHeaders(),
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });
    } catch (error) {
      this.throwTransportBoundaryError('deleteProject', error);
    }

    if (response.status === OPENCLAW_HTTP_STATUS.NOT_FOUND) {
      return {
        status: 'ok',
        projectRef,
        deleted: true,
      };
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: OPENCLAW_HTTP_FAILURE_ERROR }));
      this.logError(`OpenClaw deleteProject failed: ${JSON.stringify(redactSensitive(error))}`);
      throw this.createHttpError({
        capabilityName: 'deleteProject',
        status: response.status,
        errorKey: readErrorKey(error, OPENCLAW_HTTP_FAILURE_ERROR),
      });
    }

    return (await response.json()) as DeleteProjectResponse;
  }

  async healthCheck(): Promise<OpenClawHealthResult> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/health?check=capabilities`, {
        headers: this.buildHeaders(),
        signal: AbortSignal.timeout(this.healthTimeoutMs),
      });
      if (!response.ok) {
        return { healthy: false, capabilities: [] };
      }
      const body = await response.json();
      return { healthy: true, capabilities: readCapabilities(body) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logWarn(`OpenClaw health check failed: ${message}`);
      return { healthy: false, capabilities: [] };
    }
  }
}
