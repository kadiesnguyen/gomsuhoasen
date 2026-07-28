import { applyInitialValues, readArrayInput } from '@vt/common-utils';

import type { CreateProductDto } from '../dto/product.dto';
import { ProductStatus } from '../schemas/product.schema';

type ProductViewSectionInput = NonNullable<CreateProductDto['viewSections']>[number];
type ProductHotspotInput = NonNullable<ProductViewSectionInput['hotspots']>[number];
type ProductVariantInput = NonNullable<CreateProductDto['variants']>[number];
type ProductInitialDefaultFields = {
  status: ProductStatus;
  referencePrice: number;
  tags: string[];
  images: string[];
  viewSections: ProductViewSectionInput[];
  variants: ProductVariantInput[];
  sortOrder: number;
  isDeleted: boolean;
};
type ProductInitialHelperInput = Omit<ProductInitialValuesInput, 'status'> & {
  status?: ProductStatus;
};

type ProductViewSectionInitialValues = NonNullable<CreateProductDto['viewSections']>[number] & {
  hotspots: NonNullable<NonNullable<CreateProductDto['viewSections']>[number]['hotspots']>;
};

export type ProductInitialValuesInput = CreateProductDto & {
  slug: string;
  isDeleted?: boolean;
};

export type ProductInitialValues = ProductInitialValuesInput & {
  status: ProductStatus;
  referencePrice: number;
  tags: string[];
  images: string[];
  viewSections: ProductViewSectionInitialValues[];
  variants: NonNullable<CreateProductDto['variants']>;
  sortOrder: number;
  isDeleted: boolean;
};

export const PRODUCT_INITIAL_VALUES = Object.freeze({
  status: ProductStatus.DISPLAY_ONLY,
  referencePrice: 0,
  tags: [],
  images: [],
  viewSections: [],
  variants: [],
  sortOrder: 0,
  isDeleted: false,
} satisfies ProductInitialDefaultFields);

export function buildInitialProductValues(input: ProductInitialValuesInput): ProductInitialValues {
  const helperInput: ProductInitialHelperInput = {
    ...input,
    status: input.status,
  };

  const values = applyInitialValues<ProductInitialHelperInput, ProductInitialDefaultFields>(
    helperInput,
    PRODUCT_INITIAL_VALUES,
  );

  return {
    ...values,
    tags: [...readArrayInput<string>(values.tags)],
    images: [...readArrayInput<string>(values.images)],
    viewSections: readArrayInput<ProductViewSectionInput>(values.viewSections).map((section) => ({
      ...section,
      hotspots: readArrayInput<ProductHotspotInput>(section.hotspots),
    })),
    variants: [...readArrayInput<ProductVariantInput>(values.variants)],
  };
}
