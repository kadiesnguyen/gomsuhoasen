export {
  ContractResponseError,
  expectApiArray as expectList,
  expectApiObject as expectPayload,
  expectApiPaginated as expectPaginated,
  readApiEntityId,
  unwrapApiData,
} from '@gomhoasen/contracts';

/**
 * Read canonical id from a value that might be a string or an object with .id / ._id
 */
export function readId(x: string | { id?: string; _id?: string } | null | undefined): string | undefined {
  return readApiEntityId(x, { allowMongoIdAlias: true });
}
