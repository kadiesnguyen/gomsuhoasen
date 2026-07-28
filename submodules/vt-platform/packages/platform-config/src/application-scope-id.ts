import { EnvSource, requireEnv } from './require-env';

export interface ResolveApplicationScopeIdOptions {
  envKey: string;
  source?: EnvSource;
}

export interface ApplicationScopeEventMetadata {
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  correlationId?: string;
}

export interface BuildApplicationScopeEventMetadataOptions {
  scopeId: string;
  aggregateType: string;
  aggregateId: string;
  correlationId?: string | null;
}

export const APPLICATION_SCOPE_ERROR_MESSAGES = {
  REQUIRED: 'Application scope id is required',
  INVALID: (value: string) => `Invalid application scope id: ${value}`,
  METADATA_REQUIRED: (name: string) => `${name} is required`,
} as const;

export function normalizeApplicationScopeId(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(APPLICATION_SCOPE_ERROR_MESSAGES.REQUIRED);
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/.test(normalized)) {
    throw new Error(APPLICATION_SCOPE_ERROR_MESSAGES.INVALID(value));
  }
  return normalized;
}

export function resolveApplicationScopeId(options: ResolveApplicationScopeIdOptions): string {
  return normalizeApplicationScopeId(requireEnv(options.envKey, options.source));
}

function requiredMetadataValue(name: string, value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(APPLICATION_SCOPE_ERROR_MESSAGES.METADATA_REQUIRED(name));
  }
  return normalized;
}

export function buildApplicationScopeEventMetadata(
  options: BuildApplicationScopeEventMetadataOptions,
): ApplicationScopeEventMetadata {
  const metadata: ApplicationScopeEventMetadata = {
    tenantId: normalizeApplicationScopeId(options.scopeId),
    aggregateType: requiredMetadataValue('aggregateType', options.aggregateType),
    aggregateId: requiredMetadataValue('aggregateId', options.aggregateId),
  };
  const correlationId = options.correlationId?.trim();
  if (correlationId) {
    metadata.correlationId = correlationId;
  }
  return metadata;
}
