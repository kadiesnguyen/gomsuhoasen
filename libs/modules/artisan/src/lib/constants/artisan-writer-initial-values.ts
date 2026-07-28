import { applyInitialValues, readArrayInput } from '@vt/common-utils';
import { ARTISAN_STATUSES } from '@gomhoasen/contracts';

import type { CreateArtisanDto } from '../dto/artisan.dto';
import type { ArtisanStatus } from '../schemas/artisan.schema';

export type ArtisanInitialValuesInput = CreateArtisanDto & {
  slug: string;
  isDeleted?: boolean;
};

export type ArtisanInitialValues = ArtisanInitialValuesInput & {
  certifications: string[];
  sortOrder: number;
  status: ArtisanStatus;
  isDeleted: boolean;
};

export const ARTISAN_INITIAL_VALUES = Object.freeze({
  certifications: [],
  sortOrder: 0,
  status: ARTISAN_STATUSES.ACTIVE,
  isDeleted: false,
} satisfies Pick<ArtisanInitialValues, 'certifications' | 'sortOrder' | 'status' | 'isDeleted'>);

export function buildInitialArtisanValues(input: ArtisanInitialValuesInput): ArtisanInitialValues {
  const values = applyInitialValues<
    ArtisanInitialValuesInput,
    Pick<ArtisanInitialValues, 'certifications' | 'sortOrder' | 'status' | 'isDeleted'>
  >(input, ARTISAN_INITIAL_VALUES);

  return {
    ...values,
    certifications: [...readArrayInput<string>(values.certifications)],
  };
}
