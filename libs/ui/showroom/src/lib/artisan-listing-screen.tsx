'use client';

// F8: Artisan showroom listing page — /nghe-nhan
// Pattern: follows listing-screen.tsx structure

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GHS_API, resolveApiOrigin, toAssetUrl } from '@gomhoasen/contracts';
import css from './artisan-listing-screen.module.css';
import { showroomApiGet } from './showroom-api-client';
import { readShowroomText } from './showroom-display-normalization';

interface ArtisanPayload {
  _id: string;
  name: string;
  slug: string;
  avatar?: string;
  title?: string;
  bio?: string;
  specialty?: string;
  location?: string;
  lineage?: string;
  yearsExperience?: number;
  certifications?: string[];
}

const API_ORIGIN = resolveApiOrigin();


export function ArtisanListingScreen() {
  const currentYear = new Date().getFullYear();
  const [artisans, setArtisans] = useState<ArtisanPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    showroomApiGet<ArtisanPayload[]>(GHS_API.ARTISAN.LIST)
      .then((data) => {
        setArtisans(Array.isArray(data) ? data : []);
      })
      .catch(() => setArtisans([]))
      .finally(() => setLoading(false));
  }, []);

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

      {/* Hero */}
      <section className={css.hero}>
        <h1 className={css.heroTitle}>Nghệ Nhân & Truyền Nhân</h1>
        <p className={css.heroSubtitle}>
          Những bậc thầy gốm sứ — truyền lửa nghề qua nhiều thế hệ, tạo nên linh hồn cho từng tác phẩm.
        </p>
      </section>

      {/* Grid */}
      <section className={css.grid}>
        {loading ? (
          <div className={css.loading}>
            <div className={css.spinner} />
            <span>Đang tải...</span>
          </div>
        ) : artisans.length === 0 ? (
          <div className={css.empty}>
            <div className={css.emptyIcon}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg></div>
            <p>Chưa có thông tin nghệ nhân.</p>
          </div>
        ) : (
          artisans.map((a) => {
            const avatar = readShowroomText(a.avatar);
            const title = readShowroomText(a.title);
            const specialty = readShowroomText(a.specialty);
            const location = readShowroomText(a.location);
            const bio = readShowroomText(a.bio);
            return (
            <Link href={`/nghe-nhan/${a.slug}`} key={a._id} className={css.card}>
              <div className={css.cardAvatar}>
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={toAssetUrl(avatar, API_ORIGIN)} alt={a.name} />
                ) : (
                  <div className={css.avatarPlaceholder}>
                    {a.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className={css.cardBody}>
                <h2 className={css.cardName}>{a.name}</h2>
                {title && <div className={css.cardTitle}>{title}</div>}
                {specialty && <div className={css.cardSpecialty}>{specialty}</div>}
                <div className={css.cardMeta}>
                  {a.yearsExperience && (
                    <span className={css.metaItem}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v10l4.24 4.24" /><circle cx="12" cy="12" r="10" /></svg> {a.yearsExperience} năm kinh nghiệm</span>
                  )}
                  {location && (
                    <span className={css.metaItem}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg> {location}</span>
                  )}
                </div>
                {bio && <p className={css.cardBio}>{bio.slice(0, 120)}{bio.length > 120 ? '...' : ''}</p>}
                <span className={css.cardLink}>Xem hồ sơ →</span>
              </div>
            </Link>
            );
          })
        )}
      </section>

      {/* Footer */}
      <footer className={css.footer}>
        <p>© {currentYear} Gốm Hoa Sen. Tất cả quyền được bảo lưu.</p>
      </footer>
    </div>
  );
}
