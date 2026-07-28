'use client';

// POC source: product-detail-360/home.html + styles/home.css + src/home.js + data/site.json
// Parity: H-01..H-10

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { resolveApiOrigin, toAssetUrl } from '@gomhoasen/contracts';
import css from './home-screen.module.css';

import {
  readFirstShowroom360Product,
  readShowroomDisplayText,
  readShowroomPhoneHref,
  readShowroomProductDetailHref,
  readShowroomText,
} from './showroom-display-normalization';

interface SiteData {
  brand: { name: string; tagline: string; subtitle?: string; founded?: string; phone: string; email: string; zalo: string };
  collections: { id: string; name: string; desc: string; image: string; count: number }[];
  products: { id: string; name: string; collection: string; glaze: string; price: number; priceLabel: string; image: string; modelUrl?: string; has360: boolean; isNew: boolean; isLimited: boolean; isBestSeller: boolean; swatches: string[]; desc: string }[];
  occasions: { id: string; name: string; icon: string; desc: string }[];
  journal: { id: string; title: string; excerpt: string; image: string }[];
}

export interface HomeScreenProps { siteData: SiteData; }

const API_ORIGIN = resolveApiOrigin();
const HERO_STAGE_IMAGE_BY_PRODUCT_IMAGE = new Map<string, string>([
  ['assets/product/hero.png', 'assets/product/hero-cutout.png'],
  ['/assets/product/hero.png', '/assets/product/hero-cutout.png'],
]);

function readHeroStageImage(productImage: string): string {
  return HERO_STAGE_IMAGE_BY_PRODUCT_IMAGE.get(productImage) ?? productImage;
}

