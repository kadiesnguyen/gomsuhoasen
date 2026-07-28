/**
 * @vt/platform-healthcheck — Probe framework for liveness/readiness checks.
 *
 * Two presets:
 * - PublicHealthController: public /health — Docker/K8s liveness
 * - AdminHealthController: guarded /admin/health — ops metrics
 */

export const HEALTH_STATUSES = {
  OK: 'ok',
  DEGRADED: 'degraded',
  DOWN: 'down',
} as const;

export const HEALTH_PROBE_DEFAULT_DETAILS = {
  THREW: 'probe threw',
} as const;

export type HealthStatus = typeof HEALTH_STATUSES[keyof typeof HEALTH_STATUSES];

export interface ProbeResult {
  name: string;
  status: HealthStatus;
  latencyMs?: number;
  detail?: Record<string, unknown>;
}

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  probes: ProbeResult[];
}

/**
 * A health probe checks one infrastructure concern.
 * Implement this interface for custom probes (Redis, external API, etc).
 */
export interface IHealthProbe {
  readonly name: string;
  check(): Promise<ProbeResult>;
}

export const HEALTH_PROBES = Symbol('HEALTH_PROBES');
