export interface SiteContactContract {
  phone?: string;
  email?: string;
  zaloOA?: string;
  address?: string;
}

export interface SiteSocialContract {
  facebook?: string;
  instagram?: string;
  youtube?: string;
}

export interface SiteSeoContract {
  defaultTitle?: string;
  defaultDescription?: string;
  ogImage?: string;
}

export interface SiteCollectionContract {
  id: string;
  name: string;
  desc?: string;
  image?: string;
  count?: number;
}

export interface SiteOccasionContract {
  id: string;
  name: string;
  icon?: string;
  desc?: string;
}

export interface SiteJournalItemContract {
  id: string;
  title: string;
  excerpt?: string;
  image?: string;
  category?: string;
  date?: string;
}

export interface SiteFilterOptionContract {
  id: string;
  name: string;
  count?: number;
  swatch?: string;
  min?: number;
  max?: number;
}

export interface SiteJournalContract {
  featured: SiteJournalItemContract[];
  items: SiteJournalItemContract[];
}

export interface ShowroomV2ContentContract {
  brand: {
    name?: string;
    tagline?: string;
    subtitle?: string;
    location?: string;
    phone?: string;
    email?: string;
    facebookHref?: string;
  };
  navigation: {
    items: { label: string; href: string }[];
  };
  notFound: {
    eyebrow?: string;
    title?: string;
    body?: string;
    backLabel?: string;
  };
  home: {
    heroTitle?: string;
    heroSubtitle?: string;
    heroBody?: string;
    heroCtaLabel?: string;
    heroCtaHref?: string;
    heroBg?: string;
    heroModelUrl?: string;
    heroModelPoster?: string;
    heroReferenceImage?: string;
    introSkipLabel?: string;
    logoSubtext?: string;
    languageLabel?: string;
    scrollHintLabel?: string;
    heroModelAlt?: string;
    interactionHint?: string;
    interactionFeatures?: string[];
    heritageEyebrow?: string;
    heritageTitle?: string;
    heritageBody?: string;
    heritageCtaLabel?: string;
    heritageCtaHref?: string;
    collectionEyebrow?: string;
    collectionTitle?: string;
    collectionCtaLabel?: string;
    collectionCtaHref?: string;
    footerCopyright?: string;
    collections: { img: string; title: string; sub: string; href: string }[];
    process: { img: string; title: string; desc: string; position: string }[];
    promises: { title: string; desc: string }[];
  };
  about: {
    heroEyebrow?: string;
    heroTitle?: string;
    heroDesc?: string;
    heroBg?: string;
    quoteText?: string;
    quoteAuthor?: string;
    quoteBg?: string;
    heroCtaLabel?: string;
    heroCtaHref?: string;
    heroImageAlt?: string;
    elements: { id: string; title: string; desc: string; img: string; iconType: string; isActive: boolean }[];
  };
  collections: {
    heroEyebrow?: string;
    heroTitle?: string;
    heroDesc?: string;
    heroBg?: string;
    heroCtaLabel?: string;
    heroCtaHref?: string;
    tileCtaLabel?: string;
    rows: {
      row1: { id: string; title: string; desc: string; img: string; href: string; span: number }[];
      row2: { id: string; title: string; desc: string; img: string; href: string; span: number }[];
      row3: { id: string; title: string; desc: string; img: string; href: string; span: number }[];
    };
  };
  productsLanding: {
    heroTitle?: string;
    heroSubtitle?: string;
    heroDesc?: string;
    badgeText?: string;
    heroBg?: string;
    featuredSectionLabel?: string;
    productFeatures: { iconType: string; title: string; desc: string }[];
    trustBadges: { iconType: string; title: string; desc: string }[];
    categories: { id: string; title: string; desc: string; img: string; href: string }[];
  };
  newsLanding: {
    heroEyebrow?: string;
    heroTitle?: string;
    heroDesc?: string;
    featuredId?: string;
    featuredLabel?: string;
    allCategoryLabel?: string;
    emptyStateLabel?: string;
    readArticleLabel?: string;
    backToNewsLabel?: string;
    relatedTitle?: string;
    notFoundTitle?: string;
    notFoundBody?: string;
    categories?: {
      id: string;
      name: string;
      slug: string;
    }[];
    newsCards?: {
      id: string;
      slug: string;
      category: string;
      date: string;
      title: string;
      excerpt: string;
      image: string;
      author: string;
      readingTime: string;
      content: string;
    }[];
  };
  artisans: {
    eyebrow?: string;
    title?: string;
    desc?: string;
    loadingText?: string;
    errorTitle?: string;
    errorText?: string;
    retryLabel?: string;
    emptyText?: string;
    notFoundTitle?: string;
    notFoundBody?: string;
    backLabel?: string;
    profileCtaLabel?: string;
    experienceLabel?: string;
    bioTitle?: string;
    lineageTitle?: string;
    workshopTitle?: string;
    certificationsTitle?: string;
    contactTitle?: string;
    contactBody?: string;
    phoneCtaLabel?: string;
    emailCtaLabel?: string;
  };
  contact: {
    heroTitle?: string;
    heroDesc?: string;
    openingHours?: string;
    locationBandImage?: string;
    mapCtaLabel?: string;
    mapCtaHref?: string;
    heroBg?: string;
    formTitle?: string;
    submitLabel?: string;
    submittingLabel?: string;
    successMessage?: string;
    successResetLabel?: string;
    errorMessage?: string;
    namePlaceholder?: string;
    phonePlaceholder?: string;
    emailPlaceholder?: string;
    notePlaceholder?: string;
    showroomLabel?: string;
    hotlineLabel?: string;
    openingHoursLabel?: string;
    emailLabel?: string;
    locationImageAlt?: string;
  };
  catalog: {
    listingEyebrow?: string;
    listingTitle?: string;
    listingSubtitle?: string;
    listingAdvisorTitle?: string;
    listingAdvisorBody?: string;
    listingLoadingText?: string;
    listingErrorText?: string;
    listingRetryLabel?: string;
    detailLoadingText?: string;
    detailErrorText?: string;
    detailNotFoundText?: string;
    detailCtaLabel?: string;
    detailBackLabel?: string;
    listingLabels?: {
      featured360Label?: string;
      exploreLabel?: string;
      productCountLabel?: string;
      collectionCountLabel?: string;
      glazeCountLabel?: string;
      filterTitle?: string;
      resetLabel?: string;
      collectionFilterLabel?: string;
      typeFilterLabel?: string;
      glazeFilterLabel?: string;
      priceFilterLabel?: string;
      statusFilterLabel?: string;
      status360Label?: string;
      statusNewLabel?: string;
      statusLimitedLabel?: string;
      statusBestSellerLabel?: string;
      sortLabel?: string;
      sortFeaturedLabel?: string;
      sortNewestLabel?: string;
      sortPriceAscLabel?: string;
      sortPriceDescLabel?: string;
      sort360Label?: string;
      badgeNewLabel?: string;
      badgeLimitedLabel?: string;
      badgeBestSellerLabel?: string;
      quickViewLabel?: string;
      experience360Label?: string;
      detailLabel?: string;
      emptyTitle?: string;
      emptyBody?: string;
      emptyResetLabel?: string;
      advisorCtaLabel?: string;
      applyFilterLabel?: string;
      consultationLabel?: string;
      footerTemplate?: string;
    };
    detailLabels?: {
      loadingSubtitle?: string;
      specsTitle?: string;
      contactTitle?: string;
      directChatLabel?: string;
      namePlaceholder?: string;
      phonePlaceholder?: string;
      emailPlaceholder?: string;
      notePlaceholder?: string;
      submitLabel?: string;
      submittingLabel?: string;
      successTemplate?: string;
      errorMessage?: string;
      view360Title?: string;
      view360Note?: string;
      exit3dLabel?: string;
      fullscreen3dLabel?: string;
      productInfoLabel?: string;
      imageUpdatingLabel?: string;
      imageLabel?: string;
      viewLabel?: string;
      interact3dLabel?: string;
      video360Label?: string;
      variantsTitle?: string;
      storyTitle?: string;
      zaloLabel?: string;
      hotlineLabel?: string;
      emailLabel?: string;
      rfqTitle?: string;
      shortcutVariantLabel?: string;
      shortcutStoryLabel?: string;
      shortcutSpecsLabel?: string;
      shortcutContactLabel?: string;
    };
  };
}

export interface SiteFiltersContract {
  types?: SiteFilterOptionContract[];
  glazes?: SiteFilterOptionContract[];
  priceRanges?: SiteFilterOptionContract[];
}

export interface SiteConfigContract {
  key?: string;
  brandName?: string;
  tagline?: string;
  subtitle?: string;
  founded?: string;
  location?: string;
  contact?: SiteContactContract;
  social?: SiteSocialContract;
  seo?: SiteSeoContract;
  collections?: SiteCollectionContract[];
  occasions?: SiteOccasionContract[];
  journal?: SiteJournalItemContract[];
  filters?: SiteFiltersContract;
  createdAt?: string;
  updatedAt?: string;
}
