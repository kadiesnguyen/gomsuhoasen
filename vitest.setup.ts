import { vi } from 'vitest';

(globalThis as typeof globalThis & { jest: typeof vi }).jest = vi;

process.env.GHS_APPLICATION_SCOPE_ID ??= 'gomhoasen';
