import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MONGOOSE_NO_DEFAULT } from '@vt/platform-mongoose';

@Schema({ _id: false })
class BrandContent {
  @Prop()
  name?: string;

  @Prop()
  tagline?: string;

  @Prop()
  subtitle?: string;

  @Prop()
  location?: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  facebookHref?: string;
}

@Schema({ _id: false })
class NavigationItem {
  @Prop({ required: true }) label!: string;
  @Prop({ required: true }) href!: string;
}

@Schema({ _id: false })
class NavigationContent {
  @Prop({ type: [NavigationItem], default: [] })
  items!: NavigationItem[];
}

@Schema({ _id: false })
class NotFoundContent {
  @Prop() eyebrow?: string;
  @Prop() title?: string;
  @Prop() body?: string;
  @Prop() backLabel?: string;
}

@Schema({ _id: false })
class HomeContent {
  @Prop()
  heroTitle?: string;

  @Prop()
  heroSubtitle?: string;

  @Prop()
  heroBody?: string;

  @Prop()
  heroCtaLabel?: string;

  @Prop()
  heroCtaHref?: string;

  @Prop()
  heroBg?: string;

  @Prop()
  heroModelUrl?: string;

  @Prop()
  heroModelPoster?: string;

  @Prop()
  heroReferenceImage?: string;

  @Prop()
  introSkipLabel?: string;

  @Prop()
  logoSubtext?: string;

  @Prop()
  languageLabel?: string;

  @Prop()
  scrollHintLabel?: string;

  @Prop()
  heroModelAlt?: string;

  @Prop()
  interactionHint?: string;

  @Prop({ type: [String], default: [] })
  interactionFeatures!: string[];

  @Prop()
  heritageEyebrow?: string;

  @Prop()
  heritageTitle?: string;

  @Prop()
  heritageBody?: string;

  @Prop()
  heritageCtaLabel?: string;

  @Prop()
  heritageCtaHref?: string;

  @Prop()
  collectionEyebrow?: string;

  @Prop()
  collectionTitle?: string;

  @Prop()
  collectionCtaLabel?: string;

  @Prop()
  collectionCtaHref?: string;

  @Prop()
  footerCopyright?: string;

  @Prop({ type: [{ img: String, title: String, sub: String, href: String }], default: [] })
  collections!: { img: string; title: string; sub: string; href: string }[];

  @Prop({ type: [{ img: String, title: String, desc: String, position: String }], default: [] })
  process!: { img: string; title: string; desc: string; position: string }[];

  @Prop({ type: [{ title: String, desc: String }], default: [] })
  promises!: { title: string; desc: string }[];
}

@Schema({ _id: false })
class AboutContent {
  @Prop()
  heroEyebrow?: string;

  @Prop()
  heroTitle?: string;

  @Prop()
  heroDesc?: string;

  @Prop()
  heroBg?: string;

  @Prop()
  quoteText?: string;

  @Prop()
  quoteAuthor?: string;

  @Prop()
  quoteBg?: string;

  @Prop()
  heroCtaLabel?: string;

  @Prop()
  heroCtaHref?: string;

  @Prop()
  heroImageAlt?: string;

  @Prop({ type: [{ id: String, title: String, desc: String, img: String, iconType: String, isActive: Boolean }], default: [] })
  elements!: { id: string; title: string; desc: string; img: string; iconType: string; isActive: boolean }[];
}

@Schema({ _id: false })
class CollectionsRows {
  @Prop({ type: [{ id: String, title: String, desc: String, img: String, href: String, span: Number }], default: [] })
  row1!: { id: string; title: string; desc: string; img: string; href: string; span: number }[];

  @Prop({ type: [{ id: String, title: String, desc: String, img: String, href: String, span: Number }], default: [] })
  row2!: { id: string; title: string; desc: string; img: string; href: string; span: number }[];

  @Prop({ type: [{ id: String, title: String, desc: String, img: String, href: String, span: Number }], default: [] })
  row3!: { id: string; title: string; desc: string; img: string; href: string; span: number }[];
}

@Schema({ _id: false })
class CollectionsContent {
  @Prop()
  heroEyebrow?: string;

  @Prop()
  heroTitle?: string;

  @Prop()
  heroDesc?: string;

  @Prop()
  heroBg?: string;

  @Prop()
  heroCtaLabel?: string;

  @Prop()
  heroCtaHref?: string;

  @Prop()
  tileCtaLabel?: string;

  @Prop({ type: CollectionsRows, default: () => ({ row1: [], row2: [], row3: [] }) })
  rows!: CollectionsRows;
}

@Schema({ _id: false })
class ProductsLandingContent {
  @Prop()
  heroTitle?: string;

  @Prop()
  heroSubtitle?: string;

  @Prop()
  heroDesc?: string;

  @Prop()
  badgeText?: string;

  @Prop()
  heroBg?: string;

