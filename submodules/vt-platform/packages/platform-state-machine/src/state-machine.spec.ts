import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  STATE_MACHINE_ERROR_MESSAGES,
  assertTransition,
  canTransition,
  transitionValue,
} from './state-machine';
import type { StateMachineConfig, TransitionTable } from './state-machine.types';

type DemoState = 'NEW' | 'PAID' | 'CANCELLED';

const transitions: TransitionTable<DemoState> = {
  NEW: ['PAID', 'CANCELLED'],
  PAID: [],
  CANCELLED: [],
};

const config: StateMachineConfig<DemoState> = { transitions };

describe('platform-state-machine', () => {
  it('allows configured transitions', () => {
    assert.equal(canTransition(transitions, 'NEW', 'PAID'), true);
    assert.equal(transitionValue(config, 'NEW', 'PAID'), 'PAID');
  });

  it('rejects invalid transitions with context', () => {
    assert.equal(canTransition(transitions, 'PAID', 'CANCELLED'), false);
    assert.throws(
      () => assertTransition(config, 'PAID', 'CANCELLED'),
      { message: STATE_MACHINE_ERROR_MESSAGES.INVALID_TRANSITION({ from: 'PAID', to: 'CANCELLED' }) },
    );
  });
});