export function HomeScreen({ siteData }: HomeScreenProps) {
  const { brand, collections, products, occasions, journal } = siteData;
  const currentYear = new Date().getFullYear();
  const brandPhone = readShowroomText(brand.phone);
  const brandPhoneHref = readShowroomPhoneHref(brand.phone);
  const brandEmail = readShowroomText(brand.email);
  const brandZalo = readShowroomText(brand.zalo);
  const hasPhone = brandPhoneHref !== undefined;
  const hasEmail = brandEmail !== undefined;
  const hasZalo = brandZalo !== undefined;
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const revealRefs = useRef<(HTMLElement | null)[]>([]);

  // H-01: Nav scroll glass effect
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  // H-10: Scroll reveal
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add(css.revealVisible); });
    }, { threshold: 0.15 });
    revealRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const addRevealRef = useCallback((el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
  }, []);

  const spotlight = products.filter((p) => p.isBestSeller || p.has360).slice(0, 4);
  const featured360 = readFirstShowroom360Product(products);
  const featuredCtaHref = readShowroomProductDetailHref(featured360);
  const heroProduct = products.find((product) => product.has360 && product.isBestSeller)
    ?? featured360
    ?? products[0];
  const heroProductHref = readShowroomProductDetailHref(heroProduct);
  const heroProductImage = heroProduct?.image ?? '/assets/product/hero.png';
  const heroStageImage = readHeroStageImage(heroProductImage);

  const [modelError, setModelError] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);

  useEffect(() => {
    if (!heroProduct?.modelUrl) {
      setModelError(false);
      setModelLoaded(false);
      return;
    }
    setModelError(false);
    setModelLoaded(false);
    import('@google/model-viewer').catch(() => {
      setModelError(true);
    });
  }, [heroProduct?.modelUrl]);

  return (
    <div className={css.homePage}>
      {/* H-01: Glass Nav */}
      <nav className={`${css.nav} ${scrolled ? css.navScrolled : ''}`}>
        <Link href="/" className={css.navBrand}>
          <span>{brand.name}</span>
        </Link>
        <div className={css.navLinks}>
          <Link href="/san-pham" className={css.navLink}>Sản phẩm</Link>
          <a href="#collections" className={css.navLink}>Bộ sưu tập</a>
          <a href="#craft" className={css.navLink}>Nghệ thuật</a>
          <a href="#journal" className={css.navLink}>Journal</a>
        </div>
        <Link href="/san-pham" className={css.navCta}>Khám phá sản phẩm</Link>
        <button className={css.navMenu} onClick={() => setMenuOpen(true)} aria-label="Mở menu" type="button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
        </button>
      </nav>

      {/* Menu Overlay */}
      {menuOpen && (
        <div className={`${css.menuOverlay} ${css.menuVisible}`} role="dialog" aria-modal="true">
          <button className={css.menuClose} onClick={() => setMenuOpen(false)} aria-label="Đóng" type="button">✕</button>
          <Link href="/" className={css.menuLink} onClick={() => setMenuOpen(false)}>Trang chủ</Link>
          <Link href="/san-pham" className={css.menuLink} onClick={() => setMenuOpen(false)}>Sản phẩm</Link>
          <a href="#collections" className={css.menuLink} onClick={() => setMenuOpen(false)}>Bộ sưu tập</a>
          <a href="#craft" className={css.menuLink} onClick={() => setMenuOpen(false)}>Nghệ thuật</a>
          <Link href="/san-pham" className={`${css.menuLink} ${css.menuAccent}`} onClick={() => setMenuOpen(false)}>Khám phá sản phẩm</Link>
        </div>
      )}

      {/* H-02: Hero */}
      <section className={css.hero}>
        <div className={css.heroAtmosphere} aria-hidden="true" />
        <div className={css.heroStage}>
          <div className={css.heroStatement}>
            <h1 className={css.heroTitle}>
              <span>Tinh hoa</span>
              <span>Gốm Việt</span>
            </h1>
            <p className={css.heroSubtitle}>
              {readShowroomDisplayText(brand.tagline, 'Gốm sứ nghệ thuật Việt Nam')}
            </p>
          </div>

          <Link
            href={heroProductHref}
            className={css.heroArtwork}
            aria-label={heroProduct ? `Xem tác phẩm ${heroProduct.name}` : 'Khám phá tác phẩm Gốm Hoa Sen'}
          >
            <span className={css.heroLight} aria-hidden="true" />
            {heroProduct?.modelUrl && !modelError ? (
              <>
                <model-viewer
                  src={toAssetUrl(heroProduct.modelUrl, API_ORIGIN)}
                  poster={toAssetUrl(heroStageImage, API_ORIGIN)}
                  auto-rotate
                  interaction-prompt="none"
                  shadow-intensity="1"
                  environment-image="neutral"
                  exposure="1"
                  camera-orbit="0deg 75deg 0.43m"
                  camera-target="0m 0.101m 0m"
                  className={`${css.heroModel} ${modelLoaded ? css.heroModelLoaded : ''}`}
                  aria-hidden="true"
                  onLoad={() => setModelLoaded(true)}
                  onError={() => setModelError(true)}
                />
                <img
                  className={`${css.heroPoster} ${modelLoaded ? css.heroPosterHidden : ''}`}
                  src={toAssetUrl(heroStageImage, API_ORIGIN)}
                  alt={heroProduct?.name ?? 'Tác phẩm Gốm Hoa Sen'}
                  fetchPriority="high"
                />
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={css.heroImage}
                src={toAssetUrl(heroStageImage, API_ORIGIN)}
                alt={heroProduct?.name ?? 'Tác phẩm Gốm Hoa Sen'}
                fetchPriority="high"
              />
            )}
            <span className={css.heroPedestal} aria-hidden="true" />
          </Link>

          <div className={css.heroCaption}>
            <p className={css.heroWorkName}>{heroProduct?.name ?? brand.name}</p>
            <p className={css.heroWorkMeta}>
              {heroProduct
                ? `${heroProduct.collection} · ${heroProduct.glaze}`
                : `Chế tác thủ công · Từ ${readShowroomDisplayText(brand.founded, '1984')}`}
            </p>
            <Link href={heroProductHref} className={css.heroWorkLink}>
              Chiêm ngưỡng tác phẩm <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <a
          href={featured360 ? '#featured-work' : '#collections'}
          className={css.heroScroll}
          aria-label="Khám phá nội dung tiếp theo"
        >
          <span>Khám phá</span>
          <span className={css.scrollLine} aria-hidden="true" />
        </a>
      </section>

      {/* H-03: Featured 360 */}
      {featured360 && (
      <section className={`${css.featured360} ${css.reveal}`} id="featured-work" ref={addRevealRef} data-uat-reveal="featured-360">
        <div className="container">
          <div className={css.sectionHeader}>
            <span className={css.sectionLabel}>SẢN PHẨM NỔI BẬT</span>
            <h2 className={css.sectionTitle}>Trải nghiệm 360°</h2>
          </div>
          <div className={css.featuredCard}>
            <Link href={readShowroomProductDetailHref(featured360)} className={css.featuredImage}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={toAssetUrl(featured360.image, API_ORIGIN)} alt={featured360.name} loading="lazy" />
              <span className="badge badge-360">360°</span>
            </Link>
            <div className={css.featuredInfo}>
              <span className={css.featuredCollection}>{featured360.collection.toUpperCase()}</span>
              <h3 className={css.featuredName}>{featured360.name}</h3>
              <p className={css.featuredDesc}>{readShowroomDisplayText(featured360.desc, `${featured360.glaze} • ${featured360.collection}`)}</p>
              <div className={css.featuredMeta}>
                <span className={css.featuredPrice}>{featured360.priceLabel}</span>
                {featured360.isLimited && <span className={css.featuredTag}>Phiên bản giới hạn</span>}
              </div>
              <div className={css.featuredSwatches}>
                {featured360.swatches.map((c) => <span key={c} className={css.miniSwatch} style={{ background: c }} />)}
              </div>
              <Link href={readShowroomProductDetailHref(featured360)} className={`${css.btn} ${css.btnPrimary}`}>Trải nghiệm 360°</Link>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* H-04: Collections */}
      <section className={`${css.collections} ${css.reveal}`} id="collections" ref={addRevealRef} data-uat-reveal="collections">
        <div className="container">
          <div className={css.sectionHeader}>
            <span className={css.sectionLabel}>BỘ SƯU TẬP</span>
            <h2 className={css.sectionTitle}>Khám phá thế giới gốm sứ</h2>
            <p className={css.sectionSubtitle}>Mỗi bộ sưu tập là một hành trình — từ cổ điển tinh hoa, tối giản hiện đại, đến phú quý thịnh vượng. Chọn phong cách phù hợp với không gian và cá tính của bạn.</p>
          </div>
          <div className={css.collectionGrid}>
            {collections.map((c) => (
              <Link key={c.id} href={`/san-pham?collection=${c.id}`} className={`${css.collectionCard} ${css.revealItem}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={toAssetUrl(c.image, API_ORIGIN)} alt={c.name} loading="lazy" />
                <div className={css.collectionInfo}>
                  <div className={css.collectionName}>{c.name}</div>
                  <div className={css.collectionDesc}>{c.desc}</div>
                </div>
                <span className={css.collectionCount}>{c.count} SP</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* H-05: Craft */}
      <section className={`${css.craft} ${css.reveal}`} id="craft" ref={addRevealRef} data-uat-reveal="craft">
        <div className="container">
          <div className={css.sectionHeader}>
            <span className={css.sectionLabel}>NGHỆ THUẬT CHẾ TÁC</span>
            <h2 className={css.sectionTitle}>Từ đất — qua lửa — thành men</h2>
          </div>
          <div className={css.craftSteps}>
            {[
              { num: '01', label: 'NGUYÊN LIỆU & TẠO HÌNH', title: 'Nhào đất & tạo hình', desc: 'Đất và men được tuyển chọn, nhào kỹ rồi tạo hình trên bàn xoay để giữ dáng cân, bề mặt sạch và cảm giác thủ công rõ nét.', image: '/assets/editorial/craft.png' },
              { num: '02', label: 'VẼ TAY & HOẠ TIẾT', title: 'Vẽ tay hoạ tiết', desc: 'Hoa sen, mây, sóng nước và cánh chim được xử lý tiết chế để giữ chiều sâu văn hoá mà không làm nặng bề mặt sản phẩm.', image: '/assets/stories/artisan.png' },
              { num: '03', label: 'TRÁNG MEN & NUNG', title: 'Tráng men & nung', desc: 'Sản phẩm được phủ men, nung và kiểm tra thủ công theo từng mẻ; sắc men cuối cùng có độ chuyển tự nhiên tùy nhiệt, lửa và chất liệu.', image: '/assets/product/detail-glaze.png' },
            ].map((step, i) => (
              <div key={step.num} className={`${css.craftRow} ${i % 2 === 1 ? css.craftReverse : ''} ${css.reveal}`} ref={addRevealRef} data-uat-reveal={`craft-step-${step.num}`}>
                <div className={`${css.craftImage} ${i % 2 === 0 ? css.revealLeft : css.revealRight}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={step.image} alt={step.title} loading="lazy" />
                </div>
                <div className={i % 2 === 0 ? css.revealRight : css.revealLeft}>
                  <div className={css.craftNumber}>{step.num}</div>
                  <div className={css.craftLabel}>{step.label}</div>
                  <h3 className={css.craftTitle}>{step.title}</h3>
                  <p className={css.craftDesc}>{step.desc}</p>
                  <div className={css.craftBar}><span /><span /><span /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* H-06: Spotlight */}
      <section className={`${css.spotlight} ${css.reveal}`} ref={addRevealRef} data-uat-reveal="spotlight">
        <div className="container">
          <div className={css.sectionHeader}>
            <span className={css.sectionLabel}>SẢN PHẨM TUYỂN CHỌN</span>
            <h2 className={css.sectionTitle}>Được yêu thích nhất</h2>
            <p className={css.sectionSubtitle}>Những tác phẩm gốm sứ tinh xảo nhất, được nghệ nhân chế tác kỳ công — sẵn sàng trải nghiệm 360° ngay trên trình duyệt.</p>
          </div>
          <div className={css.spotlightGrid}>
            {spotlight.map((p) => (
              <Link key={p.id} href={`/san-pham/${p.id}`} className={`${css.productCard} ${css.revealItem}`}>
                <div className={css.cardImage}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={toAssetUrl(p.image, API_ORIGIN)} alt={p.name} loading="lazy" />
                  {p.has360 && <span className="badge badge-360">360°</span>}
                  {p.isNew && <span className="badge badge-new">MỚI</span>}
                  {p.isLimited && <span className="badge badge-limited">GIỚI HẠN</span>}
                </div>
                <div className={css.cardBody}>
                  <div className={css.cardCollection}>{p.collection}</div>
                  <div className={css.cardName}>{p.name}</div>
                  <div className={css.cardGlaze}>{p.glaze}</div>
                  <div className={css.cardFooter}>
                    <span className={css.cardPrice}>{p.priceLabel}</span>
                    <div className={css.cardSwatches}>
                      {p.swatches.map((s) => <span key={s} className={css.miniSwatch} style={{ background: s }} />)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className={css.spotlightCta}>
            <Link href="/san-pham" className={`${css.btn} ${css.btnOutline}`}>Xem tất cả sản phẩm →</Link>
          </div>
        </div>
      </section>

      {/* H-07: Occasions */}
      <section className={`${css.occasions} ${css.reveal}`} ref={addRevealRef} data-uat-reveal="occasions">
        <div className="container">
          <div className={css.sectionHeader}>
            <span className={css.sectionLabel}>CHỌN THEO NHU CẦU</span>
            <h2 className={css.sectionTitle}>Gốm sứ cho mọi không gian</h2>
            <p className={css.sectionSubtitle}>Biếu tặng sang trọng, trang trí phòng khách, hay sưu tầm nghệ thuật — luôn có bộ gốm hoàn hảo dành cho bạn.</p>
          </div>
          <div className={css.occasionGrid}>
            {occasions.map((o) => (
              <Link key={o.id} href={`/san-pham?occasion=${o.id}`} className={`${css.occasionCard} ${css.revealItem}`}>
                <div className={css.occasionIcon} aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg></div>
                <div className={css.occasionName}>{o.name}</div>
                <div className={css.occasionDesc}>{o.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* H-08: Journal */}
      <section className={`${css.journal} ${css.reveal}`} id="journal" ref={addRevealRef} data-uat-reveal="journal">
        <div className="container">
          <div className={css.sectionHeader}>
            <span className={css.sectionLabel}>JOURNAL</span>
            <h2 className={css.sectionTitle}>Câu chuyện & Kiến thức</h2>
            <p className={css.sectionSubtitle}>Khám phá bí quyết chế tác, câu chuyện nghệ nhân và xu hướng bài trí gốm sứ nghệ thuật trong không gian sống hiện đại.</p>
          </div>
          <div className={css.journalGrid}>
            {journal.map((j) => (
              <div key={j.id} className={`${css.journalCard} ${css.revealItem}`}>
                <div className={css.journalImage}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={toAssetUrl(j.image, API_ORIGIN)} alt={j.title} loading="lazy" />
                </div>
                <div className={css.journalBody}>
                  <div className={css.journalTitle}>{j.title}</div>
                  <p className={css.journalExcerpt}>{j.excerpt}</p>
                  <span className={css.journalReadMore}>Đọc thêm →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* H-09: CTA Footer */}
      <section className={`${css.ctaFooter} ${css.reveal}`} ref={addRevealRef} data-uat-reveal="cta-footer">
        <div className="container">
          <h2 className={css.ctaTitle}>Cần tư vấn chọn sản phẩm?</h2>
          <p className={css.ctaDesc}>Gửi ảnh không gian, nhu cầu và ngân sách — chúng tôi gợi ý bộ gốm sứ phù hợp nhất cho bạn.</p>
          <div className={css.ctaActions}>
            {featured360 && (
              <Link href={readShowroomProductDetailHref(featured360)} className={`${css.btn} ${css.btnPrimary}`}>Trải nghiệm 360°</Link>
            )}
            <Link href="/san-pham" className={`${css.btn} ${css.btnOutline}`}>Khám phá bộ sưu tập</Link>
          </div>
          <div className={css.ctaContacts}>
            {hasZalo && <a href={brandZalo} className={css.ctaContact}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg> Zalo</a>}
            {hasPhone && <a href={brandPhoneHref} className={css.ctaContact}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg> {brandPhone}</a>}
            {hasEmail && <a href={`mailto:${brandEmail}`} className={css.ctaContact}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg> {brandEmail}</a>}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={css.footer}>
        <div className={css.footerGrid}>
          <div>
            <h4 className={css.footerBrand}>{brand.name}</h4>
            <p className={css.footerTagline}>{brand.tagline}</p>
          </div>
          <div>
            <h5 className={css.footerColTitle}>Sản phẩm</h5>
            <Link href="/san-pham" className={css.footerLink}>Tất cả sản phẩm</Link>
            {collections.slice(0, 3).map((c) => (
              <Link key={c.id} href={`/san-pham?collection=${c.id}`} className={css.footerLink}>{c.name}</Link>
            ))}
          </div>
          <div>
            <h5 className={css.footerColTitle}>Về chúng tôi</h5>
            <Link href="/" className={css.footerLink}>Câu chuyện</Link>
            <Link href="/nghe-nhan" className={css.footerLink}>Nghệ nhân</Link>
            <Link href="/san-pham?collection=di-san-viet" className={css.footerLink}>Xưởng gốm</Link>
          </div>
          <div>
            <h5 className={css.footerColTitle}>Hỗ trợ</h5>
            <Link href="/san-pham" className={css.footerLink}>Tư vấn bài trí</Link>
            <Link href="/san-pham?sort=high" className={css.footerLink}>Bảo hành</Link>
            <Link href="/san-pham?sort=featured" className={css.footerLink}>Vận chuyển</Link>
          </div>
        </div>
        <div className={css.footerBottom}>
          <p>© {currentYear} {brand.name}. Tất cả quyền được bảo lưu.</p>
        </div>
      </footer>

      {/* Floating CTA */}
      {hasPhone && <a href={brandPhoneHref} className={css.floatingCta} aria-label="Gọi tư vấn"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg></a>}
    </div>
  );
}