  @Prop()
  featuredSectionLabel?: string;

  @Prop({ type: [{ iconType: String, title: String, desc: String }], default: [] })
  productFeatures!: { iconType: string; title: string; desc: string }[];

  @Prop({ type: [{ iconType: String, title: String, desc: String }], default: [] })
  trustBadges!: { iconType: string; title: string; desc: string }[];

  @Prop({ type: [{ id: String, title: String, desc: String, img: String, href: String }], default: [] })
  categories!: { id: string; title: string; desc: string; img: string; href: string }[];
}

@Schema({ _id: false })
class NewsLandingContent {
  @Prop()
  heroEyebrow?: string;

  @Prop()
  heroTitle?: string;

  @Prop()
  heroDesc?: string;

  @Prop()
  featuredId?: string;

  @Prop()
  featuredLabel?: string;

  @Prop()
  allCategoryLabel?: string;

  @Prop()
  emptyStateLabel?: string;

  @Prop()
  readArticleLabel?: string;

  @Prop()
  backToNewsLabel?: string;

  @Prop()
  relatedTitle?: string;

  @Prop()
  notFoundTitle?: string;

  @Prop()
  notFoundBody?: string;

  @Prop({
    type: [{
      id: String,
      name: String,
      slug: String,
    }],
    default: [],
  })
  categories?: {
    id: string;
    name: string;
    slug: string;
  }[];

  @Prop({
    type: [{
      id: String,
      slug: String,
      category: String,
      date: String,
      title: String,
      excerpt: String,
      image: String,
      author: String,
      readingTime: String,
      content: String,
    }],
    default: [],
  })
  newsCards!: {
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
}

@Schema({ _id: false })
class ArtisansContent {
  @Prop() eyebrow?: string;
  @Prop() title?: string;
  @Prop() desc?: string;
  @Prop() loadingText?: string;
  @Prop() errorTitle?: string;
  @Prop() errorText?: string;
  @Prop() retryLabel?: string;
  @Prop() emptyText?: string;
  @Prop() notFoundTitle?: string;
  @Prop() notFoundBody?: string;
  @Prop() backLabel?: string;
  @Prop() profileCtaLabel?: string;
  @Prop() experienceLabel?: string;
  @Prop() bioTitle?: string;
  @Prop() lineageTitle?: string;
  @Prop() workshopTitle?: string;
  @Prop() certificationsTitle?: string;
  @Prop() contactTitle?: string;
  @Prop() contactBody?: string;
  @Prop() phoneCtaLabel?: string;
  @Prop() emailCtaLabel?: string;
}

@Schema({ _id: false })
class ContactContent {
  @Prop()
  heroTitle?: string;

  @Prop()
  heroDesc?: string;

  @Prop()
  openingHours?: string;

  @Prop()
  locationBandImage?: string;

  @Prop()
  mapCtaLabel?: string;

  @Prop()
  mapCtaHref?: string;

  @Prop()
  heroBg?: string;

  @Prop()
  formTitle?: string;

  @Prop()
  submitLabel?: string;

  @Prop()
  submittingLabel?: string;

  @Prop()
  successMessage?: string;

  @Prop()
  successResetLabel?: string;

  @Prop()
  errorMessage?: string;

  @Prop()
  namePlaceholder?: string;

  @Prop()
  phonePlaceholder?: string;

  @Prop()
  emailPlaceholder?: string;

  @Prop()
  notePlaceholder?: string;

  @Prop()
  showroomLabel?: string;

  @Prop()
  hotlineLabel?: string;

  @Prop()
  openingHoursLabel?: string;

  @Prop()
  emailLabel?: string;

