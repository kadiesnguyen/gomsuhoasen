import { AI_ERROR_CODES } from '@vt/platform-error';
import { DomainBadRequestException } from '@vt/platform-error';

export type CanonicalAiProvider = 'openai' | 'genai' | 'anthropic';
export type AiProviderKeyTarget = CanonicalAiProvider | 'local';

export const AI_MODEL_IDS = {
  GENAI_GEMINI_2_0_FLASH: 'gemini-2.0-flash',
  GENAI_GEMINI_2_5_FLASH_PREVIEW: 'gemini-2.5-flash-preview',
  GENAI_GEMINI_1_5_PRO: 'gemini-1.5-pro',
  GENAI_GEMINI_1_5_FLASH: 'gemini-1.5-flash',
  GENAI_TEXT_EMBEDDING_004: 'text-embedding-004',
  OPENAI_GPT_4O: 'gpt-4o',
  OPENAI_GPT_4O_MINI: 'gpt-4o-mini',
  OPENAI_TEXT_EMBEDDING_3_SMALL: 'text-embedding-3-small',
  ANTHROPIC_CLAUDE_3_5_SONNET_LATEST: 'claude-3-5-sonnet-latest',
} as const;

export const AI_DEFAULT_CHAT_MODEL_BY_PROVIDER: Record<CanonicalAiProvider, string> = {
  genai: AI_MODEL_IDS.GENAI_GEMINI_2_0_FLASH,
  anthropic: AI_MODEL_IDS.ANTHROPIC_CLAUDE_3_5_SONNET_LATEST,
  openai: AI_MODEL_IDS.OPENAI_GPT_4O_MINI,
};

export const AI_DEFAULT_EMBEDDING_MODEL_BY_PROVIDER: Partial<Record<CanonicalAiProvider, string>> = {
  genai: AI_MODEL_IDS.GENAI_TEXT_EMBEDDING_004,
  openai: AI_MODEL_IDS.OPENAI_TEXT_EMBEDDING_3_SMALL,
};

export const AI_SUPPORTED_PROVIDERS: readonly CanonicalAiProvider[] = [
  'openai',
  'anthropic',
  'genai',
];

export const AI_PROVIDER_TENANT_VARIABLE_KEYS: Record<AiProviderKeyTarget, string> = {
  openai: 'AI_OPENAI_API_KEY',
  anthropic: 'AI_ANTHROPIC_API_KEY',
  genai: 'AI_GENAI_API_KEY',
  local: 'AI_LOCAL_API_KEY',
};

export interface AiProviderConnectionConfig {
  provider: CanonicalAiProvider;
  apiKey: string;
  model?: string;
  embedModel?: string;
}

function readLowercaseProviderToken(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

export function inferAiProviderFromModel(model: string | undefined): CanonicalAiProvider {
  const normalized = readLowercaseProviderToken(model);
  if (normalized?.includes('gemini')) return 'genai';
  if (normalized?.includes('claude')) return 'anthropic';
  if (normalized?.includes('gpt') || normalized?.startsWith('o1') || normalized?.startsWith('o3')) {
    return 'openai';
  }
  return 'openai';
}

export function canonicalizeAiProvider(
  rawProvider: string | undefined,
  model?: string,
): CanonicalAiProvider {
  if (rawProvider === undefined || rawProvider.length === 0) return inferAiProviderFromModel(model);

  const normalized = readLowercaseProviderToken(rawProvider);
  switch (normalized) {
    case 'gemini':
    case 'google':
    case 'genai':
      return 'genai';
    case 'openai':
    case 'gpt':
      return 'openai';
    case 'anthropic':
    case 'claude':
      return 'anthropic';
    default:
      throw new DomainBadRequestException(
        AI_ERROR_CODES.GENERIC_BAD_REQUEST,
        `Unsupported provider "${rawProvider}". Supported: openai, genai, anthropic.`,
      );
  }
}

export function defaultModelForAiProvider(provider: CanonicalAiProvider): string {
  return AI_DEFAULT_CHAT_MODEL_BY_PROVIDER[provider];
}

export function defaultEmbeddingModelForAiProvider(provider: CanonicalAiProvider): string | undefined {
  return AI_DEFAULT_EMBEDDING_MODEL_BY_PROVIDER[provider];
}

export function tenantVariableKeyForAiProvider(
  rawProvider: string | undefined,
  model?: string,
): string {
  const normalized = readLowercaseProviderToken(rawProvider);
  if (normalized === undefined) {
    return AI_PROVIDER_TENANT_VARIABLE_KEYS[inferAiProviderFromModel(model)];
  }

  if (normalized === 'local') {
    return AI_PROVIDER_TENANT_VARIABLE_KEYS.local;
  }

  try {
    return AI_PROVIDER_TENANT_VARIABLE_KEYS[canonicalizeAiProvider(normalized, model)];
  } catch {
    return `AI_${normalized.toUpperCase()}_API_KEY`;
  }
}
