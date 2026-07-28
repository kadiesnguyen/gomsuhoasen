/**
 * Outbox lifecycle helpers.
 *
 * Every VT project starts the OutboxPollerService in OnModuleInit.
 * This helper provides a standard mixin/hooks pattern.
 *
 * Extracted from the identical pattern across all 3 projects:
 * ```ts
 * export class AppModule implements OnModuleInit {
 *   constructor(private readonly outboxPoller: OutboxPollerService) {}
 *   onModuleInit() { this.outboxPoller.start(); }
 * }
 * ```
 */

import type { OnModuleInit } from '@nestjs/common';
import type { OutboxPollerService } from '@vt/platform-events';

export interface OutboxLifecycleHooks {
  /** Call in OnModuleInit to start the outbox poller. */
  startOutboxPoller(): void;
}

/**
 * Create outbox lifecycle hooks for an AppModule.
 *
 * @example
 * ```ts
 * const lifecycle = createOutboxLifecycle(outboxPollerService);
 * lifecycle.startOutboxPoller(); // in onModuleInit
 * ```
 */
export function createOutboxLifecycle(
  outboxPoller: OutboxPollerService,
): OutboxLifecycleHooks {
  return {
    startOutboxPoller(): void {
      outboxPoller.start();
    },
  };
}

/**
 * Mixin: Apply OnModuleInit behavior to start the outbox poller.
 *
 * Usage: Extend your AppModule with this to get automatic outbox start.
 *
 * @example
 * ```ts
 * @Module({ imports: [...createPlatformImports(), ...] })
 * export class AppModule extends OutboxBootstrapMixin {
 *   constructor(outboxPoller: OutboxPollerService) { super(outboxPoller); }
 * }
 * ```
 */
export abstract class OutboxBootstrapMixin implements OnModuleInit {
  constructor(protected readonly outboxPoller: OutboxPollerService) {}

  onModuleInit(): void {
    this.outboxPoller.start();
  }
}