  @Prop()
  locationImageAlt?: string;
}

@Schema({ _id: false })
class CatalogListingLabels {
  @Prop() featured360Label?: string;
  @Prop() exploreLabel?: string;
  @Prop() productCountLabel?: string;
  @Prop() collectionCountLabel?: string;
  @Prop() glazeCountLabel?: string;
  @Prop() filterTitle?: string;
  @Prop() resetLabel?: string;
  @Prop() collectionFilterLabel?: string;
  @Prop() typeFilterLabel?: string;
  @Prop() glazeFilterLabel?: string;
  @Prop() priceFilterLabel?: string;
  @Prop() statusFilterLabel?: string;
  @Prop() status360Label?: string;
  @Prop() statusNewLabel?: string;
  @Prop() statusLimitedLabel?: string;
  @Prop() statusBestSellerLabel?: string;
  @Prop() sortLabel?: string;
  @Prop() sortFeaturedLabel?: string;
  @Prop() sortNewestLabel?: string;
  @Prop() sortPriceAscLabel?: string;
  @Prop() sortPriceDescLabel?: string;
  @Prop() sort360Label?: string;
  @Prop() badgeNewLabel?: string;
  @Prop() badgeLimitedLabel?: string;
  @Prop() badgeBestSellerLabel?: string;
  @Prop() quickViewLabel?: string;
  @Prop() experience360Label?: string;
  @Prop() detailLabel?: string;
  @Prop() emptyTitle?: string;
  @Prop() emptyBody?: string;
  @Prop() emptyResetLabel?: string;
  @Prop() advisorCtaLabel?: string;
  @Prop() applyFilterLabel?: string;
  @Prop() consultationLabel?: string;
  @Prop() footerTemplate?: string;
}

@Schema({ _id: false })
class CatalogDetailLabels {
  @Prop() loadingSubtitle?: string;
  @Prop() specsTitle?: string;
  @Prop() contactTitle?: string;
  @Prop() directChatLabel?: string;
  @Prop() namePlaceholder?: string;
  @Prop() phonePlaceholder?: string;
  @Prop() emailPlaceholder?: string;
  @Prop() notePlaceholder?: string;
  @Prop() submitLabel?: string;
  @Prop() submittingLabel?: string;
  @Prop() successTemplate?: string;
  @Prop() errorMessage?: string;
  @Prop() view360Title?: string;
  @Prop() view360Note?: string;
  @Prop() exit3dLabel?: string;
  @Prop() fullscreen3dLabel?: string;
  @Prop() productInfoLabel?: string;
  @Prop() imageUpdatingLabel?: string;
  @Prop() imageLabel?: string;
  @Prop() viewLabel?: string;
  @Prop() interact3dLabel?: string;
  @Prop() video360Label?: string;
  @Prop() variantsTitle?: string;
  @Prop() storyTitle?: string;
  @Prop() zaloLabel?: string;
  @Prop() hotlineLabel?: string;
  @Prop() emailLabel?: string;
  @Prop() rfqTitle?: string;
  @Prop() shortcutVariantLabel?: string;
  @Prop() shortcutStoryLabel?: string;
  @Prop() shortcutSpecsLabel?: string;
  @Prop() shortcutContactLabel?: string;
}

@Schema({ _id: false })
class CatalogContent {
  @Prop()
  listingEyebrow?: string;

  @Prop()
  listingTitle?: string;

  @Prop()
  listingSubtitle?: string;

  @Prop()
  listingAdvisorTitle?: string;

  @Prop()
  listingAdvisorBody?: string;

  @Prop()
  listingLoadingText?: string;

  @Prop()
  listingErrorText?: string;

  @Prop()
  listingRetryLabel?: string;

  @Prop()
  detailLoadingText?: string;

  @Prop()
  detailErrorText?: string;

  @Prop()
  detailNotFoundText?: string;

  @Prop()
  detailCtaLabel?: string;

  @Prop()
  detailBackLabel?: string;

  @Prop({ type: CatalogListingLabels, default: MONGOOSE_NO_DEFAULT })
  listingLabels?: CatalogListingLabels;

  @Prop({ type: CatalogDetailLabels, default: MONGOOSE_NO_DEFAULT })
  detailLabels?: CatalogDetailLabels;
}

@Schema({ collection: 'showroom_v2_content', timestamps: true })
export class ShowroomV2Content {
  @Prop({ required: true, unique: true })
  key!: string;

  @Prop()
  contentVersion?: number;

  @Prop({ type: BrandContent, required: true, default: MONGOOSE_NO_DEFAULT })
  brand!: BrandContent;

  @Prop({ type: NavigationContent, required: true, default: MONGOOSE_NO_DEFAULT })
  navigation!: NavigationContent;

  @Prop({ type: NotFoundContent, required: true, default: MONGOOSE_NO_DEFAULT })
  notFound!: NotFoundContent;

  @Prop({ type: HomeContent, required: true, default: MONGOOSE_NO_DEFAULT })
  home!: HomeContent;

  @Prop({ type: AboutContent, required: true, default: MONGOOSE_NO_DEFAULT })
  about!: AboutContent;

  @Prop({ type: CollectionsContent, required: true, default: MONGOOSE_NO_DEFAULT })
  collections!: CollectionsContent;

  @Prop({ type: ProductsLandingContent, required: true, default: MONGOOSE_NO_DEFAULT })
  productsLanding!: ProductsLandingContent;

  @Prop({ type: NewsLandingContent, required: true, default: MONGOOSE_NO_DEFAULT })
  newsLanding!: NewsLandingContent;

  @Prop({ type: ArtisansContent, required: true, default: MONGOOSE_NO_DEFAULT })
  artisans!: ArtisansContent;

  @Prop({ type: ContactContent, required: true, default: MONGOOSE_NO_DEFAULT })
  contact!: ContactContent;

  @Prop({ type: CatalogContent, required: true, default: MONGOOSE_NO_DEFAULT })
  catalog!: CatalogContent;
}

export type ShowroomV2ContentDocument = ShowroomV2Content & Document;
export const ShowroomV2ContentSchema = SchemaFactory.createForClass(ShowroomV2Content);
