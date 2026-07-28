import { DomainForbiddenException } from '@vt/platform-error';

export const OWNER_SCOPE_ERROR_CODES = {
  FORBIDDEN: 'AUTH_SCOPE_OWNER_FORBIDDEN',
} as const;

export const OWNER_SCOPE_DEFAULT_MESSAGES = {
  FORBIDDEN: 'Actor is not allowed to access this resource',
} as const;

export function assertOwnerScope(
  actorId: string | undefined,
  ownerId: string | undefined,
  options: {
    alsoAllow?: Array<string | undefined>;
    message?: string;
  } = {},
): void {
  const allowedIds = [ownerId, ...(options.alsoAllow ?? [])].filter(
    (value): value is string => Boolean(value),
  );
  if (actorId && allowedIds.includes(actorId)) return;
  throw new DomainForbiddenException(
    OWNER_SCOPE_ERROR_CODES.FORBIDDEN,
    options.message ?? OWNER_SCOPE_DEFAULT_MESSAGES.FORBIDDEN,
    { actorId, ownerId },
  );
}
