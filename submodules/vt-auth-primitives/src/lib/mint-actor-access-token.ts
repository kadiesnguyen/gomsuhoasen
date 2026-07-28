import { randomUUID } from 'node:crypto';
import type { JwtService } from '@nestjs/jwt';
import type { ActorTokenPayload, MintActorAccessTokenOptions } from './token-types';

export function mintActorAccessToken(
  jwtService: JwtService,
  options: MintActorAccessTokenOptions,
): string {
  const payload = createActorTokenPayload({
    subjectId: options.subjectId,
    type: options.type,
    claims: options.claims,
    includeJti: options.includeJti,
  });

  return jwtService.sign(payload, options.expiresIn ? { expiresIn: options.expiresIn } : undefined);
}

export function createActorTokenPayload(options: Omit<MintActorAccessTokenOptions, 'expiresIn'>): ActorTokenPayload {
  const payload: ActorTokenPayload = {
    ...(options.claims ?? {}),
    sub: options.subjectId,
    type: options.type,
  };

  if (options.includeJti) {
    payload.jti = randomUUID();
  }

  return payload;
}
