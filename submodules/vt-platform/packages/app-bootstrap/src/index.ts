/**
 * @vt/app-bootstrap — Shared NestJS application bootstrap helpers.
 *
 * Provides factory functions to create the common infrastructure modules
 * that every VT project needs:
 *
 * - ConfigModule (global env)
 * - MongooseModule with softDelete + normalize plugins
 * - EventEmitterModule
 * - PlatformEventsModule
 * - HealthCheckModule
 *
 * Consumer projects import these helpers instead of repeating the same
 * module setup in every AppModule.
 *
 * @example
 * ```ts
 * import { createPlatformImports, createMongooseRootModule } from '.';
 *
 * @Module({
 *   imports: [
 *     ...createPlatformImports(),
 *     IamModule,
 *     // ... domain modules
 *   ],
 * })
 * export class AppModule {}
 * ```
 */

export { createPlatformImports, type PlatformImportsOptions } from './lib/platform-imports';
export { createMongooseRootModule, type MongooseRootModuleOptions } from './lib/mongoose-root';
export { createOutboxLifecycle, type OutboxLifecycleHooks, OutboxBootstrapMixin } from './lib/outbox-lifecycle';
