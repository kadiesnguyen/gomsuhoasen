export const TENANT_FILTER_ERROR_REASONS = {
  TENANT_ID_REQUIRED: 'TENANT_ID_REQUIRED',
  ENTITY_ID_REQUIRED: 'ENTITY_ID_REQUIRED',
  FILE_TENANT_ID_REQUIRED: 'FILE_TENANT_ID_REQUIRED',
} as const;

export type TenantFilterErrorReason =
  typeof TENANT_FILTER_ERROR_REASONS[keyof typeof TENANT_FILTER_ERROR_REASONS];

export type TenantIdentifierParser<TIdentifier> = (
  value: unknown,
) => TIdentifier | undefined;

export type TenantFilterErrorFactory = (
  reason: TenantFilterErrorReason,
) => Error;

export interface TenantFilterHelperOptions<TIdentifier> {
  parseIdentifier: TenantIdentifierParser<TIdentifier>;
  createError: TenantFilterErrorFactory;
  activeFileStatuses?: readonly string[];
}

export function createTenantFilterHelpers<TIdentifier>({
  parseIdentifier,
  createError,
  activeFileStatuses = ['ACTIVE', 'ATTACHED'],
}: TenantFilterHelperOptions<TIdentifier>) {
  function requireIdentifier(
    value: unknown,
    reason: TenantFilterErrorReason,
  ): TIdentifier {
    const identifier = parseIdentifier(value);
    if (identifier === undefined) {
      throw createError(reason);
    }
    return identifier;
  }

  return {
    tenantFilter(tenantId: unknown): {
      tenantId: TIdentifier;
      isDeleted: false;
    } {
      return {
        tenantId: requireIdentifier(
          tenantId,
          TENANT_FILTER_ERROR_REASONS.TENANT_ID_REQUIRED,
        ),
        isDeleted: false,
      };
    },

    tenantFindById(tenantId: unknown, id: unknown): {
      _id: TIdentifier;
      tenantId: TIdentifier;
      isDeleted: false;
    } {
      const parsedTenantId = requireIdentifier(
        tenantId,
        TENANT_FILTER_ERROR_REASONS.TENANT_ID_REQUIRED,
      );
      const parsedEntityId = requireIdentifier(
        id,
        TENANT_FILTER_ERROR_REASONS.ENTITY_ID_REQUIRED,
      );
      return {
        _id: parsedEntityId,
        tenantId: parsedTenantId,
        isDeleted: false,
      };
    },

    tenantFileFilter(tenantId: unknown, fileId: unknown): {
      _id: TIdentifier;
      tenantId: TIdentifier;
      status: { $in: string[] };
    } {
      const parsedTenantId = requireIdentifier(
        tenantId,
        TENANT_FILTER_ERROR_REASONS.FILE_TENANT_ID_REQUIRED,
      );
      const parsedFileId = requireIdentifier(
        fileId,
        TENANT_FILTER_ERROR_REASONS.ENTITY_ID_REQUIRED,
      );
      return {
        _id: parsedFileId,
        tenantId: parsedTenantId,
        status: { $in: [...activeFileStatuses] },
      };
    },
  };
}
