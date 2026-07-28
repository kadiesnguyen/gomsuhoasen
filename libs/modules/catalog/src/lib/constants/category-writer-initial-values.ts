import { applyInitialValues } from '@vt/common-utils';

import type { CreateCategoryDto } from '../dto/category.dto';

export type CategoryInitialValuesInput = CreateCategoryDto & {
  slug: string;
  isDeleted?: boolean;
};

export type CategoryInitialValues = CategoryInitialValuesInput & {
  sortOrder: number;
  isDeleted: boolean;
};

export const CATEGORY_INITIAL_VALUES = Object.freeze({
  sortOrder: 0,
  isDeleted: false,
} satisfies Pick<CategoryInitialValues, 'sortOrder' | 'isDeleted'>);

export function buildInitialCategoryValues(input: CategoryInitialValuesInput): CategoryInitialValues {
  return applyInitialValues<CategoryInitialValuesInput, Pick<CategoryInitialValues, 'sortOrder' | 'isDeleted'>>(
    input,
    CATEGORY_INITIAL_VALUES,
  );
}
