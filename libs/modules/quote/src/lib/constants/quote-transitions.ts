import { DomainBadRequestException } from '@vt/platform-error';
import { assertTransition, type TransitionTable } from '@vt/platform-state-machine';
import { QUOTE_ERRORS } from './quote.constants';
import { QuoteStatus } from '../schemas/quote.schema';

export const QUOTE_TRANSITIONS: TransitionTable<QuoteStatus> = {
  [QuoteStatus.DRAFT]: [QuoteStatus.SENT],
  [QuoteStatus.SENT]: [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED],
  [QuoteStatus.ACCEPTED]: [],
  [QuoteStatus.REJECTED]: [],
  [QuoteStatus.EXPIRED]: [],
};

export function assertQuoteTransition(from: QuoteStatus, to: QuoteStatus): void {
  if (from === to) return;
  assertTransition(
    {
      transitions: QUOTE_TRANSITIONS,
      createError: ({ from: current, to: target, allowed }) => new DomainBadRequestException(
        QUOTE_ERRORS.QUOTE_INVALID_STATUS_TRANSITION,
        `Không thể chuyển trạng thái báo giá từ ${current} sang ${target}`,
        { current, target, allowed },
      ),
    },
    from,
    to,
  );
}
