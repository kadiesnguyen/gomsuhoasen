import { mintActorAccessToken } from './mint-actor-access-token';
import type { JwtService } from '@nestjs/jwt';
import type { MintActorTokenPairOptions, MintActorTokenPairResult } from './token-types';

export function mintActorTokenPair(
  jwtService: JwtService,
  options: MintActorTokenPairOptions,
): MintActorTokenPairResult {
  const accessToken = mintActorAccessToken(jwtService, {
    subjectId: options.subjectId,
    type: options.accessType,
    claims: options.accessClaims,
    expiresIn: options.accessExpiresIn ?? '15m',
    includeJti: options.includeJti,
  });

  const refreshToken = mintActorAccessToken(jwtService, {
    subjectId: options.subjectId,
    type: options.refreshType,
    expiresIn: options.refreshExpiresIn ?? '7d',
    includeJti: options.includeJti,
  });

  return { accessToken, refreshToken };
}
