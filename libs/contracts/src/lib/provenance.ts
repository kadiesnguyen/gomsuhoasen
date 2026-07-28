export const PROVENANCE_TYPES = {
  APPRAISAL: 'APPRAISAL',
  CERTIFICATE: 'CERTIFICATE',
  OWNERSHIP_HISTORY: 'OWNERSHIP_HISTORY',
} as const;

export type ProvenanceType = (typeof PROVENANCE_TYPES)[keyof typeof PROVENANCE_TYPES];

export const PROVENANCE_TYPE_VALUES = Object.values(PROVENANCE_TYPES) as ProvenanceType[];

export interface ProvenanceContract {
  id: string;
  productId: string;
  type: ProvenanceType;
  title: string;
  fileUrl: string;
  issuedDate?: string;
  issuedBy?: string;
  isActive: boolean;
}
