/**
 * Browser-safe barrel for @vt/platform-api-contract.
 *
 * Re-exports only modules that have ZERO @nestjs/common dependency.
 * Excluded: api-exception.filter, response-envelope.interceptor,
 *           standard-http-error-payload (all require @nestjs/common).
 */
export * from './api-entity-id';
export * from './api-error-classification';
export * from './api-url';
export * from './record';
export * from './types';
export * from './unwrap-api-response';
export * from './domain-tokens';
export * from './enums';
export * from './client-composition';
export * from './api-surface-paths';
