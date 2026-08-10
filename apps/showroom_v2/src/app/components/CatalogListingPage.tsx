import React, { useEffect, useState } from 'react';
import { ListingScreen } from '@gomhoasen/ui-showroom';
import { getListingSiteData } from '../data/catalog-api';
import { useShowroomData } from '../data/ShowroomContext';

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
  marginTop: '8px',
  padding: '10px 18px',
  border: '1px solid rgba(143,115,80,0.48)',
  color: '#d5c3ad',
  background: 'transparent',
  cursor: 'pointer',
};

type ListingData = Awaited<ReturnType<typeof getListingSiteData>>;

export function CatalogListingPage() {
  const { catalogUx, brand } = useShowroomData();
  const [data, setData] = useState<ListingData | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    setError('');
    getListingSiteData()
      .then((resolved) => {
        if (mounted) setData(resolved);
      })
      .catch(() => {
        if (mounted) setError(catalogUx.listingErrorText);
      });
    return () => {
      mounted = false;
    };
  }, [catalogUx.listingErrorText, reloadKey]);

  if (error) {
    return (
      <div style={STATUS_STYLE}>
        <div style={STATUS_INNER_STYLE}>
          <strong>{brand.name}</strong>
          <div>{error}</div>
          <button
            type="button"
            style={STATUS_ACTION_STYLE}
            onClick={() => setReloadKey((value) => value + 1)}
          >
            {catalogUx.listingRetryLabel}
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={STATUS_STYLE}>
        <div style={STATUS_INNER_STYLE}>
          <strong>{brand.name}</strong>
          <div>{catalogUx.listingLoadingText}</div>
        </div>
      </div>
    );
  }

  return <ListingScreen siteData={data} />;
}
