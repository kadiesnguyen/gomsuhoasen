import { GHS_API, SiteConfigContract, resolveApiOrigin, toAssetUrl } from '@gomhoasen/contracts';
import { readTrimmedString } from '@vt/common-utils';
import { fetchOptionalApiArray, fetchOptionalApiObject } from './api';
import { getShowroomV2Content } from './catalog-api';
import { readShowroomJournal } from './normalization';
import {
  FALLBACK_ABOUT_ELEMENTS,
  FALLBACK_ABOUT_LANDING,
  FALLBACK_ARTISANS_LANDING,
  FALLBACK_BRAND,
  FALLBACK_CATALOG_UX,
  FALLBACK_COLLECTIONS_LANDING,
  FALLBACK_COLLECTIONS_ROWS,
  FALLBACK_CONTACT_LANDING,
  FALLBACK_HOME_COLLECTIONS,
  FALLBACK_HOME_LANDING,
  FALLBACK_HOME_PROCESS,
  FALLBACK_HOME_PROMISES,
  FALLBACK_NAV_HREFS,
  FALLBACK_NAV_ITEMS,
  FALLBACK_NOT_FOUND,
  FALLBACK_NEWS_CARDS,
  FALLBACK_NEWS_HERO,
  FALLBACK_NEWS_LANDING_INFO,
  FALLBACK_PRODUCT_CATEGORIES,
  FALLBACK_PRODUCT_FEATURES,
  FALLBACK_PRODUCTS_LANDING_INFO,
  FALLBACK_TRUST_BADGES,
} from './fallback-data';

export type ShowroomV2Data = {
  brand: typeof FALLBACK_BRAND;
  navItems: typeof FALLBACK_NAV_ITEMS;
  navHrefs: typeof FALLBACK_NAV_HREFS;
  notFound: typeof FALLBACK_NOT_FOUND;
  homeCollections: typeof FALLBACK_HOME_COLLECTIONS;
  homeProcess: typeof FALLBACK_HOME_PROCESS;
  homePromises: typeof FALLBACK_HOME_PROMISES;
  aboutElements: typeof FALLBACK_ABOUT_ELEMENTS;
  collectionsRows: typeof FALLBACK_COLLECTIONS_ROWS;
  newsHero: NewsItem | null;
  newsCards: typeof FALLBACK_NEWS_CARDS;
  trustBadges: typeof FALLBACK_TRUST_BADGES;
  productFeatures: typeof FALLBACK_PRODUCT_FEATURES;
  productCategories: typeof FALLBACK_PRODUCT_CATEGORIES;
  collectionsLanding: typeof FALLBACK_COLLECTIONS_LANDING;
  productsLandingInfo: typeof FALLBACK_PRODUCTS_LANDING_INFO;
  newsLandingInfo: typeof FALLBACK_NEWS_LANDING_INFO;
  artisansLanding: typeof FALLBACK_ARTISANS_LANDING;
  contactLanding: typeof FALLBACK_CONTACT_LANDING;
  homeLanding: typeof FALLBACK_HOME_LANDING;
  aboutLanding: typeof FALLBACK_ABOUT_LANDING;
  catalogUx: typeof FALLBACK_CATALOG_UX;
};

type NewsItem = typeof FALLBACK_NEWS_HERO;

function cloneRows() {
  return {
    row1: [...FALLBACK_COLLECTIONS_ROWS.row1],
    row2: [...FALLBACK_COLLECTIONS_ROWS.row2],
    row3: [...FALLBACK_COLLECTIONS_ROWS.row3],
  };
}

