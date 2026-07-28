import { DomainBadRequestException } from '@vt/platform-error';
import { assertTransition, type TransitionTable } from '@vt/platform-state-machine';
import { RFQ_ERRORS } from './rfq.constants';
import { RfqStatus } from '../schemas/rfq.schema';

export const RFQ_TRANSITIONS: TransitionTable<RfqStatus> = {
  [RfqStatus.NEW]: [RfqStatus.CONTACTED, RfqStatus.QUOTED, RfqStatus.CLOSED],
  [RfqStatus.CONTACTED]: [RfqStatus.QUOTED, RfqStatus.CLOSED],
  [RfqStatus.QUOTED]: [RfqStatus.CLOSED],
  [RfqStatus.CLOSED]: [],
};

export function assertRfqTransition(from: RfqStatus, to: RfqStatus): void {
  if (from === to) return;
  assertTransition(
    {
      transitions: RFQ_TRANSITIONS,
      createError: ({ from: current, to: target, allowed }) => new DomainBadRequestException(
        RFQ_ERRORS.RFQ_INVALID_STATUS_TRANSITION,
        `Không thể chuyển trạng thái từ ${current} sang ${target}`,
        { current, target, allowed },
      ),
    },
    from,
    to,
  );
}
