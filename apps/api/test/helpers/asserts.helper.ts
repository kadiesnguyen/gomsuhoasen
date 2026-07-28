import { Response } from 'supertest';
import { expectApiArray, expectApiObject, expectApiPaginated } from '@gomhoasen/contracts';
import { PaginatedPayload } from '@gomhoasen/contracts';

export function expectStatus(response: Response, status: number): void {
  if (response.status !== status) {
    console.error('API Response Status mismatch details:', {
      expected: status,
      received: response.status,
      body: response.body,
      text: response.text,
    });
  }
  expect(response.status).toBe(status);
}

export function expectSuccessObject<T>(response: Response, source: string, status = 200): T {
  expectStatus(response, status);
  expect(response.body?.success).toBe(true);
  return expectApiObject<T>(response.body, source);
}

export function expectSuccessArray<T>(response: Response, source: string, status = 200): T[] {
  expectStatus(response, status);
  expect(response.body?.success).toBe(true);
  return expectApiArray<T>(response.body, source);
}

export function expectSuccessPaginated<T>(response: Response, source: string, status = 200): PaginatedPayload<T> {
  expectStatus(response, status);
  expect(response.body?.success).toBe(true);
  return expectApiPaginated<T>(response.body, source);
}

export function expectErrorCode(response: Response, status: number, code: string): void {
  expectStatus(response, status);
  expect(response.body?.success).toBe(false);
  expect(response.body?.error?.code).toBe(code);
}
