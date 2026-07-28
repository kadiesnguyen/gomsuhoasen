import { readArrayInput, readTextInputValue } from '@vt/common-utils';

import type { UpdateSiteConfigDto } from '../dto/site-config.dto';

export const SITE_CONFIG_SINGLETON_KEY = 'default';

type SiteConfigCollectionValue = NonNullable<UpdateSiteConfigDto['collections']>[number];
type SiteConfigOccasionValue = NonNullable<UpdateSiteConfigDto['occasions']>[number];
type SiteConfigJournalValue = NonNullable<UpdateSiteConfigDto['journal']>[number];
type SiteConfigFilterValues = NonNullable<UpdateSiteConfigDto['filters']>;
type SiteConfigTypeFilterValue = NonNullable<SiteConfigFilterValues['types']>[number];
type SiteConfigGlazeFilterValue = NonNullable<SiteConfigFilterValues['glazes']>[number];
type SiteConfigPriceRangeValue = NonNullable<SiteConfigFilterValues['priceRanges']>[number];

export type SiteConfigInitialValuesInput = Partial<UpdateSiteConfigDto> & {
  key?: string;
};

export type SiteConfigInitialValues = SiteConfigInitialValuesInput & {
  key: string;
  brandName: string;
  contact: NonNullable<UpdateSiteConfigDto['contact']>;
  social: NonNullable<UpdateSiteConfigDto['social']>;
  seo: NonNullable<UpdateSiteConfigDto['seo']>;
  collections: Array<NonNullable<UpdateSiteConfigDto['collections']>[number] & { count: number }>;
  occasions: NonNullable<UpdateSiteConfigDto['occasions']>;
  journal: NonNullable<UpdateSiteConfigDto['journal']>;
  filters: {
    types: NonNullable<NonNullable<UpdateSiteConfigDto['filters']>['types']>;
    glazes: NonNullable<NonNullable<UpdateSiteConfigDto['filters']>['glazes']>;
    priceRanges: NonNullable<NonNullable<UpdateSiteConfigDto['filters']>['priceRanges']>;
  };
};

export function buildInitialSiteConfigValues(input: SiteConfigInitialValuesInput): SiteConfigInitialValues {
  return {
    ...input,
    key: input.key ?? SITE_CONFIG_SINGLETON_KEY,
    brandName: readTextInputValue(input.brandName),
    contact: input.contact ?? {},
    social: input.social ?? {},
    seo: input.seo ?? {},
    collections: readArrayInput<SiteConfigCollectionValue>(input.collections).map((collection) => ({
      ...collection,
      count: collection.count ?? 0,
    })),
    occasions: readArrayInput<SiteConfigOccasionValue>(input.occasions),
    journal: readArrayInput<SiteConfigJournalValue>(input.journal),
    filters: {
      ...input.filters,
      types: readArrayInput<SiteConfigTypeFilterValue>(input.filters?.types),
      glazes: readArrayInput<SiteConfigGlazeFilterValue>(input.filters?.glazes),
      priceRanges: readArrayInput<SiteConfigPriceRangeValue>(input.filters?.priceRanges),
    },
  };
}

export function buildSiteConfigUpdateSet(dto: UpdateSiteConfigDto): Partial<SiteConfigInitialValues> {
  // Strip 'key' — callers must not override the singleton key
  const { key: _stripKey, ...fields } = dto as UpdateSiteConfigDto & { key?: string };

  const update = { ...fields } as Partial<SiteConfigInitialValues>;

  if (dto.collections) {
    update.collections = dto.collections.map((c) => ({ ...c, count: c.count ?? 0 }));
  }

  if (dto.filters) {
    update.filters = {
      ...dto.filters,
      types: readArrayInput<SiteConfigTypeFilterValue>(dto.filters.types),
      glazes: readArrayInput<SiteConfigGlazeFilterValue>(dto.filters.glazes),
      priceRanges: readArrayInput<SiteConfigPriceRangeValue>(dto.filters.priceRanges),
    };
  }

  return update;
}

export function buildSiteConfigSetOnInsert(
  defaultValues: SiteConfigInitialValuesInput,
  updateSet: Partial<SiteConfigInitialValues>,
): Partial<SiteConfigInitialValues> {
  const setOnInsert = buildInitialSiteConfigValues(defaultValues) as Partial<SiteConfigInitialValues>;

  for (const key of Object.keys(updateSet) as Array<keyof SiteConfigInitialValues>) {
    delete setOnInsert[key];
  }

  return setOnInsert;
}
