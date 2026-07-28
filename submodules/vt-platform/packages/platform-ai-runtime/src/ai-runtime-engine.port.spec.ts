import type { AiRuntimeEnginePort } from './ai-runtime-engine.port';
import { OpenClawRuntimeClient } from './openclaw-runtime';

describe('AiRuntimeEnginePort', () => {
  it('accepts OpenClawRuntimeClient as a concrete engine implementation', () => {
    const engine: AiRuntimeEnginePort = new OpenClawRuntimeClient({
      baseUrl: 'http://openclaw.local',
      fetchImpl: vi.fn() as never,
      createHttpError: ({ capabilityName, errorKey }) => new Error(`${capabilityName}:${errorKey}`),
      createTransportError: ({ capabilityName, transportErrorKey }) =>
        new Error(`${capabilityName}:${transportErrorKey}`),
    });

    expect(typeof engine.generateMarketingContent).toBe('function');
    expect(typeof engine.generateGenericContent).toBe('function');
    expect(typeof engine.generateChatResponse).toBe('function');
    expect(typeof engine.searchKnowledge).toBe('function');
    expect(typeof engine.runCapability).toBe('function');
  });
});
