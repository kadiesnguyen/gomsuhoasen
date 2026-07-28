export interface OpenClawProjectRefParts {
  kbId: string;
  indexBuildId: string;
}

export function composeOpenClawProjectRef(kbId: string, indexBuildId: string): string {
  return `${kbId}__${indexBuildId}`;
}

export function parseOpenClawProjectRef(projectRef: string): OpenClawProjectRefParts | null {
  const parts = projectRef.split('__');
  if (parts.length !== 2) {
    return null;
  }

  const [kbId, indexBuildId] = parts.map((part) => part.trim());
  if (!kbId || !indexBuildId) {
    return null;
  }

  return { kbId, indexBuildId };
}
