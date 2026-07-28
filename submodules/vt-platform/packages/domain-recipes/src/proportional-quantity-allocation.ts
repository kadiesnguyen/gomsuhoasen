import {
  requireNonNegativeFiniteNumber,
  requirePositiveInteger as requirePositiveIntegerNumber,
} from './number-guards';

export interface ProportionalQuantityAllocationLine<TPayload> {
  payload: TPayload;
  quantity: unknown;
  tieBreaker: string;
}

export interface ProportionalQuantityAllocationResult<TPayload> {
  payload: TPayload;
  quantity: number;
}

export class ProportionalQuantityAllocationInputError extends Error {
  constructor(
    public readonly fieldName: string,
    message = `Invalid proportional quantity allocation field: ${fieldName}`,
  ) {
    super(message);
    this.name = 'ProportionalQuantityAllocationInputError';
  }
}

const proportionalQuantityNumberGuardOptions = {
  createError: (fieldName: string) => new ProportionalQuantityAllocationInputError(fieldName),
};

function requireTieBreaker(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ProportionalQuantityAllocationInputError(fieldName);
  }
  return value;
}

function calculateNonNegativeRemainder(
  targetTotalQuantity: number,
  baseAllocatedQuantity: number,
): number {
  const remainingQuantity = targetTotalQuantity - baseAllocatedQuantity;
  if (remainingQuantity < 0) {
    throw new ProportionalQuantityAllocationInputError('baseAllocatedQuantity');
  }
  return remainingQuantity;
}

export function allocateProportionalQuantities<TPayload>(
  input: {
    lines: Array<ProportionalQuantityAllocationLine<TPayload>>;
    ratio: unknown;
  },
): Array<ProportionalQuantityAllocationResult<TPayload>> {
  if (!Array.isArray(input.lines)) {
    throw new ProportionalQuantityAllocationInputError('lines');
  }

  const ratio = requireNonNegativeFiniteNumber(input.ratio, 'ratio', proportionalQuantityNumberGuardOptions);
  if (input.lines.length === 0 || ratio === 0) {
    return [];
  }

  const normalizedLines = input.lines.map((line, index) => ({
    payload: line.payload,
    quantity: requirePositiveIntegerNumber(
      line.quantity,
      `lines[${index}].quantity`,
      proportionalQuantityNumberGuardOptions,
    ),
    tieBreaker: requireTieBreaker(line.tieBreaker, `lines[${index}].tieBreaker`),
  }));

  if (ratio >= 1) {
    return normalizedLines.map((line) => ({
      payload: line.payload,
      quantity: line.quantity,
    }));
  }

  const totalCandidateQuantity = normalizedLines.reduce((sum, line) => sum + line.quantity, 0);
  const uncappedTargetTotalQuantity = Math.floor(totalCandidateQuantity * ratio);
  const targetTotalQuantity = uncappedTargetTotalQuantity > totalCandidateQuantity
    ? totalCandidateQuantity
    : uncappedTargetTotalQuantity;

  const allocated = normalizedLines.map((line) => {
    const exactQuantity = line.quantity * ratio;
    const baseQuantity = Math.floor(exactQuantity);
    return {
      ...line,
      baseQuantity,
      fractionalQuantity: exactQuantity - baseQuantity,
    };
  });

  let remainingQuantity = calculateNonNegativeRemainder(
    targetTotalQuantity,
    allocated.reduce((sum, line) => sum + line.baseQuantity, 0),
  );

  const remainderPriority = [...allocated].sort((a, b) => {
    if (b.fractionalQuantity !== a.fractionalQuantity) {
      return b.fractionalQuantity - a.fractionalQuantity;
    }
    return a.tieBreaker.localeCompare(b.tieBreaker);
  });

  for (const line of remainderPriority) {
    if (remainingQuantity === 0) {
      break;
    }
    if (line.baseQuantity >= line.quantity) {
      continue;
    }
    line.baseQuantity += 1;
    remainingQuantity -= 1;
  }

  if (remainingQuantity !== 0) {
    throw new ProportionalQuantityAllocationInputError('remainingQuantity');
  }

  return allocated
    .filter((line) => line.baseQuantity > 0)
    .map((line) => ({
      payload: line.payload,
      quantity: line.baseQuantity,
    }));
}
