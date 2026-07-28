import { GHS_API } from '@gomhoasen/contracts';
import { readTrimmedString } from '@vt/common-utils';
import { fetchRequiredApiArray, fetchRequiredApiObjectOrNull } from './catalog-api';

interface PublicArtisanApi {
  id?: string;
  _id?: string;
  name?: string;
  slug?: string;
  avatar?: string;
  coverImage?: string;
  title?: string;
  bio?: string;
  specialty?: string;
  workshop?: string;
  location?: string;
  lineage?: string;
  yearsExperience?: number;
  certifications?: string[];
  phone?: string;
  email?: string;
}

export interface ShowroomArtisan {
  id: string;
  name: string;
  slug: string;
  avatar: string;
  coverImage: string;
  title: string;
  bio: string;
  specialty: string;
  workshop: string;
  location: string;
  lineage: string;
  yearsExperience?: number;
  certifications: string[];
  phone: string;
  email: string;
}

function normalizeArtisan(value: PublicArtisanApi): ShowroomArtisan | null {
  const id = readTrimmedString(value.id) ?? readTrimmedString(value._id);
  const name = readTrimmedString(value.name);
  const slug = readTrimmedString(value.slug);
  if (!id || !name || !slug) return null;

  return {
    id,
    name,
    slug,
    avatar: readTrimmedString(value.avatar) ?? '',
    coverImage: readTrimmedString(value.coverImage) ?? '',
    title: readTrimmedString(value.title) ?? '',
    bio: readTrimmedString(value.bio) ?? '',
    specialty: readTrimmedString(value.specialty) ?? '',
    workshop: readTrimmedString(value.workshop) ?? '',
    location: readTrimmedString(value.location) ?? '',
    lineage: readTrimmedString(value.lineage) ?? '',
    yearsExperience:
      typeof value.yearsExperience === 'number' && value.yearsExperience > 0
        ? value.yearsExperience
        : undefined,
    certifications: Array.isArray(value.certifications)
      ? value.certifications.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [],
    phone: readTrimmedString(value.phone) ?? '',
    email: readTrimmedString(value.email) ?? '',
  };
}

export async function getPublicArtisans(): Promise<ShowroomArtisan[]> {
  const items = await fetchRequiredApiArray<PublicArtisanApi>(
    GHS_API.ARTISAN.LIST,
    'showroom_v2.artisans',
  );
  return items
    .map(normalizeArtisan)
    .filter((item): item is ShowroomArtisan => item !== null);
}

export async function getPublicArtisan(slug: string): Promise<ShowroomArtisan | null> {
  const item = await fetchRequiredApiObjectOrNull<PublicArtisanApi>(
    GHS_API.ARTISAN.PUBLIC_BY_SLUG(slug),
    'showroom_v2.artisanDetail',
  );
  return item ? normalizeArtisan(item) : null;
}
