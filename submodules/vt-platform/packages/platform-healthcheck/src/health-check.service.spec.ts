import { HealthCheckService } from './health-check.service';
import { ProcessHealthProbe } from './builtin-probes';
import {
  HEALTH_PROBE_DEFAULT_DETAILS,
  HEALTH_STATUSES,
  type IHealthProbe,
  type ProbeResult,
} from './health-probe.types';

describe('HealthCheckService', () => {
  it('returns ok when all probes pass', async () => {
    const probes: IHealthProbe[] = [new ProcessHealthProbe()];
    const service = new HealthCheckService(probes);

    const result = await service.check();
    expect(result.status).toBe(HEALTH_STATUSES.OK);
    expect(result.probes).toHaveLength(1);
    expect(result.probes[0].name).toBe('process');
    expect(result.timestamp).toBeDefined();
  });

  it('returns degraded when any probe is degraded', async () => {
    const degradedProbe: IHealthProbe = {
      name: 'test-degraded',
      check: async (): Promise<ProbeResult> => ({ name: 'test-degraded', status: HEALTH_STATUSES.DEGRADED }),
    };
    const service = new HealthCheckService([new ProcessHealthProbe(), degradedProbe]);

    const result = await service.check();
    expect(result.status).toBe(HEALTH_STATUSES.DEGRADED);
  });

  it('returns down when any probe is down', async () => {
    const downProbe: IHealthProbe = {
      name: 'test-down',
      check: async (): Promise<ProbeResult> => ({ name: 'test-down', status: HEALTH_STATUSES.DOWN }),
    };
    const service = new HealthCheckService([new ProcessHealthProbe(), downProbe]);

    const result = await service.check();
    expect(result.status).toBe(HEALTH_STATUSES.DOWN);
  });

  it('handles probe exceptions gracefully', async () => {
    const throwingProbe: IHealthProbe = {
      name: 'test-throw',
      check: async () => { throw new Error('probe crash'); },
    };
    const service = new HealthCheckService([throwingProbe]);

    const result = await service.check();
    expect(result.status).toBe(HEALTH_STATUSES.DOWN);
    expect(result.probes[0].status).toBe(HEALTH_STATUSES.DOWN);
    expect(result.probes[0].detail).toEqual({ error: HEALTH_PROBE_DEFAULT_DETAILS.THREW });
  });

  it('returns ok with empty probes', async () => {
    const service = new HealthCheckService([]);
    const result = await service.check();
    expect(result.status).toBe(HEALTH_STATUSES.OK);
    expect(result.probes).toHaveLength(0);
  });
});
