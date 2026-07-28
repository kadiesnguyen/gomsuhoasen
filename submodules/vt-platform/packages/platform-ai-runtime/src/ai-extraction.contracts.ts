export enum AiExtractionStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export const AI_EXTRACTION_STATUS_VALUES = Object.values(
  AiExtractionStatus,
) as AiExtractionStatus[];
