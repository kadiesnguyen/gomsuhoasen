import type { JwtService } from '@nestjs/jwt';

type JwtSignOptions = NonNullable<Parameters<JwtService['sign']>[1]>;

export type JwtExpiresIn = JwtSignOptions['expiresIn'];

export type TokenClaimValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[]
  | boolean[];

export type TokenClaims = {
  [claimName: string]: TokenClaimValue | undefined;
};

export type ActorTokenPayload = TokenClaims & {
  sub: string;
  type: string;
  jti?: string;
};

export interface MintActorAccessTokenOptions {
  subjectId: string;
  type: string;
  claims?: TokenClaims;
  expiresIn?: JwtExpiresIn;
  includeJti?: boolean;
}

export interface MintActorTokenPairOptions {
  subjectId: string;
  accessType: string;
  refreshType: string;
  accessClaims?: TokenClaims;
  accessExpiresIn?: JwtExpiresIn;
  refreshExpiresIn?: JwtExpiresIn;
  includeJti?: boolean;
}

export interface MintActorTokenPairResult {
  accessToken: string;
  refreshToken: string;
}
