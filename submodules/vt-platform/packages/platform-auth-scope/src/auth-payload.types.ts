export interface AuthPayload {
  sub: string;
  roles?: readonly string[];
  scopes?: readonly string[];
  [key: string]: unknown;
}

export interface AuthenticatedRequest<TPayload extends AuthPayload = AuthPayload> {
  auth?: TPayload;
  user?: TPayload;
}
