export interface SequentialReorderStep<TId extends string = string> {
  id: TId;
  position: number;
  baseVersion: number;
  nextVersion: number;
}

export interface SequentialReorderPlan<TId extends string = string> {
  baseVersion: number;
  nextVersion: number;
  steps: SequentialReorderStep<TId>[];
}

export interface SequentialReorderValidation {
  valid: boolean;
  duplicateIds: string[];
  invalidBaseVersion: boolean;
}

export const SEQUENTIAL_REORDER_MESSAGES = {
  INVALID_INPUT: 'INVALID_SEQUENTIAL_REORDER_INPUT',
} as const;

export function validateSequentialReorderInput(
  orderedIds: readonly string[],
  baseVersion: number,
): SequentialReorderValidation {
  const seen = new Set<string>();
  const duplicateIds = new Set<string>();

  for (const id of orderedIds) {
    if (seen.has(id)) {
      duplicateIds.add(id);
    }
    seen.add(id);
  }

  const invalidBaseVersion = !Number.isInteger(baseVersion) || baseVersion < 0;

  return {
    valid: duplicateIds.size === 0 && !invalidBaseVersion,
    duplicateIds: Array.from(duplicateIds),
    invalidBaseVersion,
  };
}

export function createSequentialReorderPlan<TId extends string>(
  orderedIds: readonly TId[],
  baseVersion: number,
): SequentialReorderPlan<TId> {
  const validation = validateSequentialReorderInput(orderedIds, baseVersion);
  if (!validation.valid) {
    throw new Error(SEQUENTIAL_REORDER_MESSAGES.INVALID_INPUT);
  }

  const nextVersion = baseVersion + 1;
  return {
    baseVersion,
    nextVersion,
    steps: orderedIds.map((id, position) => ({
      id,
      position,
      baseVersion,
      nextVersion,
    })),
  };
}
