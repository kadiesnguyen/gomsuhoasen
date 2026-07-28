import { createRequire } from 'node:module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { GHS_API, type UserRole } from '@gomhoasen/contracts';
import { E2E_ADMIN_FIXTURE } from '../../src/seed/e2e-fixtures';
import { expectSuccessObject } from './asserts.helper';

const require = createRequire(import.meta.url);
const request = require('supertest') as typeof import('supertest');

export interface AuthUserPayload {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface LoginPayload {
  accessToken: string;
  user: AuthUserPayload;
}

export const E2E_ADMIN = {
  email: E2E_ADMIN_FIXTURE.email,
  password: E2E_ADMIN_FIXTURE.password,
} as const;

export async function loginAsE2eAdmin(app: NestExpressApplication): Promise<LoginPayload> {
  const response = await request(app.getHttpServer())
    .post(GHS_API.AUTH.LOGIN)
    .send(E2E_ADMIN);

  return expectSuccessObject<LoginPayload>(response, 'E2E admin login', 201);
}

export function bearer(token: string): string {
  return `Bearer ${token}`;
}
