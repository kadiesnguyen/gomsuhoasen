import React, { useEffect, useState } from 'react';
import { ProductDetailViewer } from '@gomhoasen/ui-showroom';
import { getProduct } from '../data/catalog-api';
import { useShowroomData } from '../data/ShowroomContext';
import { updatePageMetadata } from '../data/page-metadata';
import Link from '../mocks/next/link';

const STATUS_STYLE: React.CSSProperties = {
  minHeight: '60vh',
  display: 'grid',
  placeItems: 'center',
  padding: 'calc(var(--header-height, 72px) + 48px) 24px 64px',
  textAlign: 'center',
  color: '#e6d8c4',
  background: '#080704',
};

const STATUS_INNER_STYLE: React.CSSProperties = {
  maxWidth: '480px',
  display: 'grid',
  gap: '12px',
};

const STATUS_ACTION_STYLE: React.CSSProperties = {
  justifySelf: 'center',
  marginTop: 8,
  padding: '10px 18px',
  border: '1px solid #b8915d',
  color: '#d5c3ad',
  background: 'transparent',
  cursor: 'pointer',
  textDecoration: 'none',
};

const STATUS_HEADING_STYLE: React.CSSProperties = {
  margin: 0,
  fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
  fontWeight: 500,
};

interface ProductDetailPageProps {
  slug: string;
}

type ProductDetailData = NonNullable<Awaited<ReturnType<typeof getProduct>>>;

export function ProductDetailPage({ slug }: ProductDetailPageProps) {
  const { brand, catalogUx, productsLandingInfo } = useShowroomData();
  const [data, setData] = useState<ProductDetailData | null>(null);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    setData(null);
    setMessage('');
    setLoadError(false);

    getProduct(slug)
      .then((resolved) => {
        if (!mounted) return;
        if (!resolved) {
          setMessage(catalogUx.detailNotFoundText);
          return;
        }
        setData(resolved);
      })
      .catch(() => {
        if (mounted) setLoadError(true);
      });

    return () => {
      mounted = false;
    };
  }, [catalogUx.detailNotFoundText, reloadKey, slug]);

  useEffect(() => {
    const title = data?.name || message || (loadError ? catalogUx.detailErrorText : catalogUx.detailLoadingText);
    updatePageMetadata({
      title: `${title} | ${brand.name}`,
      description: data?.description ?? productsLandingInfo.desc,
      path: `/san-pham/${slug}`,
      image: data?.poster,
    });
  }, [
    brand.name,
    catalogUx.detailLoadingText,
    data,
    loadError,
    message,
    productsLandingInfo.desc,
    slug,
  ]);

  if (message || loadError) {
    return (
      <div style={STATUS_STYLE}>
        <div style={STATUS_INNER_STYLE}>
          <strong>{brand.name}</strong>
          <h1 style={STATUS_HEADING_STYLE}>
            {loadError ? catalogUx.detailErrorText : message}
          </h1>
          {loadError ? (
            <button
              type="button"
              style={STATUS_ACTION_STYLE}
              onClick={() => setReloadKey((value) => value + 1)}
            >
              {catalogUx.listingRetryLabel}
            </button>
          ) : (
            <Link
              href="/danh-muc"
              style={STATUS_ACTION_STYLE}
            >
              {catalogUx.detailBackLabel}
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={STATUS_STYLE}>
        <div style={STATUS_INNER_STYLE}>
          <strong>{brand.name}</strong>
          <h1 style={STATUS_HEADING_STYLE}>{catalogUx.detailLoadingText}</h1>
        </div>
      </div>
    );
  }

  const hasPrice =
    (typeof data.referencePrice === 'number' &&
      Number.isFinite(data.referencePrice) &&
      data.referencePrice > 0) ||
    Boolean(
      data.priceLabel?.trim() &&
        !/liên\s*hệ|contact|tư\s*vấn/i.test(data.priceLabel.trim()),
    );

  return (
    <ProductDetailViewer
      productId={data.id}
      productSlug={slug}
      productName={data.name}
      brandName={data.brandName}
      productSubtitle={data.tagline}
      modelUrl={data.modelUrl}
      video360Url={data.video360Url}
      posterUrl={data.poster}
      images={data.images}
      viewSections={data.viewSections}
      variants={data.variants}
      specs={data.specs}
      story={data.story ?? undefined}
      referencePrice={data.referencePrice}
      priceLabel={data.priceLabel}
      cta={{
        ...data.cta,
        label: hasPrice
          ? 'Đặt mua sản phẩm'
          : (catalogUx.detailCtaLabel || 'Tư vấn đặt hàng'),
      }}
      copy={data.copy}
    />
  );
}
