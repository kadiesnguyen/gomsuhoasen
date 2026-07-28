import { createShowroomV2DefaultContent } from '@gomhoasen/contracts';

const DEFAULT_CONTENT = createShowroomV2DefaultContent();
const DEFAULT_NEWS_ITEMS = DEFAULT_CONTENT.newsLanding.newsCards ?? [];
const DEFAULT_FEATURED_ID = DEFAULT_CONTENT.newsLanding.featuredId ?? DEFAULT_NEWS_ITEMS[0]?.id;
const DEFAULT_FEATURED_ARTICLE =
  DEFAULT_NEWS_ITEMS.find((item) => item.id === DEFAULT_FEATURED_ID) ??
  DEFAULT_NEWS_ITEMS[0] ?? {
    id: 'news-fallback',
    category: '',
    date: '',
    title: '',
    excerpt: '',
    image: '',
  };

export const FALLBACK_BRAND = {
  name: DEFAULT_CONTENT.brand.name ?? '',
  tagline: DEFAULT_CONTENT.brand.tagline ?? '',
  subtitle: DEFAULT_CONTENT.brand.subtitle ?? '',
  location: DEFAULT_CONTENT.brand.location ?? '',
  phone: DEFAULT_CONTENT.brand.phone ?? '',
  email: DEFAULT_CONTENT.brand.email ?? '',
  facebookHref: DEFAULT_CONTENT.brand.facebookHref ?? '',
};

export const FALLBACK_NAV_ITEMS = DEFAULT_CONTENT.navigation.items.map((item) => item.label);
export const FALLBACK_NAV_HREFS = DEFAULT_CONTENT.navigation.items.map((item) => item.href);
export const FALLBACK_NOT_FOUND = {
  eyebrow: DEFAULT_CONTENT.notFound.eyebrow ?? '',
  title: DEFAULT_CONTENT.notFound.title ?? '',
  body: DEFAULT_CONTENT.notFound.body ?? '',
  backLabel: DEFAULT_CONTENT.notFound.backLabel ?? '',
};

export const FALLBACK_HOME_COLLECTIONS = DEFAULT_CONTENT.home.collections;
export const FALLBACK_HOME_PROCESS = DEFAULT_CONTENT.home.process;
export const FALLBACK_HOME_PROMISES = DEFAULT_CONTENT.home.promises;
export const FALLBACK_ABOUT_ELEMENTS = DEFAULT_CONTENT.about.elements;
export const FALLBACK_COLLECTIONS_ROWS = DEFAULT_CONTENT.collections.rows;
export const FALLBACK_PRODUCT_FEATURES = DEFAULT_CONTENT.productsLanding.productFeatures;
export const FALLBACK_PRODUCT_CATEGORIES = DEFAULT_CONTENT.productsLanding.categories;
export const FALLBACK_TRUST_BADGES = DEFAULT_CONTENT.productsLanding.trustBadges;

export const FALLBACK_NEWS_HERO = { ...DEFAULT_FEATURED_ARTICLE };
export const FALLBACK_NEWS_CARDS = DEFAULT_NEWS_ITEMS.filter((item) => item.id !== FALLBACK_NEWS_HERO.id);

export const FALLBACK_HOME_LANDING = {
  title: DEFAULT_CONTENT.home.heroTitle ?? '',
  subtitle: DEFAULT_CONTENT.home.heroSubtitle ?? '',
  body: DEFAULT_CONTENT.home.heroBody ?? '',
  ctaLabel: DEFAULT_CONTENT.home.heroCtaLabel ?? '',
  ctaHref: DEFAULT_CONTENT.home.heroCtaHref ?? '',
  heroBg: DEFAULT_CONTENT.home.heroBg ?? '',
  heroModelUrl: DEFAULT_CONTENT.home.heroModelUrl ?? '',
  heroModelPoster: DEFAULT_CONTENT.home.heroModelPoster ?? '',
  heroReferenceImage: DEFAULT_CONTENT.home.heroReferenceImage ?? '',
  introSkipLabel: DEFAULT_CONTENT.home.introSkipLabel ?? '',
  logoSubtext: DEFAULT_CONTENT.home.logoSubtext ?? '',
  languageLabel: DEFAULT_CONTENT.home.languageLabel ?? '',
  scrollHintLabel: DEFAULT_CONTENT.home.scrollHintLabel ?? '',
  heroModelAlt: DEFAULT_CONTENT.home.heroModelAlt ?? '',
  interactionHint: DEFAULT_CONTENT.home.interactionHint ?? '',
  interactionFeatures: [...(DEFAULT_CONTENT.home.interactionFeatures ?? [])],
  heritageEyebrow: DEFAULT_CONTENT.home.heritageEyebrow ?? '',
  heritageTitle: DEFAULT_CONTENT.home.heritageTitle ?? '',
  heritageBody: DEFAULT_CONTENT.home.heritageBody ?? '',
  heritageCtaLabel: DEFAULT_CONTENT.home.heritageCtaLabel ?? '',
  heritageCtaHref: DEFAULT_CONTENT.home.heritageCtaHref ?? '',
  collectionEyebrow: DEFAULT_CONTENT.home.collectionEyebrow ?? '',
  collectionTitle: DEFAULT_CONTENT.home.collectionTitle ?? '',
  collectionCtaLabel: DEFAULT_CONTENT.home.collectionCtaLabel ?? '',
  collectionCtaHref: DEFAULT_CONTENT.home.collectionCtaHref ?? '',
  footerCopyright: DEFAULT_CONTENT.home.footerCopyright ?? '',
  collections: [] as typeof FALLBACK_HOME_COLLECTIONS,
  process: [] as typeof FALLBACK_HOME_PROCESS,
  promises: [] as typeof FALLBACK_HOME_PROMISES,
};

