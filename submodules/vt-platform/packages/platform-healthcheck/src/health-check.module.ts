import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { HealthCheckService } from './health-check.service';
import { MongoHealthProbe, ProcessHealthProbe } from './builtin-probes';
import type { IHealthProbe } from './health-probe.types';
import { HEALTH_PROBES } from './health-probe.types';

export interface HealthCheckModuleOptions {
  /**
   * Include built-in probes: mongodb, process.
   * Default: true.
   */
  includeBuiltins?: boolean;

  /**
   * Additional custom probes (e.g. RedisHealthProbe, OutboxHealthProbe).
   */
  customProbes?: Type<IHealthProbe>[];
}

/**
 * Dynamic NestJS module for health checking.
 *
 * Usage:
 * ```ts
 * // Minimal — includes mongo + process probes
 * HealthCheckModule.register()
 *
 * // With custom probes
 * HealthCheckModule.register({
 *   customProbes: [RedisHealthProbe],
 * })
 *
 * // Without built-ins (custom only)
 * HealthCheckModule.register({
 *   includeBuiltins: false,
 *   customProbes: [CustomProbe],
 * })
 * ```
 */
@Module({})
export class HealthCheckModule {
  static register(options: HealthCheckModuleOptions = {}): DynamicModule {
    const { includeBuiltins = true, customProbes = [] } = options;

    const probeProviders: Provider[] = [];

    if (includeBuiltins) {
      probeProviders.push({
        provide: MongoHealthProbe,
        useFactory: (conn: Connection) => new MongoHealthProbe(conn),
        inject: [getConnectionToken()],
      });
      probeProviders.push(ProcessHealthProbe);
    }

    probeProviders.push(...customProbes);

    const allProbeClasses = [
      ...(includeBuiltins ? [MongoHealthProbe, ProcessHealthProbe] : []),
      ...customProbes,
    ];

    const aggregateProvider: Provider = {
      provide: HEALTH_PROBES,
      useFactory: (...probes: IHealthProbe[]) => probes,
      inject: allProbeClasses,
    };

    return {
      module: HealthCheckModule,
      providers: [...probeProviders, aggregateProvider, HealthCheckService],
      exports: [HealthCheckService],
    };
  }
}
