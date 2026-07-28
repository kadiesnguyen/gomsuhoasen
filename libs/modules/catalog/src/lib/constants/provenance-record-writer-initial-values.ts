import { applyInitialValues } from '@vt/common-utils';
import type { Types } from 'mongoose';
import type { ProvenanceType } from '../schemas/provenance-record.schema';

export type ProvenanceRecordInitialValuesInput = {
  productId: Types.ObjectId;
  type: ProvenanceType;
  title: string;
  fileUrl: string;
  issuedDate?: Date;
  issuedBy?: string;
  isActive?: boolean;
  isDeleted?: boolean;
};

export type ProvenanceRecordInitialValues = ProvenanceRecordInitialValuesInput & {
  isActive: boolean;
  isDeleted: boolean;
};

export const PROVENANCE_RECORD_INITIAL_VALUES = Object.freeze({
  isActive: true,
  isDeleted: false,
} satisfies Pick<ProvenanceRecordInitialValues, 'isActive' | 'isDeleted'>);

export function buildInitialProvenanceRecordValues(
  input: ProvenanceRecordInitialValuesInput,
): ProvenanceRecordInitialValues {
  return applyInitialValues<
    ProvenanceRecordInitialValuesInput,
    Pick<ProvenanceRecordInitialValues, 'isActive' | 'isDeleted'>
  >(input, PROVENANCE_RECORD_INITIAL_VALUES) as ProvenanceRecordInitialValues;
}
