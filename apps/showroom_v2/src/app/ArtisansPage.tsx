import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Award, Mail, MapPin, Phone, Sparkles } from 'lucide-react';
import { resolveApiOrigin, toAssetUrl } from '@gomhoasen/contracts';
import { useShowroomData } from './data/ShowroomContext';
import {
  getPublicArtisan,
  getPublicArtisans,
  type ShowroomArtisan,
} from './data/artisan-api';
import { updatePageMetadata } from './data/page-metadata';
import Link from './mocks/next/link';
import './artisans-page.css';
import { RichHtml } from './components/RichHtml';
import { stripRichHtml } from '@gomhoasen/ui-showroom';

const API_ORIGIN = resolveApiOrigin();

function mediaUrl(value: string) {
  return value ? toAssetUrl(value, API_ORIGIN) : '';
}

function profileHref(artisan: ShowroomArtisan) {
  return `/nghe-nhan/${artisan.slug}`;
}

export function ArtisansPage() {
  const { artisansLanding } = useShowroomData();
  const [artisans, setArtisans] = useState<ShowroomArtisan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError(false);
    getPublicArtisans()
      .then((items) => {
        if (mounted) setArtisans(items);
      })
      .catch(() => {
        if (mounted) setLoadError(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  return (
    <div className="artisans-page">
      <header className="artisans-header">
        <span>{artisansLanding.eyebrow}</span>
        <h1>{artisansLanding.title}</h1>
        <RichHtml value={artisansLanding.desc} as="p" />
      </header>

      <section className="artisans-list" aria-live="polite">
        {loading ? (
          <div className="artisans-state">{artisansLanding.loadingText}</div>
        ) : loadError ? (
          <div className="artisans-state" role="alert">
            <p>{artisansLanding.errorText}</p>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
              {artisansLanding.retryLabel}
            </button>
          </div>
        ) : artisans.length === 0 ? (
          <div className="artisans-state">{artisansLanding.emptyText}</div>
        ) : (
          artisans.map((artisan) => {
            const plainBio = stripRichHtml(artisan.bio);
            return (
            <Link key={artisan.id} href={profileHref(artisan)} className="artisan-card">
              <div className="artisan-card-media">
                {artisan.avatar ? (
                  <img src={mediaUrl(artisan.avatar)} alt={artisan.name} />
                ) : (
                  <span aria-hidden="true">{artisan.name.charAt(0)}</span>
                )}
              </div>
              <div className="artisan-card-content">
                <span className="artisan-card-eyebrow">{artisan.specialty || artisan.title}</span>
                <h2>{artisan.name}</h2>
                {plainBio && <p>{plainBio.slice(0, 160)}{plainBio.length > 160 ? '…' : ''}</p>}
                <div className="artisan-card-meta">
                  {artisan.yearsExperience && (
                    <span>
                      <Award size={14} aria-hidden="true" />
                      {artisan.yearsExperience} {artisansLanding.experienceLabel}
                    </span>
                  )}
                  {artisan.location && (
                    <span>
                      <MapPin size={14} aria-hidden="true" />
                      {artisan.location}
                    </span>
                  )}
                </div>
                <span className="artisan-card-cta">
                  {artisansLanding.profileCtaLabel}
                  <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>
            </Link>
            );
          })
        )}
      </section>
    </div>
  );
}

export function ArtisanDetailPage({ slug }: { slug: string }) {
  const { brand, artisansLanding } = useShowroomData();
  const [artisan, setArtisan] = useState<ShowroomArtisan | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError(false);
    getPublicArtisan(slug)
      .then((item) => {
        if (mounted) setArtisan(item);
      })
      .catch(() => {
        if (mounted) setLoadError(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [reloadKey, slug]);

  useEffect(() => {
    const title = artisan?.name ?? artisansLanding.notFoundTitle;
    updatePageMetadata({
      title: `${title} | ${brand.name}`,
      description: stripRichHtml(artisan?.bio || artisansLanding.desc),
      path: `/nghe-nhan/${slug}`,
      image: artisan ? artisan.coverImage || artisan.avatar : undefined,
    });
  }, [artisan, artisansLanding.desc, artisansLanding.notFoundTitle, brand.name, slug]);

  if (loading) {
    return <div className="artisan-detail-state">{artisansLanding.loadingText}</div>;
  }

  if (loadError) {
    return (
      <section className="artisan-detail-state" role="alert">
        <div>
          <h1>{artisansLanding.errorTitle}</h1>
          <p>{artisansLanding.errorText}</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
            {artisansLanding.retryLabel}
          </button>
        </div>
      </section>
    );
  }

  if (!artisan) {
    return (
      <section className="artisan-detail-state" aria-labelledby="artisan-not-found-title">
        <div>
          <h1 id="artisan-not-found-title">{artisansLanding.notFoundTitle}</h1>
          <RichHtml value={artisansLanding.notFoundBody} as="div" />
          <Link href="/nghe-nhan">
            <ArrowLeft size={15} aria-hidden="true" />
            {artisansLanding.backLabel}
          </Link>
        </div>
      </section>
    );
  }

  const phone = artisan.phone || brand.phone;
  const email = artisan.email.includes('@')
    ? artisan.email
    : brand.email.includes('@')
      ? brand.email
      : '';
  const heroImage = artisan.coverImage || artisan.avatar;

  return (
    <article className="artisan-detail-page">
      <header className="artisan-detail-hero">
        {heroImage && <img src={mediaUrl(heroImage)} alt={artisan.name} />}
        <div className="artisan-detail-overlay" aria-hidden="true" />
        <div className="artisan-detail-hero-content">
          <Link href="/nghe-nhan" className="artisan-back">
            <ArrowLeft size={15} aria-hidden="true" />
            {artisansLanding.backLabel}
          </Link>
          <span>{artisan.specialty || artisan.title}</span>
          <h1>{artisan.name}</h1>
          <div className="artisan-detail-meta">
            {artisan.yearsExperience && (
              <span>
                <Award size={15} aria-hidden="true" />
                {artisan.yearsExperience} {artisansLanding.experienceLabel}
              </span>
            )}
            {artisan.location && (
              <span>
                <MapPin size={15} aria-hidden="true" />
                {artisan.location}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="artisan-detail-content">
        {artisan.bio && (
          <section>
            <h2>{artisansLanding.bioTitle}</h2>
            <RichHtml value={artisan.bio} />
          </section>
        )}
        {artisan.lineage && (
          <section>
            <h2>{artisansLanding.lineageTitle}</h2>
            <p>{artisan.lineage}</p>
          </section>
        )}
        {artisan.workshop && (
          <section>
            <h2>{artisansLanding.workshopTitle}</h2>
            <p>{artisan.workshop}</p>
          </section>
        )}
        {artisan.certifications.length > 0 && (
          <section>
            <h2>{artisansLanding.certificationsTitle}</h2>
            <ul className="artisan-certifications">
              {artisan.certifications.map((item) => (
                <li key={item}>
                  <Sparkles size={15} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="artisan-contact">
          <h2>{artisansLanding.contactTitle}</h2>
          <RichHtml value={artisansLanding.contactBody} />
          <div>
            {phone && (
              <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
                <Phone size={16} aria-hidden="true" />
                {artisansLanding.phoneCtaLabel}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="is-secondary">
                <Mail size={16} aria-hidden="true" />
                {artisansLanding.emailCtaLabel}
              </a>
            )}
          </div>
        </section>
      </div>
    </article>
  );
}