export const FALLBACK_ABOUT_LANDING = {
  eyebrow: DEFAULT_CONTENT.about.heroEyebrow ?? '',
  title: DEFAULT_CONTENT.about.heroTitle ?? '',
  desc: DEFAULT_CONTENT.about.heroDesc ?? '',
  heroBg: DEFAULT_CONTENT.about.heroBg ?? '',
  quoteText: DEFAULT_CONTENT.about.quoteText ?? '',
  quoteAuthor: DEFAULT_CONTENT.about.quoteAuthor ?? '',
  quoteBg: DEFAULT_CONTENT.about.quoteBg ?? '',
  heroCtaLabel: DEFAULT_CONTENT.about.heroCtaLabel ?? '',
  heroCtaHref: DEFAULT_CONTENT.about.heroCtaHref ?? '',
  heroImageAlt: DEFAULT_CONTENT.about.heroImageAlt ?? '',
  elements: [] as typeof FALLBACK_ABOUT_ELEMENTS,
};

export const FALLBACK_COLLECTIONS_LANDING = {
  eyebrow: DEFAULT_CONTENT.collections.heroEyebrow ?? '',
  title: DEFAULT_CONTENT.collections.heroTitle ?? '',
  desc: DEFAULT_CONTENT.collections.heroDesc ?? '',
  heroBg: DEFAULT_CONTENT.collections.heroBg ?? '',
  heroCtaLabel: DEFAULT_CONTENT.collections.heroCtaLabel ?? '',
  heroCtaHref: DEFAULT_CONTENT.collections.heroCtaHref ?? '',
  tileCtaLabel: DEFAULT_CONTENT.collections.tileCtaLabel ?? '',
};

export const FALLBACK_PRODUCTS_LANDING_INFO = {
  title: DEFAULT_CONTENT.productsLanding.heroTitle ?? '',
  subtitle: DEFAULT_CONTENT.productsLanding.heroSubtitle ?? '',
  desc: DEFAULT_CONTENT.productsLanding.heroDesc ?? '',
  badgeText: DEFAULT_CONTENT.productsLanding.badgeText ?? '',
  heroBg: DEFAULT_CONTENT.productsLanding.heroBg ?? '',
  featuredSectionLabel: DEFAULT_CONTENT.productsLanding.featuredSectionLabel ?? '',
};

export const FALLBACK_NEWS_LANDING_INFO = {
  eyebrow: DEFAULT_CONTENT.newsLanding.heroEyebrow ?? '',
  title: DEFAULT_CONTENT.newsLanding.heroTitle ?? '',
  desc: DEFAULT_CONTENT.newsLanding.heroDesc ?? '',
  featuredLabel: DEFAULT_CONTENT.newsLanding.featuredLabel ?? '',
  allCategoryLabel: DEFAULT_CONTENT.newsLanding.allCategoryLabel ?? '',
  emptyStateLabel: DEFAULT_CONTENT.newsLanding.emptyStateLabel ?? '',
  readArticleLabel: DEFAULT_CONTENT.newsLanding.readArticleLabel ?? '',
  backToNewsLabel: DEFAULT_CONTENT.newsLanding.backToNewsLabel ?? '',
  relatedTitle: DEFAULT_CONTENT.newsLanding.relatedTitle ?? '',
  notFoundTitle: DEFAULT_CONTENT.newsLanding.notFoundTitle ?? '',
  notFoundBody: DEFAULT_CONTENT.newsLanding.notFoundBody ?? '',
};