export function createFallbackShowroomV2Data(): ShowroomV2Data {
  return {
    brand: { ...FALLBACK_BRAND },
    navItems: [...FALLBACK_NAV_ITEMS],
    navHrefs: [...FALLBACK_NAV_HREFS],
    notFound: { ...FALLBACK_NOT_FOUND },
    homeCollections: [...FALLBACK_HOME_COLLECTIONS],
    homeProcess: [...FALLBACK_HOME_PROCESS],
    homePromises: [...FALLBACK_HOME_PROMISES],
    aboutElements: [...FALLBACK_ABOUT_ELEMENTS],
    collectionsRows: cloneRows(),
    newsHero: { ...FALLBACK_NEWS_HERO },
    newsCards: [...FALLBACK_NEWS_CARDS],
    trustBadges: [...FALLBACK_TRUST_BADGES],
    productFeatures: [...FALLBACK_PRODUCT_FEATURES],
    productCategories: [...FALLBACK_PRODUCT_CATEGORIES],
    collectionsLanding: { ...FALLBACK_COLLECTIONS_LANDING },
    productsLandingInfo: { ...FALLBACK_PRODUCTS_LANDING_INFO },
    newsLandingInfo: { ...FALLBACK_NEWS_LANDING_INFO },
    artisansLanding: { ...FALLBACK_ARTISANS_LANDING },
    contactLanding: { ...FALLBACK_CONTACT_LANDING },
    homeLanding: {
      ...FALLBACK_HOME_LANDING,
      interactionFeatures: [...FALLBACK_HOME_LANDING.interactionFeatures],
    },
    aboutLanding: { ...FALLBACK_ABOUT_LANDING },
    catalogUx: { ...FALLBACK_CATALOG_UX },
  };
}

function toNewsItem(
  item: Partial<NewsItem>,
  fallback: NewsItem,
): NewsItem {
  return {
    id: item.id ?? fallback.id,
    title: item.title ?? fallback.title,
    excerpt: item.excerpt ?? fallback.excerpt,
    image: item.image ?? fallback.image,
    category: item.category ?? fallback.category,
    date: item.date ?? fallback.date,
    slug: item.slug ?? fallback.slug,
    author: item.author ?? fallback.author,
    readingTime: item.readingTime ?? fallback.readingTime,
    content: item.content ?? fallback.content,
  };
}

function buildJournalNewsCards() {
  const fallbackItems = [FALLBACK_NEWS_HERO, ...FALLBACK_NEWS_CARDS];
  return (journal: ReturnType<typeof readShowroomJournal>): NewsItem[] =>
    journal.map((item, index) => toNewsItem(item, fallbackItems[index] ?? fallbackItems[fallbackItems.length - 1]));
}

function applyNewsSelection(data: ShowroomV2Data, articles: NewsItem[], featuredId?: string) {
  if (articles.length === 0) {
    data.newsHero = null;
    data.newsCards = [];
    return;
  }

  const featured =
    articles.find((item) => item.id === featuredId) ??
    articles[0];

  data.newsHero = { ...featured };
  data.newsCards = articles
    .filter((item) => item.id !== featured.id)
    .map((item) => ({ ...item }));
}

function assignDefined<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
) {
  if (value !== undefined) {
    target[key] = value;
  }
}

function applyBrandContent(
  data: ShowroomV2Data,
  brand: NonNullable<Awaited<ReturnType<typeof getShowroomV2Content>>>['brand'] | undefined,
) {
  if (!brand) return;
  assignDefined(data.brand, 'name', brand.name);
  assignDefined(data.brand, 'tagline', brand.tagline);
  assignDefined(data.brand, 'subtitle', brand.subtitle);
  assignDefined(data.brand, 'location', brand.location);
  assignDefined(data.brand, 'phone', brand.phone);
  assignDefined(data.brand, 'email', brand.email);
  assignDefined(data.brand, 'facebookHref', brand.facebookHref);
}

function applySiteConfigBrandContent(
  data: ShowroomV2Data,
  siteConfig: SiteConfigContract | null,
) {
  if (!siteConfig) return;

  assignDefined(data.brand, 'name', siteConfig.brandName);
  assignDefined(data.brand, 'tagline', siteConfig.tagline);
  assignDefined(data.brand, 'subtitle', siteConfig.subtitle);
  assignDefined(data.brand, 'location', siteConfig.contact?.address ?? siteConfig.location);
  assignDefined(data.brand, 'phone', siteConfig.contact?.phone);
  assignDefined(data.brand, 'email', siteConfig.contact?.email);
  assignDefined(data.brand, 'facebookHref', siteConfig.social?.facebook);
}

