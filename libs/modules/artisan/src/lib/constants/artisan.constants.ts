/**
 * Artisan Error Constants
 *
 * Zalo ref: libs/catalog/src/lib/constants/catalog.constants.ts
 * Pattern: centralized error codes used in ConflictException/NotFoundException
 */
export const ARTISAN_ERRORS = {
  ART_NOT_FOUND: 'ART_NOT_FOUND',
  ART_SLUG_DUPLICATE: 'ART_SLUG_DUPLICATE',
  ART_SLUG_IMMUTABLE: 'ART_SLUG_IMMUTABLE',
  ART_IN_USE: 'ART_IN_USE',
} as const;
