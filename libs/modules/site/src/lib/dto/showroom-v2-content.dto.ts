import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class HomeCollectionDto {
  @IsString() img!: string;
  @IsString() title!: string;
  @IsString() sub!: string;
  @IsString() href!: string;
}

export class HomeProcessDto {
  @IsString() img!: string;
  @IsString() title!: string;
  @IsString() desc!: string;
  @IsString() position!: string;
}

export class HomePromiseDto {
  @IsString() title!: string;
  @IsString() desc!: string;
}

export class BrandContentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  tagline?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  facebookHref?: string;
}

export class NavigationItemDto {
  @IsString() label!: string;
  @IsString() href!: string;
}

export class NavigationContentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NavigationItemDto)
  items!: NavigationItemDto[];
}

export class NotFoundContentDto {
  @IsOptional() @IsString() eyebrow?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() backLabel?: string;
}

export class HomeContentDto {
  @IsString()
  @IsOptional()
  heroTitle?: string;

  @IsString()
  @IsOptional()
  heroSubtitle?: string;

  @IsString()
  @IsOptional()
  heroBody?: string;

  @IsString()
  @IsOptional()
  heroCtaLabel?: string;

  @IsString()
  @IsOptional()
  heroCtaHref?: string;

  @IsString()
  @IsOptional()
  heroBg?: string;

  @IsString()
  @IsOptional()
  heroModelUrl?: string;

  @IsString()
  @IsOptional()
  heroModelPoster?: string;

  @IsString()
  @IsOptional()
  heroReferenceImage?: string;

  @IsString()
  @IsOptional()
  introSkipLabel?: string;

  @IsString()
  @IsOptional()
  logoSubtext?: string;

  @IsString()
  @IsOptional()
  languageLabel?: string;

  @IsString()
  @IsOptional()
  scrollHintLabel?: string;

  @IsString()
  @IsOptional()
  heroModelAlt?: string;

  @IsString()
  @IsOptional()
  interactionHint?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  interactionFeatures?: string[];

  @IsString()
  @IsOptional()
  heritageEyebrow?: string;

  @IsString()
  @IsOptional()
  heritageTitle?: string;

  @IsString()
  @IsOptional()
  heritageBody?: string;

  @IsString()
  @IsOptional()
  heritageCtaLabel?: string;

  @IsString()
  @IsOptional()
  heritageCtaHref?: string;

  @IsString()
  @IsOptional()
  collectionEyebrow?: string;

  @IsString()
  @IsOptional()
  collectionTitle?: string;

  @IsString()
  @IsOptional()
  collectionCtaLabel?: string;

  @IsString()
  @IsOptional()
  collectionCtaHref?: string;

  @IsString()
  @IsOptional()
  footerCopyright?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HomeCollectionDto)
  collections!: HomeCollectionDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => HomeProcessDto)
  process!: HomeProcessDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => HomePromiseDto)
  promises!: HomePromiseDto[];
}

export class AboutElementDto {
  @IsString() id!: string;
  @IsString() title!: string;
  @IsString() desc!: string;
  @IsString() img!: string;
  @IsString() iconType!: string;
  @IsBoolean() isActive!: boolean;
}

export class AboutContentDto {
  @IsString()
  @IsOptional()
  heroEyebrow?: string;

  @IsString()
  @IsOptional()
  heroTitle?: string;

  @IsString()
  @IsOptional()
  heroDesc?: string;

  @IsString()
  @IsOptional()
  heroBg?: string;

  @IsString()
  @IsOptional()
  quoteText?: string;

  @IsString()
  @IsOptional()
  quoteAuthor?: string;

  @IsString()
  @IsOptional()
  quoteBg?: string;

  @IsString()
  @IsOptional()
  heroCtaLabel?: string;

  @IsString()
  @IsOptional()
  heroCtaHref?: string;

  @IsString()
  @IsOptional()
  heroImageAlt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AboutElementDto)
  elements!: AboutElementDto[];
}

export class CollectionRowItemDto {
  @IsString() id!: string;
  @IsString() title!: string;
  @IsString() desc!: string;
  @IsString() img!: string;
  @IsString() href!: string;
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  span!: number;
}

