import { Inject, Injectable, Optional } from '@nestjs/common';
import type { IHealthProbe, HealthCheckResult, HealthStatus } from './health-probe.types';
import { HEALTH_PROBES, HEALTH_PROBE_DEFAULT_DETAILS, HEALTH_STATUSES } from './health-probe.types';

/**
 * Aggregates all registered probes and returns a unified health result.
 *
 * Usage:
 * ```ts
 * @Controller('health')
 * export class HealthController {
 *   constructor(private readonly health: HealthCheckService) {}
 *
 *   @Get() check() { return this.health.check(); }
 * }
 * ```
 */
@Injectable()
export class HealthCheckService {
  constructor(
    @Optional()
    @Inject(HEALTH_PROBES)
    private readonly probes: IHealthProbe[] = [],
  ) {}

  async check(): Promise<HealthCheckResult> {
    const probeResults = await Promise.all(
      this.probes.map(async (probe) => {
        try {
          return await probe.check();
        } catch {
          return {
            name: probe.name,
            status: HEALTH_STATUSES.DOWN,
            detail: { error: HEALTH_PROBE_DEFAULT_DETAILS.THREW },
          };
        }
      }),
    );

    const overallStatus: HealthStatus = probeResults.some((p) => p.status === HEALTH_STATUSES.DOWN)
      ? HEALTH_STATUSES.DOWN
      : probeResults.some((p) => p.status === HEALTH_STATUSES.DEGRADED)
        ? HEALTH_STATUSES.DEGRADED
        : HEALTH_STATUSES.OK;

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      probes: probeResults,
    };
  }
}
