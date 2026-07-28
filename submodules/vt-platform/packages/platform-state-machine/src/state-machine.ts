import type {
  StateMachineConfig,
  StateMachineErrorContext,
  TransitionTable,
} from './state-machine.types';

export const STATE_MACHINE_ERROR_MESSAGES = {
  INVALID_TRANSITION: <S extends string>(context: Pick<StateMachineErrorContext<S>, 'from' | 'to'>) =>
    `Invalid state transition: ${context.from} -> ${context.to}`,
} as const;

function defaultError<S extends string>(context: StateMachineErrorContext<S>): Error {
  return new Error(STATE_MACHINE_ERROR_MESSAGES.INVALID_TRANSITION(context));
}

export function canTransition<S extends string>(
  transitions: TransitionTable<S>,
  from: S,
  to: S,
): boolean {
  return transitions[from]?.includes(to) ?? false;
}

export function assertTransition<S extends string>(
  config: StateMachineConfig<S>,
  from: S,
  to: S,
): void {
  const allowed = config.transitions[from] ?? [];
  if (allowed.includes(to)) return;
  throw (config.createError ?? defaultError)({ from, to, allowed });
}

export function transitionValue<S extends string>(
  config: StateMachineConfig<S>,
  from: S,
  to: S,
): S {
  assertTransition(config, from, to);
  return to;
}

export function transitionEntity<S extends string, T extends { status: S }>(
  config: StateMachineConfig<S>,
  entity: T,
  to: S,
): T {
  entity.status = transitionValue(config, entity.status, to);
  return entity;
}