export class CollectionsRowsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CollectionRowItemDto)
  row1!: CollectionRowItemDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => CollectionRowItemDto)
  row2!: CollectionRowItemDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => CollectionRowItemDto)
  row3!: CollectionRowItemDto[];
}

export class CollectionsContentDto {
  @IsString()
  @IsOptional()
  heroEyebrow?: string;

  @IsString()
  @IsOptional()
  heroTitle?: string;

  @IsString()
  @IsOptional()
  heroDesc?: string;

  @IsString()
  @IsOptional()
  heroBg?: string;

  @IsString()
  @IsOptional()
  heroCtaLabel?: string;

  @IsString()
  @IsOptional()
  heroCtaHref?: string;

  @IsString()
  @IsOptional()
  tileCtaLabel?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CollectionsRowsDto)
  rows!: CollectionsRowsDto;
}

export class ProductCategoryDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  img?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  desc?: string;

  @IsString()
  @IsOptional()
  href?: string;
}

export class IconTextItemDto {
  @IsString() @IsOptional() iconType?: string;
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() desc?: string;
}

export class ProductsLandingContentDto {
  @IsString()
  @IsOptional()
  heroTitle?: string;

  @IsString()
  @IsOptional()
  heroSubtitle?: string;

  @IsString()
  @IsOptional()
  heroDesc?: string;

  @IsString()
  @IsOptional()
  badgeText?: string;

  @IsString()
  @IsOptional()
  heroBg?: string;

  @IsString()
  @IsOptional()
  featuredSectionLabel?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IconTextItemDto)
  productFeatures!: IconTextItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IconTextItemDto)
  trustBadges!: IconTextItemDto[];
  
  @IsArray() @ValidateNested({ each: true }) @Type(() => ProductCategoryDto)
  categories!: ProductCategoryDto[];
}

export class NewsCategoryDto {
  @IsString() id!: string;
  @IsString() name!: string;
  @IsString() slug!: string;
}

export class NewsLandingContentDto {
  @IsOptional() @IsString() heroEyebrow?: string;
  @IsOptional() @IsString() heroTitle?: string;
  @IsOptional() @IsString() heroDesc?: string;
  @IsOptional() @IsString() featuredId?: string;
  @IsOptional() @IsString() featuredLabel?: string;
  @IsOptional() @IsString() allCategoryLabel?: string;
  @IsOptional() @IsString() emptyStateLabel?: string;
  @IsOptional() @IsString() readArticleLabel?: string;
  @IsOptional() @IsString() backToNewsLabel?: string;
  @IsOptional() @IsString() relatedTitle?: string;
  @IsOptional() @IsString() notFoundTitle?: string;
  @IsOptional() @IsString() notFoundBody?: string;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => NewsCategoryDto)
  categories?: NewsCategoryDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => NewsCardDto)
  newsCards!: NewsCardDto[];
}

export class NewsCardDto {
  @IsString() id!: string;
  @IsString() slug!: string;
  @IsString() category!: string;
  @IsString() date!: string;
  @IsString() title!: string;
  @IsString() excerpt!: string;
  @IsString() image!: string;
  @IsString() author!: string;
  @IsString() readingTime!: string;
  @IsString() content!: string;
}

export class ArtisansContentDto {
  @IsOptional() @IsString() eyebrow?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() desc?: string;
  @IsOptional() @IsString() loadingText?: string;
  @IsOptional() @IsString() errorTitle?: string;
  @IsOptional() @IsString() errorText?: string;
  @IsOptional() @IsString() retryLabel?: string;
  @IsOptional() @IsString() emptyText?: string;
  @IsOptional() @IsString() notFoundTitle?: string;
  @IsOptional() @IsString() notFoundBody?: string;
  @IsOptional() @IsString() backLabel?: string;
  @IsOptional() @IsString() profileCtaLabel?: string;
  @IsOptional() @IsString() experienceLabel?: string;
  @IsOptional() @IsString() bioTitle?: string;
  @IsOptional() @IsString() lineageTitle?: string;
  @IsOptional() @IsString() workshopTitle?: string;
  @IsOptional() @IsString() certificationsTitle?: string;
  @IsOptional() @IsString() contactTitle?: string;
  @IsOptional() @IsString() contactBody?: string;
  @IsOptional() @IsString() phoneCtaLabel?: string;
  @IsOptional() @IsString() emailCtaLabel?: string;
}

