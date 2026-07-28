import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BUCKET_MAPPING_STATUSES,
  LEDGER_STATUSES,
  LEDGER_TYPES,
  type ILedgerRow,
  type IWallet,
  isBucketMappingStatus,
  isLedgerStatus,
  isLedgerType,
  readBucketMappingStatus,
  readLedgerStatus,
  readLedgerType,
} from './wallet.contracts';
import {
  WITHDRAWAL_CONTEXT_TYPES,
  WITHDRAWAL_INITIAL_STATUS,
  WITHDRAWAL_STATUSES,
  isWithdrawalContextType,
  isWithdrawalStatus,
  readWithdrawalContextType,
  readWithdrawalStatus,
} from './withdrawal.contracts';
import {
  TRANSACTION_TURN_STATUSES,
  TRANSACTION_TURN_TYPES,
  isTransactionTurnStatus,
  isTransactionTurnType,
  readTransactionTurnStatus,
  readTransactionTurnType,
} from './transaction-turn.contracts';

describe('balance-core: contracts structure verification', () => {
  it('should allow instantiating structures satisfying IWallet', () => {
    const wallet: IWallet = {
      wallet_id: 'w_123',
      available_points: 1000,
      pending_points: 200,
      locked_points: 0,
      point_buckets: [
        {
          bucket_id: 'b_1',
          label: 'Default',
          balance: 1000,
          usable: 1000,
          pending: 0,
          mapping_status: BUCKET_MAPPING_STATUSES.CONFIRMED,
        },
      ],
      last_updated_at: new Date(),
    };
    assert.equal(wallet.available_points, 1000);
    assert.equal(wallet.point_buckets[0].mapping_status, 'confirmed');
  });

  it('should allow instantiating structures satisfying ILedgerRow', () => {
    const row: ILedgerRow = {
      transaction_id: 'tx_999',
      member_id: 'member_123',
      type: LEDGER_TYPES.EARN,
      amount: 150,
      status: LEDGER_STATUSES.COMPLETED,
      source_type: 'order',
      source_id: 'order_555',
      source_label: 'Purchase reward',
      created_at: new Date(),
    };
    assert.equal(row.amount, 150);
    assert.equal(row.type, LEDGER_TYPES.EARN);
  });

  it('exposes stable ledger and bucket status readers', () => {
    assert.equal(readLedgerType('redeem'), LEDGER_TYPES.REDEEM);
    assert.equal(readLedgerType('unknown'), LEDGER_TYPES.EARN);
    assert.equal(readLedgerStatus('pending'), LEDGER_STATUSES.PENDING);
    assert.equal(readLedgerStatus('unknown'), LEDGER_STATUSES.COMPLETED);
    assert.equal(readBucketMappingStatus('updating'), BUCKET_MAPPING_STATUSES.UPDATING);
    assert.equal(readBucketMappingStatus('unknown-value'), BUCKET_MAPPING_STATUSES.CONFIRMED);
    assert.equal(isLedgerType(LEDGER_TYPES.WITHDRAWAL), true);
    assert.equal(isLedgerStatus(LEDGER_STATUSES.CANCELLED), true);
    assert.equal(isBucketMappingStatus(BUCKET_MAPPING_STATUSES.UNKNOWN), true);
  });

  it('exposes stable withdrawal status and context readers', () => {
    assert.equal(WITHDRAWAL_INITIAL_STATUS, WITHDRAWAL_STATUSES.PENDING);
    assert.equal(readWithdrawalStatus('approved'), WITHDRAWAL_STATUSES.APPROVED);
    assert.equal(readWithdrawalStatus('unknown'), WITHDRAWAL_STATUSES.PENDING);
    assert.equal(readWithdrawalContextType('store'), WITHDRAWAL_CONTEXT_TYPES.STORE);
    assert.equal(readWithdrawalContextType('unknown'), WITHDRAWAL_CONTEXT_TYPES.PERSONAL);
    assert.equal(isWithdrawalStatus(WITHDRAWAL_STATUSES.PAID), true);
    assert.equal(isWithdrawalContextType(WITHDRAWAL_CONTEXT_TYPES.PERSONAL), true);
  });

  it('exposes legacy transaction turn status and type readers', () => {
    assert.equal(readTransactionTurnType('ADMIN_DEDUCTION'), TRANSACTION_TURN_TYPES.ADMIN_DEDUCTION);
    assert.equal(readTransactionTurnType('unknown'), TRANSACTION_TURN_TYPES.ADMIN_ADDITION);
    assert.equal(readTransactionTurnStatus('COMPLETED'), TRANSACTION_TURN_STATUSES.COMPLETED);
    assert.equal(readTransactionTurnStatus('unknown'), TRANSACTION_TURN_STATUSES.PENDING);
    assert.equal(isTransactionTurnType(TRANSACTION_TURN_TYPES.WITHDRAWAL_REQUEST), true);
    assert.equal(isTransactionTurnStatus(TRANSACTION_TURN_STATUSES.ACCETED), true);
  });
});
