import {
  composeOpenClawProjectRef,
  parseOpenClawProjectRef,
} from './openclaw-project-ref';

describe('OpenClaw project ref helpers', () => {
  it('composes the canonical project ref format', () => {
    expect(composeOpenClawProjectRef('kb-1', 'build-2')).toBe('kb-1__build-2');
  });

  it('parses the canonical project ref format', () => {
    expect(parseOpenClawProjectRef(' kb-1 __ build-2 ')).toEqual({
      kbId: 'kb-1',
      indexBuildId: 'build-2',
    });
  });

  it('rejects malformed project refs', () => {
    expect(parseOpenClawProjectRef('missing-separator')).toBeNull();
    expect(parseOpenClawProjectRef('kb__')).toBeNull();
    expect(parseOpenClawProjectRef('__build')).toBeNull();
    expect(parseOpenClawProjectRef('a__b__c')).toBeNull();
  });
});