export class ContactContentDto {
  @IsString()
  @IsOptional()
  heroTitle?: string;

  @IsString()
  @IsOptional()
  heroDesc?: string;

  @IsString()
  @IsOptional()
  openingHours?: string;

  @IsString()
  @IsOptional()
  mapCtaHref?: string;

  @IsString()
  @IsOptional()
  mapCtaLabel?: string;

  @IsString()
  @IsOptional()
  locationBandImage?: string;

  @IsString()
  @IsOptional()
  heroBg?: string;

  @IsString()
  @IsOptional()
  formTitle?: string;

  @IsString()
  @IsOptional()
  submitLabel?: string;

  @IsString()
  @IsOptional()
  submittingLabel?: string;

  @IsString()
  @IsOptional()
  successMessage?: string;

  @IsString()
  @IsOptional()
  successResetLabel?: string;

  @IsString()
  @IsOptional()
  errorMessage?: string;

  @IsString()
  @IsOptional()
  namePlaceholder?: string;

  @IsString()
  @IsOptional()
  phonePlaceholder?: string;

  @IsString()
  @IsOptional()
  emailPlaceholder?: string;

  @IsString()
  @IsOptional()
  notePlaceholder?: string;

  @IsString()
  @IsOptional()
  showroomLabel?: string;

  @IsString()
  @IsOptional()
  hotlineLabel?: string;

  @IsString()
  @IsOptional()
  openingHoursLabel?: string;

  @IsString()
  @IsOptional()
  emailLabel?: string;

  @IsString()
  @IsOptional()
  locationImageAlt?: string;
}

export class CatalogListingLabelsDto {
  @IsOptional() @IsString() featured360Label?: string;
  @IsOptional() @IsString() exploreLabel?: string;
  @IsOptional() @IsString() productCountLabel?: string;
  @IsOptional() @IsString() collectionCountLabel?: string;
  @IsOptional() @IsString() glazeCountLabel?: string;
  @IsOptional() @IsString() filterTitle?: string;
  @IsOptional() @IsString() resetLabel?: string;
  @IsOptional() @IsString() collectionFilterLabel?: string;
  @IsOptional() @IsString() typeFilterLabel?: string;
  @IsOptional() @IsString() glazeFilterLabel?: string;
  @IsOptional() @IsString() priceFilterLabel?: string;
  @IsOptional() @IsString() statusFilterLabel?: string;
  @IsOptional() @IsString() status360Label?: string;
  @IsOptional() @IsString() statusNewLabel?: string;
  @IsOptional() @IsString() statusLimitedLabel?: string;
  @IsOptional() @IsString() statusBestSellerLabel?: string;
  @IsOptional() @IsString() sortLabel?: string;
  @IsOptional() @IsString() sortFeaturedLabel?: string;
  @IsOptional() @IsString() sortNewestLabel?: string;
  @IsOptional() @IsString() sortPriceAscLabel?: string;
  @IsOptional() @IsString() sortPriceDescLabel?: string;
  @IsOptional() @IsString() sort360Label?: string;
  @IsOptional() @IsString() badgeNewLabel?: string;
  @IsOptional() @IsString() badgeLimitedLabel?: string;
  @IsOptional() @IsString() badgeBestSellerLabel?: string;
  @IsOptional() @IsString() quickViewLabel?: string;
  @IsOptional() @IsString() experience360Label?: string;
  @IsOptional() @IsString() detailLabel?: string;
  @IsOptional() @IsString() emptyTitle?: string;
  @IsOptional() @IsString() emptyBody?: string;
  @IsOptional() @IsString() emptyResetLabel?: string;
  @IsOptional() @IsString() advisorCtaLabel?: string;
  @IsOptional() @IsString() applyFilterLabel?: string;
  @IsOptional() @IsString() consultationLabel?: string;
  @IsOptional() @IsString() footerTemplate?: string;
}

