export const ARTISAN_STATUSES = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type ArtisanStatus = (typeof ARTISAN_STATUSES)[keyof typeof ARTISAN_STATUSES];

export const ARTISAN_STATUS_VALUES = Object.values(ARTISAN_STATUSES) as ArtisanStatus[];

export interface ArtisanContract {
  id: string;
  name: string;
  slug: string;
  status: ArtisanStatus;
  avatar?: string;
  bio: string;
  lineage?: string;
  yearsExperience?: number;
  certifications: string[];
  isActive: boolean;
}
