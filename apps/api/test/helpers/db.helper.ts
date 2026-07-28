export const E2E_MONGODB_URI = process.env.E2E_MONGODB_URI || process.env.MONGODB_URI || '';

export const describeIfE2eMongo = E2E_MONGODB_URI ? describe : describe.skip;

export function resolveE2eMongoUri(suffix: string): string {
  if (!E2E_MONGODB_URI) {
    return `mongodb://127.0.0.1:27017/gom_hoa_sen_api_e2e_${suffix}`;
  }
  const base = E2E_MONGODB_URI.replace(/\/[^/?]+(?=($|[?]))/, `/gom_hoa_sen_api_e2e_${suffix}`);
  return base;
}