export class CatalogDetailLabelsDto {
  @IsOptional() @IsString() loadingSubtitle?: string;
  @IsOptional() @IsString() specsTitle?: string;
  @IsOptional() @IsString() contactTitle?: string;
  @IsOptional() @IsString() directChatLabel?: string;
  @IsOptional() @IsString() namePlaceholder?: string;
  @IsOptional() @IsString() phonePlaceholder?: string;
  @IsOptional() @IsString() emailPlaceholder?: string;
  @IsOptional() @IsString() notePlaceholder?: string;
  @IsOptional() @IsString() submitLabel?: string;
  @IsOptional() @IsString() submittingLabel?: string;
  @IsOptional() @IsString() successTemplate?: string;
  @IsOptional() @IsString() errorMessage?: string;
  @IsOptional() @IsString() view360Title?: string;
  @IsOptional() @IsString() view360Note?: string;
  @IsOptional() @IsString() exit3dLabel?: string;
  @IsOptional() @IsString() fullscreen3dLabel?: string;
  @IsOptional() @IsString() productInfoLabel?: string;
  @IsOptional() @IsString() imageUpdatingLabel?: string;
  @IsOptional() @IsString() imageLabel?: string;
  @IsOptional() @IsString() viewLabel?: string;
  @IsOptional() @IsString() interact3dLabel?: string;
  @IsOptional() @IsString() video360Label?: string;
  @IsOptional() @IsString() variantsTitle?: string;
  @IsOptional() @IsString() storyTitle?: string;
  @IsOptional() @IsString() zaloLabel?: string;
  @IsOptional() @IsString() hotlineLabel?: string;
  @IsOptional() @IsString() emailLabel?: string;
  @IsOptional() @IsString() rfqTitle?: string;
  @IsOptional() @IsString() shortcutVariantLabel?: string;
  @IsOptional() @IsString() shortcutStoryLabel?: string;
  @IsOptional() @IsString() shortcutSpecsLabel?: string;
  @IsOptional() @IsString() shortcutContactLabel?: string;
}

export class CatalogContentDto {
  @IsString()
  @IsOptional()
  listingEyebrow?: string;

  @IsString()
  @IsOptional()
  listingTitle?: string;

  @IsString()
  @IsOptional()
  listingSubtitle?: string;

  @IsString()
  @IsOptional()
  listingAdvisorTitle?: string;

  @IsString()
  @IsOptional()
  listingAdvisorBody?: string;

  @IsString()
  @IsOptional()
  listingLoadingText?: string;

  @IsString()
  @IsOptional()
  listingErrorText?: string;

  @IsString()
  @IsOptional()
  listingRetryLabel?: string;

  @IsString()
  @IsOptional()
  detailLoadingText?: string;

  @IsString()
  @IsOptional()
  detailErrorText?: string;

  @IsString()
  @IsOptional()
  detailNotFoundText?: string;

  @IsString()
  @IsOptional()
  detailCtaLabel?: string;

  @IsString()
  @IsOptional()
  detailBackLabel?: string;

  @IsOptional() @IsObject() @ValidateNested() @Type(() => CatalogListingLabelsDto)
  listingLabels?: CatalogListingLabelsDto;

  @IsOptional() @IsObject() @ValidateNested() @Type(() => CatalogDetailLabelsDto)
  detailLabels?: CatalogDetailLabelsDto;
}

export class UpdateShowroomV2ContentDto {
  @IsObject() @ValidateNested() @Type(() => BrandContentDto)
  brand!: BrandContentDto;

  @IsObject() @ValidateNested() @Type(() => NavigationContentDto)
  navigation!: NavigationContentDto;

  @IsObject() @ValidateNested() @Type(() => NotFoundContentDto)
  notFound!: NotFoundContentDto;

  @IsObject() @ValidateNested() @Type(() => HomeContentDto)
  home!: HomeContentDto;

  @IsObject() @ValidateNested() @Type(() => AboutContentDto)
  about!: AboutContentDto;

  @IsObject() @ValidateNested() @Type(() => CollectionsContentDto)
  collections!: CollectionsContentDto;

  @IsObject() @ValidateNested() @Type(() => ProductsLandingContentDto)
  productsLanding!: ProductsLandingContentDto;

  @IsObject() @ValidateNested() @Type(() => NewsLandingContentDto)
  newsLanding!: NewsLandingContentDto;

  @IsObject() @ValidateNested() @Type(() => ArtisansContentDto)
  artisans!: ArtisansContentDto;

  @IsObject() @ValidateNested() @Type(() => ContactContentDto)
  contact!: ContactContentDto;

  @IsObject() @ValidateNested() @Type(() => CatalogContentDto)
  catalog!: CatalogContentDto;
}