function applyHomeContent(data: ShowroomV2Data, home: NonNullable<Awaited<ReturnType<typeof getShowroomV2Content>>>['home']) {
  if (!home) return;
  if (home.collections !== undefined) data.homeCollections = [...home.collections];
  if (home.process !== undefined) data.homeProcess = [...home.process];
  if (home.promises !== undefined) data.homePromises = [...home.promises];

  assignDefined(data.homeLanding, 'title', home.heroTitle);
  assignDefined(data.homeLanding, 'subtitle', home.heroSubtitle);
  assignDefined(data.homeLanding, 'body', home.heroBody);
  assignDefined(data.homeLanding, 'ctaLabel', home.heroCtaLabel);
  assignDefined(data.homeLanding, 'ctaHref', home.heroCtaHref);
  assignDefined(data.homeLanding, 'heroBg', home.heroBg);
  assignDefined(data.homeLanding, 'heroModelUrl', home.heroModelUrl);
  assignDefined(data.homeLanding, 'heroModelPoster', home.heroModelPoster);
  assignDefined(data.homeLanding, 'heroReferenceImage', home.heroReferenceImage);
  assignDefined(data.homeLanding, 'introSkipLabel', home.introSkipLabel);
  assignDefined(data.homeLanding, 'logoSubtext', home.logoSubtext);
  assignDefined(data.homeLanding, 'languageLabel', home.languageLabel);
  assignDefined(data.homeLanding, 'scrollHintLabel', home.scrollHintLabel);
  assignDefined(data.homeLanding, 'heroModelAlt', home.heroModelAlt);
  assignDefined(data.homeLanding, 'interactionHint', home.interactionHint);
  if (home.interactionFeatures !== undefined) {
    data.homeLanding.interactionFeatures = [...home.interactionFeatures];
  }
  assignDefined(data.homeLanding, 'heritageEyebrow', home.heritageEyebrow);
  assignDefined(data.homeLanding, 'heritageTitle', home.heritageTitle);
  assignDefined(data.homeLanding, 'heritageBody', home.heritageBody);
  assignDefined(data.homeLanding, 'heritageCtaLabel', home.heritageCtaLabel);
  assignDefined(data.homeLanding, 'heritageCtaHref', home.heritageCtaHref);
  assignDefined(data.homeLanding, 'collectionEyebrow', home.collectionEyebrow);
  assignDefined(data.homeLanding, 'collectionTitle', home.collectionTitle);
  assignDefined(data.homeLanding, 'collectionCtaLabel', home.collectionCtaLabel);
  assignDefined(data.homeLanding, 'collectionCtaHref', home.collectionCtaHref);
  assignDefined(data.homeLanding, 'footerCopyright', home.footerCopyright);
}

type CatalogCategoryApi = {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sortOrder?: number;
};

function mapCatalogCategoriesToStrip(
  categories: CatalogCategoryApi[],
  fallback: typeof FALLBACK_PRODUCT_CATEGORIES,
  apiOrigin: string,
): typeof FALLBACK_PRODUCT_CATEGORIES {
  return categories.map((category, index) => {
    const fallbackItem = fallback[index % fallback.length] ?? fallback[0];
    const customImage = readTrimmedString(category.image);
    const id = category.slug || category.id || category._id || `category-${index + 1}`;
    return {
      id,
      title: category.name,
      desc: category.description ?? fallbackItem?.desc ?? '',
      img: customImage
        ? (toAssetUrl(customImage, apiOrigin) ?? fallbackItem?.img ?? '/assets/products/product-cat-1.jpg')
        : (fallbackItem?.img ?? '/assets/products/product-cat-1.jpg'),
      href: `/danh-muc?collection=${encodeURIComponent(id)}`,
    };
  });
}

