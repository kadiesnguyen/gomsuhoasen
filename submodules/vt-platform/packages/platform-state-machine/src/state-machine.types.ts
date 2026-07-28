export type TransitionTable<S extends string> = Record<S, readonly S[]>;

export interface StateMachineErrorContext<S extends string> {
  from: S;
  to: S;
  allowed: readonly S[];
}

export type StateMachineErrorFactory<S extends string> = (
  context: StateMachineErrorContext<S>,
) => Error;

export interface StateMachineConfig<S extends string> {
  transitions: TransitionTable<S>;
  createError?: StateMachineErrorFactory<S>;
}
