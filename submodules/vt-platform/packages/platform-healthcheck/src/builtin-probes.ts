import { Connection } from 'mongoose';
import { HEALTH_STATUSES, type IHealthProbe, type ProbeResult } from './health-probe.types';

/**
 * Built-in probe: MongoDB connection readiness.
 */
export class MongoHealthProbe implements IHealthProbe {
  readonly name = 'mongodb';

  constructor(private readonly connection: Connection) {}

  async check(): Promise<ProbeResult> {
    const start = Date.now();
    const state = this.connection.readyState;
    const latencyMs = Date.now() - start;

    const statusMap: Record<number, ProbeResult['status']> = {
      0: HEALTH_STATUSES.DOWN,       // disconnected
      1: HEALTH_STATUSES.OK,         // connected
      2: HEALTH_STATUSES.DEGRADED,   // connecting
      3: HEALTH_STATUSES.DOWN,       // disconnecting
    };

    return {
      name: this.name,
      status: statusMap[state] ?? HEALTH_STATUSES.DOWN,
      latencyMs,
      detail: {
        readyState: state,
        host: this.connection.host,
        dbName: this.connection.name,
      },
    };
  }
}

/**
 * Built-in probe: process uptime + memory.
 */
export class ProcessHealthProbe implements IHealthProbe {
  readonly name = 'process';

  async check(): Promise<ProbeResult> {
    const mem = process.memoryUsage();
    return {
      name: this.name,
      status: HEALTH_STATUSES.OK,
      detail: {
        uptimeSeconds: Math.floor(process.uptime()),
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        rssMB: Math.round(mem.rss / 1024 / 1024),
      },
    };
  }
}
