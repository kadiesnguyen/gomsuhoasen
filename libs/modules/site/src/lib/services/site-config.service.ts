import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createShowroomV2DefaultContent } from '@gomhoasen/contracts';
import { Model } from 'mongoose';
import { UpdateSiteConfigDto } from '../dto/site-config.dto';
import { SiteConfig, SiteConfigDocument } from '../schemas/site-config.schema';
import {
  SITE_CONFIG_SINGLETON_KEY,
  buildInitialSiteConfigValues,
  buildSiteConfigSetOnInsert,
  buildSiteConfigUpdateSet,
} from '../constants/site-config-writer-initial-values';

const SHOWROOM_BRAND_DEFAULTS = createShowroomV2DefaultContent().brand;

const LEGACY_DEFAULT_CONFIG = buildInitialSiteConfigValues({
  key: SITE_CONFIG_SINGLETON_KEY,
  brandName: 'GỐM HOA SEN',
  tagline: 'Gốm sứ nghệ thuật cho không gian sống hiện đại',
  subtitle: 'Tinh hoa men Việt — Chế tác thủ công — Kể chuyện qua từng đường nét',
  location: 'Bình Dương, Việt Nam',
  contact: {
    phone: '1900 1234 56',
    email: 'info@gomhoasen.vn',
    zaloOA: 'https://zalo.me/0901234567',
    address: 'Bình Dương, Việt Nam',
  },
  social: {},
  seo: {
    defaultTitle: 'Gốm Hoa Sen',
    defaultDescription: 'Gốm sứ nghệ thuật Việt Nam, chế tác thủ công cho không gian sống hiện đại.',
  },
});

const DEFAULT_CONFIG: Partial<SiteConfig> = buildInitialSiteConfigValues({
  key: SITE_CONFIG_SINGLETON_KEY,
  brandName: SHOWROOM_BRAND_DEFAULTS.name ?? 'GỐM HOA SEN',
  tagline: SHOWROOM_BRAND_DEFAULTS.tagline ?? '',
  subtitle: SHOWROOM_BRAND_DEFAULTS.subtitle ?? '',
  location: SHOWROOM_BRAND_DEFAULTS.location ?? '',
  contact: {
    phone: SHOWROOM_BRAND_DEFAULTS.phone ?? '',
    email: SHOWROOM_BRAND_DEFAULTS.email ?? '',
    address: SHOWROOM_BRAND_DEFAULTS.location ?? '',
  },
  social: {
    facebook: SHOWROOM_BRAND_DEFAULTS.facebookHref ?? '',
  },
  seo: {
    defaultTitle: SHOWROOM_BRAND_DEFAULTS.name ?? 'GỐM HOA SEN',
    defaultDescription:
      SHOWROOM_BRAND_DEFAULTS.subtitle ??
      SHOWROOM_BRAND_DEFAULTS.tagline ??
      '',
    ogImage: 'assets/editorial/hero.png',
  },
});

function readArrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function readFilterLength(value: unknown, key: 'types' | 'glazes' | 'priceRanges'): number {
  if (!value || Array.isArray(value) || typeof value !== 'object') return 0;
  const nested = (value as Record<string, unknown>)[key];
  return Array.isArray(nested) ? nested.length : 0;
}

function isLegacyPlaceholderConfig(config: SiteConfig | null | undefined): boolean {
  if (!config) return false;

  return (
    config.brandName === LEGACY_DEFAULT_CONFIG.brandName &&
    config.location === LEGACY_DEFAULT_CONFIG.location &&
    config.contact?.address === LEGACY_DEFAULT_CONFIG.contact.address &&
    config.contact?.phone === LEGACY_DEFAULT_CONFIG.contact.phone &&
    config.contact?.email === LEGACY_DEFAULT_CONFIG.contact.email &&
    readArrayLength(config.collections) === 0 &&
    readArrayLength(config.journal) === 0 &&
    readFilterLength(config.filters, 'types') === 0 &&
    readFilterLength(config.filters, 'glazes') === 0 &&
    readFilterLength(config.filters, 'priceRanges') === 0
  );
}

@Injectable()
export class SiteConfigService {
  constructor(@InjectModel(SiteConfig.name) private siteConfigModel: Model<SiteConfigDocument>) {}

  async getConfig() {
    const existing = await this.siteConfigModel.findOne({ key: SITE_CONFIG_SINGLETON_KEY });
    if (existing) {
      if (isLegacyPlaceholderConfig(existing)) {
        const repaired = await this.siteConfigModel.findOneAndUpdate(
          { key: SITE_CONFIG_SINGLETON_KEY },
          {
            $set: {
              brandName: DEFAULT_CONFIG.brandName,
              tagline: DEFAULT_CONFIG.tagline,
              subtitle: DEFAULT_CONFIG.subtitle,
              location: DEFAULT_CONFIG.location,
              contact: DEFAULT_CONFIG.contact,
              social: DEFAULT_CONFIG.social,
              seo: DEFAULT_CONFIG.seo,
            },
          },
          { returnDocument: 'after' },
        );
        return repaired ?? existing;
      }
      return existing;
    }
    return this.siteConfigModel.create(DEFAULT_CONFIG);
  }

  async updateConfig(dto: UpdateSiteConfigDto) {
    const updateSet = buildSiteConfigUpdateSet(dto);
    return this.siteConfigModel.findOneAndUpdate(
      { key: SITE_CONFIG_SINGLETON_KEY },
      {
        $set: updateSet,
        $setOnInsert: buildSiteConfigSetOnInsert(DEFAULT_CONFIG, updateSet),
      },
      { returnDocument: 'after', upsert: true },
    );
  }
}
