/**
 * Platform imports factory.
 *
 * Returns the standard set of NestJS modules that every VT project needs.
 * This replaces the repeated import blocks in every AppModule across projects.
 *
 * Common pattern across all 3 projects:
 * 1. ConfigModule.forRoot({ isGlobal: true })
 * 2. EventEmitterModule.forRoot()
 * 3. MongooseModule.forRootAsync(...) with plugins
 * 4. PlatformEventsModule
 * 5. HealthCheckModule.register()
 *
 * @example
 * ```ts
 * @Module({
 *   imports: [
 *     ...createPlatformImports(),
 *     IamModule,
 *     EcommerceModule,
 *   ],
 * })
 * export class AppModule implements OnModuleInit {
 *   constructor(private readonly outboxPoller: OutboxPollerService) {}
 *   onModuleInit() { this.outboxPoller.start(); }
 * }
 * ```
 */

import { DynamicModule, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PlatformEventsModule } from '@vt/platform-events';
import { HealthCheckModule } from '@vt/platform-healthcheck';
import { createMongooseRootModule, type MongooseRootModuleOptions } from './mongoose-root';

export interface PlatformImportsOptions {
  /** Options for the Mongoose root module. */
  mongoose?: MongooseRootModuleOptions;

  /** Path(s) to .env files. Default: ['.env']. */
  envFilePath?: string | string[];

  /** EventEmitter config. */
  eventEmitter?: {
    wildcard?: boolean;
    delimiter?: string;
    maxListeners?: number;
  };

  /** Skip health check module registration. Default: false. */
  skipHealthCheck?: boolean;

  /** Skip events/outbox module. Default: false. */
  skipEvents?: boolean;
}

 
export function createPlatformImports(
  options: PlatformImportsOptions = {},
): any[] {
  const {
    mongoose,
    envFilePath = ['.env'],
    eventEmitter = {},
    skipHealthCheck = false,
    skipEvents = false,
  } = options;

  const imports: unknown[] = [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
    }),
    EventEmitterModule.forRoot({
      wildcard: eventEmitter.wildcard ?? false,
      delimiter: eventEmitter.delimiter ?? '.',
      maxListeners: eventEmitter.maxListeners ?? 20,
    }),
    createMongooseRootModule(mongoose),
  ];

  if (!skipEvents) {
    imports.push(PlatformEventsModule);
  }

  if (!skipHealthCheck) {
    imports.push(HealthCheckModule.register());
  }

  return imports;
}
