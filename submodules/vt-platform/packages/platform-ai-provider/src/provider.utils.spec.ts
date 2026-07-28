import { DomainBadRequestException } from '@vt/platform-error';
import {
  AI_PROVIDER_TENANT_VARIABLE_KEYS,
  AI_SUPPORTED_PROVIDERS,
  canonicalizeAiProvider,
  AI_MODEL_IDS,
  defaultEmbeddingModelForAiProvider,
  defaultModelForAiProvider,
  inferAiProviderFromModel,
  tenantVariableKeyForAiProvider,
} from './provider.utils';

describe('platform-ai-provider', () => {
  it('infers provider from model names', () => {
    expect(inferAiProviderFromModel(AI_MODEL_IDS.GENAI_GEMINI_2_0_FLASH)).toBe('genai');
    expect(inferAiProviderFromModel('claude-3-5-sonnet')).toBe('anthropic');
    expect(inferAiProviderFromModel(AI_MODEL_IDS.OPENAI_GPT_4O_MINI)).toBe('openai');
    expect(inferAiProviderFromModel(undefined)).toBe('openai');
    expect(inferAiProviderFromModel('   ')).toBe('openai');
  });

  it('canonicalizes provider aliases', () => {
    expect(canonicalizeAiProvider('gemini', AI_MODEL_IDS.GENAI_GEMINI_2_0_FLASH)).toBe('genai');
    expect(canonicalizeAiProvider('google', AI_MODEL_IDS.GENAI_GEMINI_2_0_FLASH)).toBe('genai');
    expect(canonicalizeAiProvider('gpt', AI_MODEL_IDS.OPENAI_GPT_4O_MINI)).toBe('openai');
    expect(canonicalizeAiProvider('claude', 'claude-3-5-sonnet')).toBe('anthropic');
  });

  it('uses model inference when provider is omitted', () => {
    expect(canonicalizeAiProvider(undefined, AI_MODEL_IDS.GENAI_GEMINI_2_0_FLASH)).toBe('genai');
    expect(canonicalizeAiProvider(undefined, AI_MODEL_IDS.OPENAI_GPT_4O_MINI)).toBe('openai');
  });

  it('throws on unsupported provider', () => {
    expect(() => canonicalizeAiProvider('mistral', 'mistral-large-latest')).toThrow(DomainBadRequestException);
  });

  it('returns default models by provider', () => {
    expect(defaultModelForAiProvider('openai')).toBe(AI_MODEL_IDS.OPENAI_GPT_4O_MINI);
    expect(defaultModelForAiProvider('genai')).toBe(AI_MODEL_IDS.GENAI_GEMINI_2_0_FLASH);
    expect(defaultModelForAiProvider('anthropic')).toBe(AI_MODEL_IDS.ANTHROPIC_CLAUDE_3_5_SONNET_LATEST);
  });

  it('returns default embedding models where supported', () => {
    expect(defaultEmbeddingModelForAiProvider('openai')).toBe(AI_MODEL_IDS.OPENAI_TEXT_EMBEDDING_3_SMALL);
    expect(defaultEmbeddingModelForAiProvider('genai')).toBe(AI_MODEL_IDS.GENAI_TEXT_EMBEDDING_004);
    expect(defaultEmbeddingModelForAiProvider('anthropic')).toBeUndefined();
  });

  it('exports the supported provider registry in canonical order', () => {
    expect(AI_SUPPORTED_PROVIDERS).toEqual(['openai', 'anthropic', 'genai']);
  });

  it('resolves tenant variable keys for canonical and alias providers', () => {
    expect(tenantVariableKeyForAiProvider('openai')).toBe(AI_PROVIDER_TENANT_VARIABLE_KEYS.openai);
    expect(tenantVariableKeyForAiProvider('google')).toBe(AI_PROVIDER_TENANT_VARIABLE_KEYS.genai);
    expect(tenantVariableKeyForAiProvider('claude')).toBe(AI_PROVIDER_TENANT_VARIABLE_KEYS.anthropic);
    expect(tenantVariableKeyForAiProvider('local')).toBe(AI_PROVIDER_TENANT_VARIABLE_KEYS.local);
    expect(tenantVariableKeyForAiProvider('groq')).toBe('AI_GROQ_API_KEY');
  });
});
