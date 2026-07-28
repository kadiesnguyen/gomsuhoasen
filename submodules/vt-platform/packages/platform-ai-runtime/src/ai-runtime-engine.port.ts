import type {
  ChatResponseInput,
  GenerateContentOptions,
  GenerateContentResult,
  GenericContentInput,
  OpenClawCitation,
  OpenClawJsonObject,
  ProviderConfig,
  SearchKnowledgeResult,
} from './openclaw-runtime';

export interface AiRuntimeEnginePort {
  generateMarketingContent(
    tenantId: string,
    input: OpenClawJsonObject,
    projectRefs?: string[],
    options?: GenerateContentOptions,
    providerConfig?: ProviderConfig,
  ): Promise<GenerateContentResult>;

  generateChatResponse(
    tenantId: string,
    input: ChatResponseInput,
    projectRefs: string[],
    options?: GenerateContentOptions,
    providerConfig?: ProviderConfig,
  ): Promise<GenerateContentResult & { citations?: OpenClawCitation[] }>;

  generateGenericContent(
    tenantId: string,
    input: GenericContentInput,
    projectRefs: string[],
    options?: GenerateContentOptions,
    providerConfig?: ProviderConfig,
  ): Promise<GenerateContentResult & { citations?: OpenClawCitation[] }>;

  searchKnowledge(
    projectRefs: string[],
    query: string,
    topK?: number,
    minScore?: number,
    providerConfig?: ProviderConfig,
  ): Promise<SearchKnowledgeResult>;

  runCapability?(
    capabilityName: string,
    input: OpenClawJsonObject,
    projectRefs?: string[],
    options?: GenerateContentOptions,
    providerConfig?: ProviderConfig,
  ): Promise<GenerateContentResult>;
}
