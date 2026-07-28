'use client';

// F8: Artisan detail screen — /nghe-nhan/[slug]

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GHS_API, resolveApiOrigin, toAssetUrl } from '@gomhoasen/contracts';
import css from './artisan-detail-screen.module.css';
import { toRenderableRichHtml } from './rich-html';
import { showroomApiGet } from './showroom-api-client';
import { readShowroomDisplayText, readShowroomText } from './showroom-display-normalization';

interface ArtisanDetail {
  _id: string;
  name: string;
  slug: string;
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

const API_ORIGIN = resolveApiOrigin();


export interface ArtisanDetailScreenProps {
  slug: string;
  initialData?: ArtisanDetail;
}

export function ArtisanDetailScreen({ slug, initialData }: ArtisanDetailScreenProps) {
  const currentYear = new Date().getFullYear();
  const [artisan, setArtisan] = useState<ArtisanDetail | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (initialData) return;
    showroomApiGet<ArtisanDetail>(GHS_API.ARTISAN.PUBLIC_BY_SLUG(slug))
      .then((data) => setArtisan(data))
      .catch(() => setError('Không tìm thấy nghệ nhân.'))
      .finally(() => setLoading(false));
  }, [slug, initialData]);

  if (loading) {
    return (
      <div className={css.page}>
        <div className={css.loading}><div className={css.spinner} /><span>Đang tải...</span></div>
      </div>
    );
  }

  if (error || !artisan) {
    return (
      <div className={css.page}>
        <div className={css.error}>
          <div className={css.errorIcon}>🏺</div>
          <h2>{readShowroomDisplayText(error, 'Không tìm thấy')}</h2>
          <Link href="/nghe-nhan" className={css.backLink}>← Quay lại danh sách nghệ nhân</Link>
        </div>
      </div>
    );
  }

  const artisanAvatar = readShowroomText(artisan.avatar);
  const artisanTitle = readShowroomText(artisan.title);
  const artisanLocation = readShowroomText(artisan.location);
  const artisanSpecialty = readShowroomText(artisan.specialty);
  const artisanBio = readShowroomText(artisan.bio);
  const artisanLineage = readShowroomText(artisan.lineage);
  const artisanWorkshop = readShowroomText(artisan.workshop);
  const artisanPhone = readShowroomText(artisan.phone);
  const artisanEmail = readShowroomText(artisan.email);
  return (
    <div className={css.page}>
      {/* Nav */}
      <nav className={css.nav}>
        <Link href="/" className={css.navBrand}>
          <span>GỐM HOA SEN</span>
        </Link>
        <div className={css.navLinks}>
          <Link href="/san-pham" className={css.navLink}>Sản phẩm</Link>
          <Link href="/nghe-nhan" className={`${css.navLink} ${css.navLinkActive}`}>Nghệ nhân</Link>
        </div>
        <button className={css.navMenu} onClick={() => setMenuOpen(true)} aria-label="Mở menu" type="button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className={css.menuOverlay}>
          <button className={css.menuClose} onClick={() => setMenuOpen(false)} type="button">✕</button>
          <Link href="/" onClick={() => setMenuOpen(false)} className={css.menuLink}>Trang chủ</Link>
          <Link href="/san-pham" onClick={() => setMenuOpen(false)} className={css.menuLink}>Sản phẩm</Link>
          <Link href="/nghe-nhan" onClick={() => setMenuOpen(false)} className={css.menuLinkActive}>Nghệ nhân</Link>
        </div>
      )}

      {/* Hero with cover/avatar */}
      <section className={css.hero}>
        <div className={css.heroOverlay} />
        <div className={css.heroContent}>
          <div className={css.avatar}>
            {artisanAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={toAssetUrl(artisanAvatar, API_ORIGIN)} alt={artisan.name} />
            ) : (
              <div className={css.avatarFallback}>{artisan.name.charAt(0)}</div>
            )}
          </div>
          <h1 className={css.heroName}>{artisan.name}</h1>
          {artisanTitle && <div className={css.heroTitle}>{artisanTitle}</div>}
          <div className={css.heroMeta}>
            {artisan.yearsExperience && <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:'4px'}}><path d="M12 2v10l4.24 4.24" /><circle cx="12" cy="12" r="10" /></svg> {artisan.yearsExperience} năm kinh nghiệm</span>}
            {artisanLocation && <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:'4px'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg> {artisanLocation}</span>}
            {artisanSpecialty && <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:'4px'}}><path d="M12 2l3 6 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1 3-6z" /></svg> {artisanSpecialty}</span>}
          </div>
        </div>
      </section>

      {/* Content */}
      <div className={css.content}>
        {/* Bio */}
        {artisanBio && (
          <section className={css.section}>
            <h2 className={css.sectionTitle}>Tiểu sử</h2>
            <div
              className={`${css.bio} ${css.richHtml}`}
              dangerouslySetInnerHTML={{ __html: toRenderableRichHtml(artisanBio) }}
            />
          </section>
        )}

        {/* Lineage */}
        {artisanLineage && (
          <section className={css.section}>
            <h2 className={css.sectionTitle}>Dòng dõi & Truyền thống</h2>
            <p className={css.bio}>{artisanLineage}</p>
          </section>
        )}

        {/* Workshop */}
        {artisanWorkshop && (
          <section className={css.section}>
            <h2 className={css.sectionTitle}>Xưởng gốm</h2>
            <p className={css.bio}>{artisanWorkshop}</p>
          </section>
        )}

        {/* Certifications */}
        {artisan.certifications && artisan.certifications.length > 0 && (
          <section className={css.section}>
            <h2 className={css.sectionTitle}>Chứng nhận & Danh hiệu</h2>
            <ul className={css.certList}>
              {artisan.certifications.map((c, i) => (
                <li key={i} className={css.certItem}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:'8px', color:'var(--heritage-gold)'}}><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg> {c}</li>
              ))}
            </ul>
          </section>
        )}

        {/* CTA */}
        <section className={css.ctaSection}>
          <h2 className={css.ctaTitle}>Liên hệ tư vấn tác phẩm</h2>
          <p className={css.ctaDesc}>
            Bạn muốn đặt tác phẩm riêng từ nghệ nhân {artisan.name}? Liên hệ để được tư vấn.
          </p>
          <div className={css.ctaButtons}>
            {artisanPhone && (
              <a href={`tel:${artisanPhone}`} className={css.ctaBtn}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:'8px'}}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg> Gọi ngay</a>
            )}
            {artisanEmail && (
              <a href={`mailto:${artisanEmail}`} className={css.ctaBtnOutline}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:'8px'}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg> Gửi email</a>
            )}
          </div>
        </section>

        <Link href="/nghe-nhan" className={css.backLink}>← Quay lại danh sách nghệ nhân</Link>
      </div>

      <footer className={css.footer}>
        <p>© {currentYear} Gốm Hoa Sen. Tất cả quyền được bảo lưu.</p>
      </footer>
    </div>
  );
}