export async function fetchShowroomV2Data(): Promise<ShowroomV2Data> {
  const [siteConfig, v2Content, catalogCategories] = await Promise.all([
    fetchOptionalApiObject<SiteConfigContract>(GHS_API.SITE.CONFIG, 'fetchShowroomV2Data'),
    getShowroomV2Content(),
    fetchOptionalApiArray<CatalogCategoryApi>(GHS_API.CATALOG.PUBLIC_CATEGORIES, 'fetchShowroomCategories'),
  ]);

  const data = createFallbackShowroomV2Data();
  const buildJournalCards = buildJournalNewsCards();
  const journalCards = siteConfig ? buildJournalCards(readShowroomJournal(siteConfig.journal)) : [];
  const defaultCategoryImages = [...FALLBACK_PRODUCT_CATEGORIES];

  applySiteConfigBrandContent(data, siteConfig);
  applyBrandContent(data, v2Content?.brand);

  if (journalCards.length > 0) {
    applyNewsSelection(data, journalCards);
  }

  if (catalogCategories.length > 0) {
    data.productCategories = mapCatalogCategoriesToStrip(
      catalogCategories,
      defaultCategoryImages,
      resolveApiOrigin(),
    );
  }

  if (!v2Content) {
    return data;
  }

  if (v2Content.navigation?.items?.length) {
    data.navItems = v2Content.navigation.items.map((item) => item.label);
    data.navHrefs = v2Content.navigation.items.map((item) => item.href);
  }
  if (v2Content.notFound) {
    assignDefined(data.notFound, 'eyebrow', v2Content.notFound.eyebrow);
    assignDefined(data.notFound, 'title', v2Content.notFound.title);
    assignDefined(data.notFound, 'body', v2Content.notFound.body);
    assignDefined(data.notFound, 'backLabel', v2Content.notFound.backLabel);
  }

  applyHomeContent(data, v2Content.home);

  if (v2Content.about?.elements !== undefined) data.aboutElements = [...v2Content.about.elements];
  if (v2Content.about) {
    assignDefined(data.aboutLanding, 'eyebrow', v2Content.about.heroEyebrow);
    assignDefined(data.aboutLanding, 'title', v2Content.about.heroTitle);
    assignDefined(data.aboutLanding, 'desc', v2Content.about.heroDesc);
    assignDefined(data.aboutLanding, 'heroBg', v2Content.about.heroBg);
    assignDefined(data.aboutLanding, 'quoteText', v2Content.about.quoteText);
    assignDefined(data.aboutLanding, 'quoteAuthor', v2Content.about.quoteAuthor);
    assignDefined(data.aboutLanding, 'quoteBg', v2Content.about.quoteBg);
    assignDefined(data.aboutLanding, 'heroCtaLabel', v2Content.about.heroCtaLabel);
    assignDefined(data.aboutLanding, 'heroCtaHref', v2Content.about.heroCtaHref);
    assignDefined(data.aboutLanding, 'heroImageAlt', v2Content.about.heroImageAlt);
  }

  if (v2Content.collections?.rows?.row1 !== undefined) data.collectionsRows.row1 = [...v2Content.collections.rows.row1];
  if (v2Content.collections?.rows?.row2 !== undefined) data.collectionsRows.row2 = [...v2Content.collections.rows.row2];
  if (v2Content.collections?.rows?.row3 !== undefined) data.collectionsRows.row3 = [...v2Content.collections.rows.row3];
  if (v2Content.collections) {
    assignDefined(data.collectionsLanding, 'eyebrow', v2Content.collections.heroEyebrow);
    assignDefined(data.collectionsLanding, 'title', v2Content.collections.heroTitle);
    assignDefined(data.collectionsLanding, 'desc', v2Content.collections.heroDesc);
    assignDefined(data.collectionsLanding, 'heroBg', v2Content.collections.heroBg);
    assignDefined(data.collectionsLanding, 'heroCtaLabel', v2Content.collections.heroCtaLabel);
    assignDefined(data.collectionsLanding, 'heroCtaHref', v2Content.collections.heroCtaHref);
    assignDefined(data.collectionsLanding, 'tileCtaLabel', v2Content.collections.tileCtaLabel);
  }

  // Catalog categories from API win over CMS content defaults for the product strip.
  if (catalogCategories.length === 0 && v2Content.productsLanding?.categories !== undefined) {
    data.productCategories = [...v2Content.productsLanding.categories];
  }
  if (v2Content.productsLanding?.productFeatures !== undefined) data.productFeatures = [...v2Content.productsLanding.productFeatures];
  if (v2Content.productsLanding?.trustBadges !== undefined) data.trustBadges = [...v2Content.productsLanding.trustBadges];
  if (v2Content.productsLanding) {
    assignDefined(data.productsLandingInfo, 'title', v2Content.productsLanding.heroTitle);
    assignDefined(data.productsLandingInfo, 'subtitle', v2Content.productsLanding.heroSubtitle);
    assignDefined(data.productsLandingInfo, 'desc', v2Content.productsLanding.heroDesc);
    assignDefined(data.productsLandingInfo, 'badgeText', v2Content.productsLanding.badgeText);
    assignDefined(data.productsLandingInfo, 'heroBg', v2Content.productsLanding.heroBg);
    assignDefined(data.productsLandingInfo, 'featuredSectionLabel', v2Content.productsLanding.featuredSectionLabel);
  }

  if (v2Content.newsLanding) {
    assignDefined(data.newsLandingInfo, 'eyebrow', v2Content.newsLanding.heroEyebrow);
    assignDefined(data.newsLandingInfo, 'title', v2Content.newsLanding.heroTitle);
    assignDefined(data.newsLandingInfo, 'desc', v2Content.newsLanding.heroDesc);
    assignDefined(data.newsLandingInfo, 'featuredLabel', v2Content.newsLanding.featuredLabel);
    assignDefined(data.newsLandingInfo, 'allCategoryLabel', v2Content.newsLanding.allCategoryLabel);
    assignDefined(data.newsLandingInfo, 'emptyStateLabel', v2Content.newsLanding.emptyStateLabel);
    assignDefined(data.newsLandingInfo, 'readArticleLabel', v2Content.newsLanding.readArticleLabel);
    assignDefined(data.newsLandingInfo, 'backToNewsLabel', v2Content.newsLanding.backToNewsLabel);
    assignDefined(data.newsLandingInfo, 'relatedTitle', v2Content.newsLanding.relatedTitle);
    assignDefined(data.newsLandingInfo, 'notFoundTitle', v2Content.newsLanding.notFoundTitle);
    assignDefined(data.newsLandingInfo, 'notFoundBody', v2Content.newsLanding.notFoundBody);

    const sourceArticles = v2Content.newsLanding.newsCards !== undefined
      ? v2Content.newsLanding.newsCards.map((item) => toNewsItem(item, FALLBACK_NEWS_HERO))
      : journalCards;

    applyNewsSelection(data, sourceArticles, v2Content.newsLanding.featuredId);
  }

  if (v2Content.artisans) {
    assignDefined(data.artisansLanding, 'eyebrow', v2Content.artisans.eyebrow);
    assignDefined(data.artisansLanding, 'title', v2Content.artisans.title);
    assignDefined(data.artisansLanding, 'desc', v2Content.artisans.desc);
    assignDefined(data.artisansLanding, 'loadingText', v2Content.artisans.loadingText);
    assignDefined(data.artisansLanding, 'errorTitle', v2Content.artisans.errorTitle);
    assignDefined(data.artisansLanding, 'errorText', v2Content.artisans.errorText);
    assignDefined(data.artisansLanding, 'retryLabel', v2Content.artisans.retryLabel);
    assignDefined(data.artisansLanding, 'emptyText', v2Content.artisans.emptyText);
    assignDefined(data.artisansLanding, 'notFoundTitle', v2Content.artisans.notFoundTitle);
    assignDefined(data.artisansLanding, 'notFoundBody', v2Content.artisans.notFoundBody);
    assignDefined(data.artisansLanding, 'backLabel', v2Content.artisans.backLabel);
    assignDefined(data.artisansLanding, 'profileCtaLabel', v2Content.artisans.profileCtaLabel);
    assignDefined(data.artisansLanding, 'experienceLabel', v2Content.artisans.experienceLabel);
    assignDefined(data.artisansLanding, 'bioTitle', v2Content.artisans.bioTitle);
    assignDefined(data.artisansLanding, 'lineageTitle', v2Content.artisans.lineageTitle);
    assignDefined(data.artisansLanding, 'workshopTitle', v2Content.artisans.workshopTitle);
    assignDefined(data.artisansLanding, 'certificationsTitle', v2Content.artisans.certificationsTitle);
    assignDefined(data.artisansLanding, 'contactTitle', v2Content.artisans.contactTitle);
    assignDefined(data.artisansLanding, 'contactBody', v2Content.artisans.contactBody);
    assignDefined(data.artisansLanding, 'phoneCtaLabel', v2Content.artisans.phoneCtaLabel);
    assignDefined(data.artisansLanding, 'emailCtaLabel', v2Content.artisans.emailCtaLabel);
  }

  if (v2Content.contact) {
    assignDefined(data.contactLanding, 'title', v2Content.contact.heroTitle);
    assignDefined(data.contactLanding, 'desc', v2Content.contact.heroDesc);
    assignDefined(data.contactLanding, 'openingHours', v2Content.contact.openingHours);
    assignDefined(data.contactLanding, 'mapCtaHref', v2Content.contact.mapCtaHref);
    assignDefined(data.contactLanding, 'mapCtaLabel', v2Content.contact.mapCtaLabel);
    assignDefined(data.contactLanding, 'locationBandImage', v2Content.contact.locationBandImage);
    assignDefined(data.contactLanding, 'heroBg', v2Content.contact.heroBg);
    assignDefined(data.contactLanding, 'formTitle', v2Content.contact.formTitle);
    assignDefined(data.contactLanding, 'submitLabel', v2Content.contact.submitLabel);
    assignDefined(data.contactLanding, 'submittingLabel', v2Content.contact.submittingLabel);
    assignDefined(data.contactLanding, 'successMessage', v2Content.contact.successMessage);
    assignDefined(data.contactLanding, 'successResetLabel', v2Content.contact.successResetLabel);
    assignDefined(data.contactLanding, 'errorMessage', v2Content.contact.errorMessage);
    assignDefined(data.contactLanding, 'namePlaceholder', v2Content.contact.namePlaceholder);
    assignDefined(data.contactLanding, 'phonePlaceholder', v2Content.contact.phonePlaceholder);
    assignDefined(data.contactLanding, 'emailPlaceholder', v2Content.contact.emailPlaceholder);
    assignDefined(data.contactLanding, 'notePlaceholder', v2Content.contact.notePlaceholder);
    assignDefined(data.contactLanding, 'showroomLabel', v2Content.contact.showroomLabel);
    assignDefined(data.contactLanding, 'hotlineLabel', v2Content.contact.hotlineLabel);
    assignDefined(data.contactLanding, 'openingHoursLabel', v2Content.contact.openingHoursLabel);
    assignDefined(data.contactLanding, 'emailLabel', v2Content.contact.emailLabel);
    assignDefined(data.contactLanding, 'locationImageAlt', v2Content.contact.locationImageAlt);
  }

  if (v2Content.catalog) {
    assignDefined(data.catalogUx, 'listingEyebrow', v2Content.catalog.listingEyebrow);
    assignDefined(data.catalogUx, 'listingTitle', v2Content.catalog.listingTitle);
    assignDefined(data.catalogUx, 'listingSubtitle', v2Content.catalog.listingSubtitle);
    assignDefined(data.catalogUx, 'listingAdvisorTitle', v2Content.catalog.listingAdvisorTitle);
    assignDefined(data.catalogUx, 'listingAdvisorBody', v2Content.catalog.listingAdvisorBody);
    assignDefined(data.catalogUx, 'listingLoadingText', v2Content.catalog.listingLoadingText);
    assignDefined(data.catalogUx, 'listingErrorText', v2Content.catalog.listingErrorText);
    assignDefined(data.catalogUx, 'listingRetryLabel', v2Content.catalog.listingRetryLabel);
    assignDefined(data.catalogUx, 'detailLoadingText', v2Content.catalog.detailLoadingText);
    assignDefined(data.catalogUx, 'detailErrorText', v2Content.catalog.detailErrorText);
    assignDefined(data.catalogUx, 'detailNotFoundText', v2Content.catalog.detailNotFoundText);
    assignDefined(data.catalogUx, 'detailCtaLabel', v2Content.catalog.detailCtaLabel);
    assignDefined(data.catalogUx, 'detailBackLabel', v2Content.catalog.detailBackLabel);
  }

  return data;
}