export const FALLBACK_ARTISANS_LANDING = {
  eyebrow: DEFAULT_CONTENT.artisans.eyebrow ?? '',
  title: DEFAULT_CONTENT.artisans.title ?? '',
  desc: DEFAULT_CONTENT.artisans.desc ?? '',
  loadingText: DEFAULT_CONTENT.artisans.loadingText ?? '',
  errorTitle: DEFAULT_CONTENT.artisans.errorTitle ?? '',
  errorText: DEFAULT_CONTENT.artisans.errorText ?? '',
  retryLabel: DEFAULT_CONTENT.artisans.retryLabel ?? '',
  emptyText: DEFAULT_CONTENT.artisans.emptyText ?? '',
  notFoundTitle: DEFAULT_CONTENT.artisans.notFoundTitle ?? '',
  notFoundBody: DEFAULT_CONTENT.artisans.notFoundBody ?? '',
  backLabel: DEFAULT_CONTENT.artisans.backLabel ?? '',
  profileCtaLabel: DEFAULT_CONTENT.artisans.profileCtaLabel ?? '',
  experienceLabel: DEFAULT_CONTENT.artisans.experienceLabel ?? '',
  bioTitle: DEFAULT_CONTENT.artisans.bioTitle ?? '',
  lineageTitle: DEFAULT_CONTENT.artisans.lineageTitle ?? '',
  workshopTitle: DEFAULT_CONTENT.artisans.workshopTitle ?? '',
  certificationsTitle: DEFAULT_CONTENT.artisans.certificationsTitle ?? '',
  contactTitle: DEFAULT_CONTENT.artisans.contactTitle ?? '',
  contactBody: DEFAULT_CONTENT.artisans.contactBody ?? '',
  phoneCtaLabel: DEFAULT_CONTENT.artisans.phoneCtaLabel ?? '',
  emailCtaLabel: DEFAULT_CONTENT.artisans.emailCtaLabel ?? '',
};

export const FALLBACK_CONTACT_LANDING = {
  title: DEFAULT_CONTENT.contact.heroTitle ?? '',
  desc: DEFAULT_CONTENT.contact.heroDesc ?? '',
  openingHours: DEFAULT_CONTENT.contact.openingHours ?? '',
  mapCtaHref: DEFAULT_CONTENT.contact.mapCtaHref ?? '',
  mapCtaLabel: DEFAULT_CONTENT.contact.mapCtaLabel ?? '',
  locationBandImage: DEFAULT_CONTENT.contact.locationBandImage ?? '',
  heroBg: DEFAULT_CONTENT.contact.heroBg ?? '',
  formTitle: DEFAULT_CONTENT.contact.formTitle ?? '',
  submitLabel: DEFAULT_CONTENT.contact.submitLabel ?? '',
  submittingLabel: DEFAULT_CONTENT.contact.submittingLabel ?? '',
  successMessage: DEFAULT_CONTENT.contact.successMessage ?? '',
  successResetLabel: DEFAULT_CONTENT.contact.successResetLabel ?? '',
  errorMessage: DEFAULT_CONTENT.contact.errorMessage ?? '',
  namePlaceholder: DEFAULT_CONTENT.contact.namePlaceholder ?? '',
  phonePlaceholder: DEFAULT_CONTENT.contact.phonePlaceholder ?? '',
  emailPlaceholder: DEFAULT_CONTENT.contact.emailPlaceholder ?? '',
  notePlaceholder: DEFAULT_CONTENT.contact.notePlaceholder ?? '',
  showroomLabel: DEFAULT_CONTENT.contact.showroomLabel ?? '',
  hotlineLabel: DEFAULT_CONTENT.contact.hotlineLabel ?? '',
  openingHoursLabel: DEFAULT_CONTENT.contact.openingHoursLabel ?? '',
  emailLabel: DEFAULT_CONTENT.contact.emailLabel ?? '',
  locationImageAlt: DEFAULT_CONTENT.contact.locationImageAlt ?? '',
};

export const FALLBACK_CATALOG_UX = {
  listingEyebrow: DEFAULT_CONTENT.catalog.listingEyebrow ?? '',
  listingTitle: DEFAULT_CONTENT.catalog.listingTitle ?? '',
  listingSubtitle: DEFAULT_CONTENT.catalog.listingSubtitle ?? '',
  listingAdvisorTitle: DEFAULT_CONTENT.catalog.listingAdvisorTitle ?? '',
  listingAdvisorBody: DEFAULT_CONTENT.catalog.listingAdvisorBody ?? '',
  listingLoadingText: DEFAULT_CONTENT.catalog.listingLoadingText ?? '',
  listingErrorText: DEFAULT_CONTENT.catalog.listingErrorText ?? '',
  listingRetryLabel: DEFAULT_CONTENT.catalog.listingRetryLabel ?? '',
  detailLoadingText: DEFAULT_CONTENT.catalog.detailLoadingText ?? '',
  detailErrorText: DEFAULT_CONTENT.catalog.detailErrorText ?? '',
  detailNotFoundText: DEFAULT_CONTENT.catalog.detailNotFoundText ?? '',
  detailCtaLabel: DEFAULT_CONTENT.catalog.detailCtaLabel ?? '',
  detailBackLabel: DEFAULT_CONTENT.catalog.detailBackLabel ?? '',
};
