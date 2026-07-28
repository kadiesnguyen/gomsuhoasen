/**
 * Mongoose root module factory.
 *
 * Provides the shared MongooseModule.forRootAsync configuration
 * with softDelete + normalize plugins pre-registered.
 *
 * Extracted from the common pattern across:
 * - vita:      MongoConfigService (47 LOC)
 * - 3d_vitual: Inline factory in AppModule (15 LOC)
 * - v2:        Separate mongo-config in core module
 *
 * @example
 * ```ts
 * @Module({
 *   imports: [createMongooseRootModule()],
 * })
 * export class AppModule {}
 * ```
 */

import { DynamicModule, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { requireMongodbUri } from '@vt/platform-config';
import { softDeletePlugin, normalizePlugin } from '@vt/platform-mongoose';

const logger = new Logger('MongooseRoot');

export interface MongooseRootModuleOptions {
  /**
   * Explicit MongoDB URI. If not provided, reads from MONGO_URI / MONGODB_URI
   * env vars via @vt/platform-config `requireMongodbUri()`.
   */
  uri?: string;

  /** Whether to build indexes on startup. Default: true. */
  autoIndex?: boolean;

  /** Additional Mongoose plugins to register globally. */
  extraPlugins?: ((schema: unknown) => void)[];

  /** Whether to log the connection URI (redacted). Default: true. */
  logConnection?: boolean;
}

export function createMongooseRootModule(
  options: MongooseRootModuleOptions = {},
): DynamicModule {
  const {
    uri,
    autoIndex = true,
    extraPlugins = [],
    logConnection = true,
  } = options;

  return MongooseModule.forRootAsync({
    imports: [ConfigModule],
    useFactory: () => {
      const resolvedUri = uri ?? requireMongodbUri();
      if (logConnection) {
        logger.log(`Connecting to MongoDB: ${resolvedUri.replace(/\/\/.*@/, '//<redacted>@')}`);
      }
      return {
        uri: resolvedUri,
        autoIndex,
        connectionFactory: (connection: Connection) => {
          connection.plugin(softDeletePlugin);
          connection.plugin(normalizePlugin);
          for (const plugin of extraPlugins) {
            connection.plugin(plugin);
          }
          logger.log('Registered global Mongoose plugins: softDelete, normalize' +
            (extraPlugins.length > 0 ? ` + ${extraPlugins.length} extra` : ''));
          return connection;
        },
      };
    },
  });
}
