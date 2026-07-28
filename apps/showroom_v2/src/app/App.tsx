import { useState, useEffect, useRef } from "react";
import { CollectionsPage } from "./CollectionsPage";
import { AboutPage } from "./AboutPage";
import { ProductsPage } from "./ProductsPage";
import { NewsPage } from "./NewsPage";
import { NewsDetailPage } from "./NewsDetailPage";
import { ArtisanDetailPage, ArtisansPage } from "./ArtisansPage";
import { ContactPage } from "./ContactPage";
import { CatalogListingPage } from "./components/CatalogListingPage";
import { ProductDetailPage } from "./components/ProductDetailPage";
import { IntroOverlay } from "./IntroOverlay";
import { ArtFrame } from "./ArtFrame";
import { updatePageMetadata } from "./data/page-metadata";
import Link from "./mocks/next/link";
import { motion } from "motion/react";
import {
  ChevronRight, ArrowRight,
  Menu, X,
  Home,
  type LucideIcon,
} from "lucide-react";
import { useShowroomData } from "./data/ShowroomContext";

// TypeScript declaration for <model-viewer> custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          poster?: string;
          loading?: "auto" | "lazy" | "eager";
          ar?: boolean;
          "camera-controls"?: boolean | "";
          "auto-rotate"?: boolean | "";
          "auto-rotate-delay"?: string;
          "rotation-per-second"?: string;
          "interaction-prompt"?: "auto" | "none";
          exposure?: string;
          "shadow-intensity"?: string;
          "environment-image"?: string;
          "camera-orbit"?: string;
          "camera-target"?: string;
          "field-of-view"?: string;
          "min-camera-orbit"?: string;
          "max-camera-orbit"?: string;
          "touch-action"?: string;
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

// ─── Motion ───────────────────────────────────────────────────────────────────
const E = [0.22, 1, 0.36, 1] as const;
const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0 } };
const fadeIn  = { hidden: { opacity: 0 },        show: { opacity: 1 }       };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.13, delayChildren: 0.18 } } };

// ─── Icons ────────────────────────────────────────────────────────────────────
function CircleLotus({ size = 34 }: { size?: number; iconSize?: number }) {
  return (
    <span className="circle-lotus" style={{ width: size, height: size }} aria-hidden="true">
      <img
        src="/assets/brand/lotus-mark.png"
        alt=""
        className="circle-lotus-img"
        width={Math.round(size * 0.62)}
        height={Math.round(size * 0.62)}
        draggable={false}
      />
    </span>
  );
}

function OrnamentDivider() {
  return (
    <div className="ornament-divider" aria-hidden="true">
      <span className="divider-lotus">
        <img src="/assets/brand/lotus-mark.png" alt="" width={20} height={20} draggable={false} />
      </span>
      <span className="divider-line-full" />
    </div>
  );
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div variants={fadeUp} initial="show"
      animate="show"
      transition={{ duration: 1.0, ease: E, delay }}
      className={className}>
      {children}
    </motion.div>
  );
}

function useSectionSnapAssist() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const desktopMq = window.matchMedia("(min-width: 1280px)");
    let locked = false;
    let releaseTimer: number | undefined;

    const getHeaderOffset = () => (window.innerWidth >= 1024 ? 72 : 68);
    const getSections = () => Array.from(document.querySelectorAll<HTMLElement>(".snap-section"));

    const getCurrentIndex = () => {
      const anchor = getHeaderOffset() + 24;
      const sections = getSections();
      const intersectedIndex = sections.findIndex((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= anchor && rect.bottom > anchor;
      });
      if (intersectedIndex >= 0) return intersectedIndex;

      return sections.reduce((bestIndex, section, index) => {
        const bestRect = sections[bestIndex].getBoundingClientRect();
        const nextRect = section.getBoundingClientRect();
        const bestDistance = Math.abs(bestRect.top - getHeaderOffset());
        const nextDistance = Math.abs(nextRect.top - getHeaderOffset());
        return nextDistance < bestDistance ? index : bestIndex;
      }, 0);
    };

    const scrollToIndex = (index: number) => {
      const sections = getSections();
      const target = sections[index];
      if (!target) return;
      const targetTop = Math.max(
        Math.round(window.scrollY + target.getBoundingClientRect().top - getHeaderOffset()),
        0,
      );
      window.scrollTo({
        top: targetTop,
        behavior: "smooth",
      });
    };

    const engage = (direction: 1 | -1) => {
      const sections = getSections();
      if (!sections.length) return false;
      const currentIndex = getCurrentIndex();
      const nextIndex = Math.max(0, Math.min(sections.length - 1, currentIndex + direction));
      if (nextIndex === currentIndex) return false;
      locked = true;
      window.clearTimeout(releaseTimer);
      scrollToIndex(nextIndex);
      releaseTimer = window.setTimeout(() => { locked = false; }, 780);
      return true;
    };

    const onWheel = (event: WheelEvent) => {
      if (!desktopMq.matches) return;
      if (event.ctrlKey || event.metaKey) return;
      if (Math.abs(event.deltaY) < 36) return;
      if (locked) {
        event.preventDefault();
        return;
      }
      const handled = engage(event.deltaY > 0 ? 1 : -1);
      if (handled) event.preventDefault();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!desktopMq.matches) return;
      if (locked) {
        if (["PageDown", "PageUp", "ArrowDown", "ArrowUp", " "].includes(event.key)) event.preventDefault();
        return;
      }
      if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(event.target.tagName)) return;

      const direction =
        event.key === "PageDown" || event.key === "ArrowDown" || event.key === " "
          ? 1
          : event.key === "PageUp" || event.key === "ArrowUp"
            ? -1
            : 0;

      if (!direction) return;
      const handled = engage(direction as 1 | -1);
      if (handled) event.preventDefault();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(releaseTimer);
    };
  }, []);
}

/** Bottom tab bar — primary destinations; overflow under “Xem thêm”. */
const LOTUS_NAV_ICON = "/assets/brand/lotus-mark.png";

type MobileNavItem = {
  label: string;
  href: string;
  Icon?: LucideIcon;
  lotus?: boolean;
};

const MOBILE_NAV: MobileNavItem[] = [
  { label: "Trang chủ", href: "/", Icon: Home },
  { label: "Giới thiệu", href: "/gioi-thieu", lotus: true },
  { label: "Sản phẩm", href: "/san-pham", lotus: true },
  { label: "Bộ sưu tập", href: "/bo-suu-tap", lotus: true },
];

const MOBILE_NAV_MORE = [
  { label: "Tin tức", href: "/tin-tuc" },
  { label: "Liên hệ", href: "/lien-he" },
] as const;

function isActiveNavHref(href: string, path = window.location.pathname) {
  return path === href || (href !== "/" && path.startsWith(`${href}/`));
}

function MobileBottomNav({ path }: { path: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreActive = MOBILE_NAV_MORE.some((item) => isActiveNavHref(item.href, path));

  useEffect(() => {
    setMoreOpen(false);
  }, [path]);

  useEffect(() => {
    if (!moreOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  return (
    <nav className="mobile-bottom-nav" aria-label="Điều hướng nhanh">
      {MOBILE_NAV.map(({ label, href, Icon, lotus }) => {
        const active = isActiveNavHref(href, path);
        return (
          <Link
            key={href}
            href={href}
            className={"mobile-bottom-link" + (active ? " is-active" : "")}
            aria-current={active ? "page" : undefined}
          >
            {lotus ? (
              <img
                src={LOTUS_NAV_ICON}
                alt=""
                className="mobile-bottom-lotus"
                width={22}
                height={20}
                draggable={false}
                aria-hidden="true"
              />
            ) : Icon ? (
              <Icon size={20} strokeWidth={active ? 1.8 : 1.4} aria-hidden="true" />
            ) : null}
            <span>{label}</span>
          </Link>
        );
      })}

      <div className="mobile-bottom-more" ref={moreRef}>
        <button
          type="button"
          className={"mobile-bottom-link mobile-bottom-more-btn" + (moreOpen || moreActive ? " is-active" : "")}
          aria-label="Xem thêm"
          aria-expanded={moreOpen}
          aria-controls="mobile-bottom-more-menu"
          onClick={() => setMoreOpen((v) => !v)}
        >
          <Menu size={20} strokeWidth={moreOpen || moreActive ? 1.8 : 1.4} aria-hidden="true" />
          <span>Xem thêm</span>
        </button>
        {moreOpen && (
          <div id="mobile-bottom-more-menu" className="mobile-bottom-more-menu" role="menu">
            {MOBILE_NAV_MORE.map((item) => {
              const active = isActiveNavHref(item.href, path);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  className={"mobile-bottom-more-item" + (active ? " is-active" : "")}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMoreOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen]         = useState(false);
  const { navItems, navHrefs } = useShowroomData();

  useEffect(() => {
    document.documentElement.lang = "vi";
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { setScrolled(window.scrollY > 80); ticking = false; });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className={"site-header" + (scrolled ? " is-scrolled" : "") + (open ? " is-menu-open" : "")}>
      <div className="header-inner">
        <Link href="/" className="site-logo" aria-label="Gốm Hoa Sen — trang chủ" onClick={() => setOpen(false)}>
          <img
            src="/assets/brand/logo.png"
            alt="Gốm Hoa Sen — Tinh hoa gốm Việt"
            className="site-logo-img"
            width={290}
            height={69}
          />
        </Link>

        <nav className="primary-nav" aria-label="Điều hướng chính">
          {navItems.map((label, i) => (
            <Link key={label} href={navHrefs[i]} className={"nav-link" + (isActiveNavHref(navHrefs[i]) ? " is-active" : "")}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="header-util">
          <button type="button" className="util-btn mobile-only" onClick={() => setOpen(!open)}
            aria-label={open ? "Đóng menu" : "Mở menu"} aria-expanded={open} aria-controls="mobile-menu">
            {open ? <X size={21} strokeWidth={1.3} /> : <Menu size={21} strokeWidth={1.3} />}
          </button>
        </div>
      </div>

      {open && (
        <>
          <button type="button" className="mobile-drawer-backdrop" aria-label="Đóng menu" onClick={() => setOpen(false)} />
          <nav id="mobile-menu" className="mobile-drawer" aria-label="Menu di động">
            {navItems.map((label, i) => (
              <Link
                key={navHrefs[i]}
                href={navHrefs[i]}
                className={"mobile-nav-link" + (isActiveNavHref(navHrefs[i]) ? " is-active" : "")}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </header>
  );
}

function Hero() {
  const { homeLanding } = useShowroomData();
  const modelRef = useRef<any>(null);

  useEffect(() => {
    import("@google/model-viewer").catch(console.error);
  }, []);

  useEffect(() => {
    const modelViewer = modelRef.current;
    if (!modelViewer) return;
    const updateMaterial = () => {
      const material = modelViewer.model?.materials?.[0];
      if (material) {
        // Ceramic warm / antique clay look
        material.pbrMetallicRoughness.setMetallicFactor(0.02);
        material.pbrMetallicRoughness.setRoughnessFactor(0.85);
        material.pbrMetallicRoughness.setBaseColorFactor([0.72, 0.56, 0.45, 1]);
      }
    };
    modelViewer.addEventListener('load', updateMaterial);
    return () => modelViewer.removeEventListener('load', updateMaterial);
  }, []);
  return (
    <section className="hero snap-section" aria-labelledby="hero-title">
      <div className="hero-vignette" aria-hidden="true" />
      <div className="hero-pattern" aria-hidden="true" />
      <div className="hero-scroll-rail" aria-hidden="true">
        <span>{homeLanding.scrollHintLabel}</span>
        <span className="hero-scroll-line" />
      </div>

      <div className="hero-inner">
        <motion.div className="hero-copy" variants={stagger} initial="hidden" animate="show">
          <motion.p className="hero-eyebrow" variants={fadeUp} transition={{ duration: 0.9, ease: E }}>
            <span className="hero-eyebrow-rule" aria-hidden="true" />
            {homeLanding.eyebrow}
            <span className="hero-eyebrow-rule" aria-hidden="true" />
          </motion.p>

          <motion.h1 id="hero-title" className="hero-title"
            variants={fadeUp} transition={{ duration: 1.2, ease: E, delay: 0.08 }}>
            <span className="hero-title-line">{homeLanding.title}</span>
          </motion.h1>

          <motion.div variants={fadeIn} transition={{ duration: 1.0, ease: E, delay: 0.28 }}>
            <OrnamentDivider />
          </motion.div>

          <motion.p className="hero-tagline"
            variants={fadeUp} transition={{ duration: 1.0, ease: E, delay: 0.36 }}>
            {homeLanding.tagline}
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 1.0, ease: E, delay: 0.5 }}
            className="hero-cta-row"
          >
            <Link href={homeLanding.ctaHref} className="art-btn hero-cta">
              <ArtFrame />
              <span>{homeLanding.ctaLabel}</span>
              <ArrowRight size={13} strokeWidth={1.3} className="cta-arrow" />
            </Link>
          </motion.div>
        </motion.div>

        <motion.div className="hero-stage"
          variants={fadeIn} initial="hidden" animate="show"
          transition={{ duration: 1.6, ease: E, delay: 0.25 }}>
          <div className="stage-arch" aria-hidden="true" />
          <div className="stage-glow-outer" aria-hidden="true" />
          <div className="stage-glow-inner" aria-hidden="true" />
          <div className="hero-reference-shadow" aria-hidden="true">
            <img src={homeLanding.heroReferenceImage} alt="" className="hero-reference-shadow-img" />
          </div>
          <div className="hero-model-shell">
            <model-viewer
              ref={modelRef}
              src={homeLanding.heroModelUrl}
              poster={homeLanding.heroModelPoster}
              alt={homeLanding.heroModelAlt}
              loading="eager"
              camera-controls=""
              auto-rotate=""
              auto-rotate-delay="0"
              rotation-per-second="18deg"
              interaction-prompt="none"
              exposure="0.96"
              shadow-intensity="0"
              environment-image="neutral"
              camera-orbit="0deg 78deg auto"
              camera-target="0m 0.11m 0m"
              field-of-view="auto"
              min-camera-orbit="auto 68deg auto"
              max-camera-orbit="auto 92deg auto"
              touch-action="pan-y"
            />
          </div>

          <div className="model-contact-shadow" aria-hidden="true" />
          <div className="pedestal" aria-hidden="true" />

          <div className="rotate-hint" aria-label="Kéo để xoay 360 độ">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            <span>360°</span>
          </div>
        </motion.div>

        <motion.div className="hero-features" aria-label="Đặc trưng chế tác"
          variants={fadeUp} initial="hidden" animate="show"
          transition={{ duration: 1.0, ease: E, delay: 0.7 }}>
          {homeLanding.interactionFeatures.map((f, i) => (
            <span key={f} className="hero-feature-chip">
              <span className="hero-feature-num">0{i + 1}</span>
              {f}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Heritage / Process ───────────────────────────────────────────────────────
function ProcessCard({ img, title, desc, position = "50% 50%", delay = 0 }: { img: string; title: string; desc: string; position?: string; delay?: number }) {
  return (
    <motion.article className="process-card"
      variants={fadeUp} initial="show" animate="show"
      transition={{ duration: 1.0, ease: E, delay }}>
      <img
        src={img}
        alt={title}
        className="process-img"
        loading="lazy"
        decoding="async"
        style={{ objectPosition: position }}
      />
      <div className="process-overlay" aria-hidden="true" />
      <div className="process-footer">
        <CircleLotus size={34} iconSize={15} />
        <h3 className="process-title">{title}</h3>
        <p className="process-desc">{desc}</p>
      </div>
    </motion.article>
  );
}

function Heritage() {
  const { homeLanding, homeProcess } = useShowroomData();
  return (
    <section id="craft" className="heritage snap-section" aria-labelledby="heritage-title">
      <motion.div className="heritage-copy"
        variants={fadeUp} initial="show" animate="show"
        transition={{ duration: 1.0, ease: E }}>
        <span className="eyebrow">{homeLanding.heritageEyebrow}</span>
        <h2 id="heritage-title" className="section-title">
          <span className="title-balanced" style={{ whiteSpace: 'pre-line' }}>{homeLanding.heritageTitle}</span>
        </h2>
        <p className="heritage-body">
          {homeLanding.heritageBody}
        </p>
        <Link href={homeLanding.heritageCtaHref} className="text-link">
          {homeLanding.heritageCtaLabel} <ChevronRight size={13} strokeWidth={1.3} />
        </Link>
      </motion.div>
      {homeProcess.map((p, i) => (
        <ProcessCard key={p.title} {...p} delay={0.1 * (i + 1)} />
      ))}
    </section>
  );
}

// ─── Collection ───────────────────────────────────────────────────────────────
function ProductCard({ img, title, sub, href, delay = 0 }: { img: string; title: string; sub: string; href: string; delay?: number }) {
  return (
    <motion.article className="product-card"
      variants={fadeUp} initial="show" animate="show"
      transition={{ duration: 0.9, ease: E, delay }}>
      <Link href={href} className="product-card-link">
        <span className="card-shimmer" aria-hidden="true" />
        <img src={img} alt={title} className="product-card-img" loading="lazy" decoding="async" />
        <div className="card-overlay" aria-hidden="true" />
        {/* Decorative bronze frame — outer edge + inset line + corner squares */}
        <span className="card-frame" aria-hidden="true">
          <span className="card-corner card-corner-tl" />
          <span className="card-corner card-corner-tr" />
          <span className="card-corner card-corner-bl" />
          <span className="card-corner card-corner-br" />
        </span>
        <div className="card-footer">
          <div className="card-footer-left">
            <CircleLotus size={32} iconSize={14} />
            <div className="card-footer-text">
              <h3 className="card-title">{title}</h3>
              <p className="card-sub">{sub}</p>
            </div>
          </div>
          <ArrowRight size={14} strokeWidth={1.2} className="card-arrow" />
        </div>
      </Link>
    </motion.article>
  );
}

function Collection() {
  const { homeCollections, homeLanding } = useShowroomData();
  return (
    <section id="collections" className="collection snap-section" aria-labelledby="collection-title">
      <div className="container">
        <Reveal className="section-head">
          <div>
            <span className="eyebrow">{homeLanding.collectionEyebrow}</span>
            <h2 id="collection-title" className="section-title collection-heading">
              <span className="title-balanced" style={{ whiteSpace: 'pre-line' }}>{homeLanding.collectionTitle}</span>
            </h2>
          </div>
          <div className="view-all-wrapper">
            <span className="ring ring-outer" aria-hidden="true" />
            <span className="ring ring-inner" aria-hidden="true" />
            <Link href={homeLanding.collectionCtaHref} className="art-btn view-all-link">
              <ArtFrame />
              <span>{homeLanding.collectionCtaLabel}</span>
              <ArrowRight size={13} strokeWidth={1.3} />
            </Link>
          </div>
        </Reveal>
        <div className="product-carousel" role="region" aria-roledescription="carousel" aria-label="Bộ sưu tập nổi bật">
          <div className="product-grid">
            {homeCollections.map((p, i) => <ProductCard key={p.title} {...p} delay={i * 0.1} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Promises ─────────────────────────────────────────────────────────────────
function Promises() {
  const { homePromises } = useShowroomData();
  return (
    <section className="promises snap-section" aria-label="Cam kết thương hiệu">
      <div className="promises-grid container">
        {homePromises.map((p, i) => (
          <motion.div key={p.title} className="promise-item"
            variants={fadeUp} initial="show" animate="show"
            transition={{ duration: 0.9, ease: E, delay: i * 0.12 }}>
            <CircleLotus size={40} iconSize={18} />
            <div className="promise-text">
              <h3 className="promise-title">{p.title}</h3>
              <p className="promise-desc">{p.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const { brand, homeLanding } = useShowroomData();
  const currentYear = String(new Date().getFullYear());
  const copyright = homeLanding.footerCopyright
    .replace('{year}', currentYear)
    .replace(/©\s*\d{4}/, `© ${currentYear}`);
  return (
    <footer className="site-footer">
      <span className="footer-brand">
        <img
          src="/assets/brand/logo.png"
          alt={brand.name}
          className="footer-logo-img"
          width={200}
          height={47}
        />
      </span>
      <p className="footer-copy">{copyright}</p>
    </footer>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html  { scroll-behavior: smooth; }
  body  { background: #080704; margin: 0; -webkit-font-smoothing: antialiased; }
  img   { display: block; max-width: 100%; }
  a     { color: inherit; text-decoration: none; }
  ol,ul { margin: 0; padding: 0; list-style: none; }
  ::selection { background: rgba(197,160,117,0.28); color: #D5C3AD; }

  :root {
    --header-height: 72px;
    --ivory:      #D5C3AD;
    --ivory-soft: #C9B190;
    --gold:       #C5A075;
    --gold-mid:   #A48B6C;
    --gold-muted: #8C7053;
    --text-sec:   rgba(213,195,173,0.74);
    --text-muted: rgba(164,139,108,0.68);
    --line:       rgba(201,177,144,0.16);
    --ease:       cubic-bezier(0.22,1,0.36,1);
    --font-display: "Noto Serif Display", "Times New Roman", serif;
    --font-body: "Be Vietnam Pro", Arial, sans-serif;
    --font-ui: var(--font-body);
    --font-serif: var(--font-display);
    --font-script: var(--font-display);
    --serif: var(--font-display);
    --sans:  var(--font-body);
    --cx:    min(1184px, calc(100vw - 176px));
  }

  /* ── Utilities ─────────────────────────────────────────────────── */
  .app-shell { max-width: 100%; overflow-x: clip; }
  main { max-width: 100%; overflow-x: clip; }
  .container   { width: var(--cx); max-width: 1184px; margin-inline: auto; }
  .eyebrow     { display: block; font-family: var(--font-ui); font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); }
  .section-title { font-family: var(--font-display); font-size: clamp(32px,3.5vw,48px); font-weight: 500; line-height: 1.12; letter-spacing: 0.01em; color: var(--ivory-soft); margin: 0; text-wrap: balance; }
  .collection-heading { font-family: var(--font-display); font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; text-wrap: balance; }
  .text-link   { display: inline-flex; align-items: center; gap: 7px; font-family: var(--font-ui); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); transition: color 300ms var(--ease); white-space: nowrap; }
  .text-link:hover { color: var(--ivory); }
  .circle-lotus {
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 50%; border: 1px solid rgba(201,177,144,0.40);
    color: var(--gold); background: rgba(8,7,4,0.55); flex-shrink: 0;
    overflow: hidden;
  }
  .circle-lotus-img,
  .circle-lotus img {
    display: block; object-fit: contain;
    width: 62%; height: 62%;
  }
  .divider-lotus img { display: block; width: 20px; height: 20px; object-fit: contain; opacity: 0.92; }

  /* ── Ornament divider ──────────────────────────────────────────── */
  .ornament-divider { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-block: 26px 28px; width: fit-content; }
  .divider-line-full { width: 140px; height: 1px; background: linear-gradient(90deg, transparent, rgba(197,160,117,0.8), transparent); }
  .divider-lotus    { color: var(--gold); display: flex; }

  /* ── Header ────────────────────────────────────────────────────── */
  .site-header {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    height: 88px; padding-inline: clamp(20px,4vw,56px);
    background: linear-gradient(to bottom, rgba(8,7,4,0.72), transparent);
    border-bottom: 1px solid transparent;
    transition: height 400ms var(--ease), background 400ms var(--ease), border-color 400ms var(--ease), backdrop-filter 400ms var(--ease);
  }
  .site-header.is-scrolled {
    height: 72px; background: rgba(8,7,4,0.86);
    backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    border-bottom-color: var(--line);
  }
  .header-inner { position: relative; z-index: 102; height: 100%; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 24px; }
  .site-logo  { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .site-logo-img {
    display: block;
    height: 64px;
    width: auto;
    max-width: min(340px, 52vw);
    object-fit: contain;
    transition: height 400ms var(--ease), max-width 400ms var(--ease);
  }
  .site-header.is-scrolled .site-logo-img { height: 52px; max-width: min(300px, 50vw); }
  .logo-text-group { display: flex; flex-direction: column; gap: 4px; }
  .logo-text  { font-family: var(--font-display); font-size: 17px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ivory); line-height: 1; }
  .logo-subtext { font-family: var(--font-ui); font-size: 9px; font-weight: 400; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold-muted); line-height: 1; margin-left: 2px; }
  .primary-nav { display: flex; justify-content: center; gap: clamp(18px,2.8vw,44px); }
  .nav-link   { position: relative; font-family: var(--font-ui); font-size: 11px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(220,202,166,0.62); padding-bottom: 10px; transition: color 360ms var(--ease); white-space: nowrap; }
  .nav-link::after { content: ""; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 0; height: 1px; background: var(--gold); transition: width 420ms var(--ease); }
  .nav-link:hover { color: var(--ivory); }
  .nav-link:hover::after { width: 100%; }
  .nav-link.is-active { color: var(--ivory); }
  .nav-link.is-active::after { width: 100%; opacity: 0.85; }
  .header-util { display: flex; align-items: center; gap: 16px; }
  .util-btn   { background: none; border: none; cursor: pointer; padding: 4px; color: var(--gold-muted); transition: color 300ms var(--ease); }
  .util-icon  { display: inline-flex; align-items: center; justify-content: center; padding: 4px; color: var(--gold-muted); }
  .util-btn:hover { color: var(--ivory); }
  .lang-toggle { font-family: var(--sans); font-size: 10px; letter-spacing: 0.12em; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px; }
  .desktop-only { display: flex; }
  .mobile-only  { display: none; }
  .mobile-drawer-backdrop {
    display: none;
    position: fixed; inset: 0; z-index: 99;
    background: rgba(5, 4, 2, 0.55);
    border: none; padding: 0; cursor: pointer;
  }
  .mobile-drawer {
    position: absolute; top: 100%; left: 0; right: 0; z-index: 101;
    background: rgba(8,7,4,0.98);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--line);
    padding: 4px clamp(20px,4vw,56px) 20px;
  }
  .mobile-nav-link {
    display: flex; align-items: center;
    min-height: 48px; padding: 12px 0;
    font-family: var(--font-ui); font-size: 12px; font-weight: 500;
    letter-spacing: 0.14em; text-transform: uppercase;
    color: rgba(220,202,166,0.62);
    border-bottom: 1px solid rgba(201,177,144,0.08);
    white-space: nowrap;
    transition: color 300ms var(--ease);
  }
  .mobile-nav-link:last-child { border-bottom: none; }
  .mobile-nav-link:hover, .mobile-nav-link.is-active { color: var(--ivory); }
  .site-header.is-menu-open { background: rgba(8,7,4,0.97); backdrop-filter: blur(18px); border-bottom-color: var(--line); }
  .product-carousel { width: 100%; }

  /* Mobile bottom tab bar — hidden on desktop */
  .mobile-bottom-nav { display: none; }

  /* ── Hero — centered museum composition ────────────────────────── */
  .hero {
    position: relative;
    min-height: clamp(680px, 100vh, 900px);
    padding-bottom: 0;
    overflow: hidden;
    background:
      radial-gradient(ellipse 58% 66% at 50% 30%, rgba(145,98,46,0.34) 0%, transparent 62%),
      radial-gradient(ellipse 40% 48% at 50% 62%, rgba(110,74,34,0.18) 0%, transparent 58%),
      linear-gradient(180deg, #0d0b08 0%, #080704 45%, #0a0804 100%);
  }
  .hero-vignette {
    position: absolute; inset: 0; z-index: 1; pointer-events: none;
    background:
      radial-gradient(ellipse 72% 62% at 50% 42%, transparent 40%, rgba(4,3,2,0.56) 100%),
      linear-gradient(180deg, rgba(4,3,2,0.52) 0%, transparent 20%, transparent 72%, rgba(4,3,2,0.7) 100%);
  }
  .hero-pattern {
    position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.5;
    background:
      repeating-linear-gradient(90deg, transparent 0 96px, rgba(201,177,144,0.028) 96px 97px),
      repeating-linear-gradient(0deg, transparent 0 96px, rgba(201,177,144,0.02) 96px 97px);
    mask-image: radial-gradient(ellipse 60% 56% at 50% 44%, black 30%, transparent 72%);
    -webkit-mask-image: radial-gradient(ellipse 60% 56% at 50% 44%, black 30%, transparent 72%);
  }
  .hero-scroll-rail {
    position: absolute;
    left: clamp(18px, 3vw, 44px);
    bottom: clamp(58px, 8vw, 116px);
    z-index: 3;
    display: none;
    align-items: center;
    gap: 16px;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    color: rgba(201,177,144,0.78);
    font-family: var(--sans);
    font-size: 9px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
  }
  .hero-scroll-line {
    display: block;
    width: 1px;
    height: 64px;
    background: linear-gradient(180deg, rgba(201,177,144,0), rgba(201,177,144,0.72), rgba(201,177,144,0));
  }

  .hero-inner {
    position: relative; z-index: 2;
    width: var(--cx); max-width: 1184px; margin-inline: auto;
    padding-top: 88px;
    display: flex; flex-direction: column; align-items: center;
    min-height: clamp(680px, 100vh, 900px);
    justify-content: center;
  }
  .hero-copy  {
    display: flex; flex-direction: column; align-items: center;
    text-align: center; max-width: 640px; padding-top: 8px;
  }
  .hero-eyebrow {
    display: inline-flex; align-items: center; gap: 14px;
    font-family: var(--font-ui); font-size: 10px; font-weight: 500;
    letter-spacing: 0.3em; text-transform: uppercase;
    color: var(--gold); margin: 0 0 20px; white-space: nowrap;
  }
  .hero-eyebrow-rule {
    display: inline-block; width: clamp(28px, 6vw, 56px); height: 1px;
    background: linear-gradient(90deg, transparent, rgba(197,160,117,0.7));
  }
  .hero-eyebrow-rule:last-child {
    background: linear-gradient(90deg, rgba(197,160,117,0.7), transparent);
  }
  .hero-title {
    font-family: var(--font-display);
    font-size: clamp(48px, 5.2vw, 74px);
    line-height: 1;
    font-weight: 500;
    letter-spacing: 0.035em;
    text-transform: uppercase;
    text-wrap: balance;
    color: var(--ivory);
    margin: 0;
    white-space: normal;
    text-shadow: 0 2px 24px rgba(0,0,0,0.4);
  }
  .hero-tagline {
    font-family: var(--font-display);
    font-size: clamp(16px, 1.6vw, 20px);
    line-height: 1.65;
    font-weight: 400;
    font-style: normal;
    color: var(--text-sec);
    margin: 0 0 30px;
    max-width: 480px;
    text-wrap: balance;
    white-space: pre-line;
  }
  .hero-cta-row { display: inline-flex; }
  .hero-body  { font-family: var(--font-display); font-size: 18px; line-height: 1.7; font-weight: 400; color: var(--text-sec); margin: 0 0 30px; max-width: 318px; }

  /* Feature chips under 3D stage */
  .hero-features {
    display: flex; flex-wrap: wrap; justify-content: center;
    gap: 10px 12px; margin-top: 4px; max-width: 720px;
  }
  .hero-feature-chip {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 14px; min-height: 34px;
    font-family: var(--font-ui); font-size: 10px; font-weight: 500;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: rgba(213,195,173,0.72);
    border: 1px solid rgba(201,177,144,0.2);
    background: rgba(8,7,4,0.32);
    white-space: nowrap;
  }
  .hero-feature-num {
    font-family: var(--font-display); font-size: 10px;
    color: var(--gold); letter-spacing: 0.02em;
  }

  .hero-cta { gap: 14px; height: 46px; padding-inline: 26px; }
  .cta-arrow { transition: transform 360ms var(--ease); }
  .hero-cta:hover .cta-arrow { transform: translateX(3px); }

  .hero-stage {
    position: relative;
    height: clamp(446px, 50vw, 676px);
    display: grid; place-items: center;
    user-select: none;
    isolation: isolate;
    overflow: visible;
  }
  .hero-stage::before {
    content: "";
    position: absolute;
    inset: 8% 9% 10%;
    border-radius: 40% 40% 18% 18% / 46% 46% 12% 12%;
    background:
      linear-gradient(180deg, rgba(42,31,20,0.34), rgba(8,7,4,0.02) 62%),
      radial-gradient(ellipse at 50% 28%, rgba(102,70,32,0.22), transparent 70%),
      radial-gradient(ellipse at 50% 80%, rgba(28,20,14,0.22), transparent 62%);
    opacity: 0.52;
    z-index: -1;
    filter: blur(12px);
  }
  .stage-arch {
    position: absolute;
    right: 4%;
    top: 12%;
    width: min(34%, 180px);
    height: 48%;
    border-radius: 46% 46% 0 0 / 54% 54% 0 0;
    border: 1px solid rgba(201,177,144,0.12);
    background:
      radial-gradient(circle at 50% 44%, rgba(220,188,137,0.04), transparent 60%),
      linear-gradient(180deg, rgba(16,12,8,0.6), rgba(6,5,4,0.1));
    box-shadow: inset 0 20px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.5);
    filter: blur(0.6px);
    opacity: 0.9;
    z-index: 0;
  }

  .stage-glow-outer {
    position: absolute; width: 84%; height: 88%; top: 2%;
    border-radius: 50%;
    background: radial-gradient(ellipse at 50% 44%, rgba(158,108,50,0.28) 0%, rgba(120,80,36,0.16) 38%, rgba(54,39,23,0.05) 58%, transparent 74%);
    filter: blur(84px); pointer-events: none;
    z-index: 0;
  }
  .stage-glow-inner {
    position: absolute; width: 48%; height: 56%; top: 10%;
    border-radius: 50%;
    background: radial-gradient(ellipse at 50% 36%, rgba(200,155,78,0.22) 0%, rgba(161,111,45,0.14) 36%, transparent 72%);
    filter: blur(42px); pointer-events: none;
    z-index: 1;
  }
  .hero-model-shell {
    position: relative;
    z-index: 3;
    width: clamp(388px, 44vw, 624px);
    height: clamp(468px, 56vw, 708px);
    display: grid;
    place-items: center;
  }
  .hero-reference-shadow {
    position: absolute;
    left: 58%;
    pointer-events: none;
    transform-origin: center bottom;
  }
  .hero-reference-shadow {
    bottom: 88px;
    width: clamp(248px, 28vw, 372px);
    z-index: 1;
    opacity: 0.16;
    transform: translateX(-6%) scale(1.14);
    filter: blur(30px) saturate(0.72) brightness(0.4);
  }
  .hero-reference-shadow img {
    display: block;
    width: 100%;
    height: auto;
  }
  .hero-model-shell model-viewer {
    width: 100%;
    height: 100%;
    background: transparent;
    position: relative;
    z-index: 4;
    --poster-color: transparent;
    outline: none;
    cursor: grab;
    transform: translateY(24px) scale(0.80);
    filter:
      drop-shadow(0 56px 108px rgba(0,0,0,0.88))
      drop-shadow(0 18px 28px rgba(0,0,0,0.3))
      drop-shadow(0 0 44px rgba(172,120,64,0.16));
  }
  .hero-model-shell model-viewer:active {
    cursor: grabbing;
  }
  .hero-model-shell model-viewer:focus,
  .hero-model-shell model-viewer:focus-visible {
    outline: none;
  }
  .hero-model-shell model-viewer::part(default-progress-bar),
  .hero-model-shell model-viewer::part(default-progress-mask),
  .hero-model-shell model-viewer::part(default-ar-button) {
    display: none;
  }
  .model-contact-shadow {
    position: absolute;
    left: 50%;
    bottom: 108px;
    width: clamp(160px, 17vw, 228px);
    height: 34px;
    transform: translateX(-50%);
    border-radius: 50%;
    background: radial-gradient(ellipse at center, rgba(16,11,7,0.82) 0%, rgba(8,7,4,0.68) 44%, rgba(8,7,4,0.05) 76%);
    filter: blur(7px);
    pointer-events: none;
    z-index: 2;
  }
  .pedestal {
    position: absolute; bottom: 4px;
    left: 50%; transform: translateX(-50%);
    width: clamp(388px, 42vw, 560px); height: 148px;
    z-index: 2;
    pointer-events: none;
  }
  .pedestal::before {
    content: "";
    position: absolute;
    inset: auto 6% 24px;
    height: 84px;
    border-radius: 50%;
    background:
      radial-gradient(ellipse 78% 64% at 50% 16%, rgba(140,99,52,0.46), transparent 70%),
      linear-gradient(180deg, #2b1d11 0%, #12100d 52%, #040302 100%);
    box-shadow:
      0 0 0 1px rgba(201,177,144,0.06),
      inset 0 1px 0 rgba(235,205,158,0.12),
      inset 0 0 40px rgba(0,0,0,0.8);
    z-index: 2;
  }
  .pedestal::after {
    content: "";
    position: absolute;
    inset: auto 6% 0;
    height: 84px;
    border-radius: 50%;
    background: #080604;
    box-shadow:
      0 40px 80px rgba(0,0,0,0.98),
      inset 0 24px 40px -20px rgba(201,177,144,0.1);
    z-index: 1;
  }

  .rotate-hint {
    position: absolute; bottom: 58px;
    left: 50%; transform: translateX(-50%);
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    color: rgba(213,195,173,0.88); z-index: 4;
    pointer-events: none;
  }
  .rotate-hint span { font-family: var(--serif); font-size: 16px; font-weight: 500; letter-spacing: 0.08em; }

  /* ── Heritage ──────────────────────────────────────────────────── */
  .snap-section { scroll-snap-align: start; scroll-snap-stop: normal; scroll-margin-top: var(--header-height); }
  .heritage { display: grid; grid-template-columns: 1fr; min-height: clamp(400px, 60vh, 520px); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .heritage-copy { padding: 32px clamp(24px,4vw,56px); background: linear-gradient(120deg, rgba(34,25,17,0.98), rgba(12,10,7,0.99)), #16120B; display: flex; flex-direction: column; gap: 18px; justify-content: center; min-height: auto; }
  .heritage-body { font-family: var(--font-display); font-size: 16px; line-height: 1.7; font-weight: 400; color: rgba(213,195,173,0.68); margin: 0; max-width: 300px; }
  .title-balanced { text-wrap: balance; white-space: pre-line; }
  .process-card {
    position: relative; min-height: 300px; overflow: hidden;
    border-left: 1px solid var(--line);
    border-top: 1px solid transparent; border-bottom: 1px solid transparent;
    transition: border-color 400ms var(--ease);
  }
  .process-img  { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: contrast(1.05) saturate(0.8) brightness(0.78); transform: scale(1.0); transition: transform 900ms var(--ease); }
  .process-card:hover .process-img { transform: scale(1.02); }
  .process-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(5,4,2,0.95) 0%, rgba(5,4,2,0.34) 44%, transparent 100%); transition: background 400ms var(--ease); }
  .process-footer { position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%); width: 80%; text-align: center; z-index: 2; transition: transform 400ms var(--ease), color 300ms var(--ease); display: flex; flex-direction: column; align-items: center; }
  .process-card:hover .process-overlay { background: linear-gradient(to top, rgba(5,4,2,0.86) 0%, rgba(5,4,2,0.28) 44%, transparent 100%); }
  .process-card:hover .process-footer { transform: translateX(-50%) translateY(-4px); }
  .process-card:hover .circle-lotus { transform: translateY(-2px); border-color: rgba(201,177,144,0.54); }
  .process-card:hover { border-color: rgba(201,177,144,0.15); }
  .process-title { font-family: var(--font-display); font-size: 20px; font-weight: 500; letter-spacing: 0.01em; color: var(--ivory-soft); margin: 10px 0 6px; line-height: 1.2; text-wrap: balance; }
  .process-desc  { font-family: var(--font-ui); font-size: 11px; letter-spacing: 0.05em; text-transform: none; color: rgba(220,202,166,0.85); margin: 0; max-width: 160px; line-height: 1.5; }

  /* ── Collection ────────────────────────────────────────────────── */
  .collection { position: relative; min-height: auto; padding: 56px 0 40px; display: flex; align-items: center; background: radial-gradient(circle at 92% 16%, rgba(120,94,55,0.08), transparent 26%), #080704; }
  .view-all-wrapper { position: relative; display: inline-flex; align-items: center; justify-content: center; }
  .ring { position: absolute; border-radius: 50%; pointer-events: none; border: 1px solid rgba(201,177,144,0.055); top: 50%; left: 50%; transform: translate(-50%, -50%); }
  .ring-outer { width: clamp(210px, 20vw, 280px); height: clamp(210px, 20vw, 280px); opacity: 0.3; }
  .ring-inner { width: clamp(164px, 16vw, 224px); height: clamp(164px, 16vw, 224px); border-color: rgba(201,177,144,0.034); opacity: 0.35; }
  .section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
  .collection-heading { max-width: 560px; margin-top: 8px; }
  .view-all-link { gap: 8px; padding-inline: 20px; color: rgba(197,160,117,0.9); }
  .view-all-wrapper .ring { z-index: 0; }
  .view-all-wrapper .art-btn { z-index: 1; }
  .product-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
  .product-carousel { width: 100%; min-width: 0; }

  /* Product card — double bronze frame + corner squares (Figma) */
  .product-card {
    --frame-gold: #A88A5D;
    --frame-inset: 10px;
    position: relative;
    min-height: 240px;
    overflow: hidden;
    border: 1px solid rgba(168, 138, 93, 0.55);
    border-radius: 5px;
    background: #0A0907;
    transition: transform 400ms var(--ease), box-shadow 400ms var(--ease), border-color 400ms var(--ease);
  }
  .product-card-link {
    display: block;
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #100D06;
  }
  .card-frame {
    position: absolute;
    inset: var(--frame-inset);
    z-index: 4;
    pointer-events: none;
    border: 1px solid var(--frame-gold);
    border-radius: 3px;
    box-shadow: inset 0 0 0 0 transparent;
  }
  .card-corner {
    position: absolute;
    width: 7px;
    height: 7px;
    border: 1px solid var(--frame-gold);
    border-radius: 2px;
    background: #0A0907;
    box-sizing: border-box;
  }
  .card-corner-tl { top: -1px; left: -1px; }
  .card-corner-tr { top: -1px; right: -1px; }
  .card-corner-bl { bottom: -1px; left: -1px; }
  .card-corner-br { bottom: -1px; right: -1px; }
  .card-shimmer {
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    background: linear-gradient(120deg, transparent, rgba(255,225,170,0.07), transparent);
    transform: translateX(-120%);
    transition: transform 900ms var(--ease);
  }
  .product-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 36px rgba(0,0,0,0.26);
    border-color: rgba(197, 160, 117, 0.75);
  }
  .product-card:hover .card-frame,
  .product-card:hover .card-corner { border-color: #C5A075; }
  .product-card:hover .card-shimmer { transform: translateX(120%); }
  .product-card-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: contrast(1.04) saturate(0.76) brightness(0.74);
    transform: scale(1.01);
    transition: transform 1000ms var(--ease);
  }
  .product-card:hover .product-card-img { transform: scale(1.09); }
  .card-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(5,4,2,0.94) 0%, rgba(5,4,2,0.34) 44%, rgba(5,4,2,0.06) 100%);
    transition: background 300ms var(--ease);
  }
  .product-card:hover .card-overlay {
    background: linear-gradient(to top, rgba(5,4,2,0.88) 0%, rgba(5,4,2,0.28) 44%, rgba(5,4,2,0.02) 100%);
  }
  .card-footer {
    position: absolute;
    inset: auto calc(var(--frame-inset) + 12px) calc(var(--frame-inset) + 12px);
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .card-footer-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
  .card-footer-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .card-title {
    font-family: var(--font-display);
    font-size: 15px;
    letter-spacing: 0.01em;
    font-weight: 500;
    text-transform: none;
    color: var(--gold);
    margin: 0 0 4px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card-sub {
    font-family: var(--font-ui);
    font-size: 11px;
    line-height: 1.4;
    color: rgba(213,195,173,0.56);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card-arrow { color: rgba(197,160,117,0.68); flex-shrink: 0; transition: transform 360ms var(--ease); }
  .product-card:hover .card-arrow { transform: translateX(4px); }

  /* ── Promises ──────────────────────────────────────────────────── */
  .promises { min-height: auto; border-top: 1px solid var(--line); padding: 40px clamp(20px,4vw,56px); display: flex; align-items: center; background: #0B0906; }
  .promises-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: clamp(28px,4vw,56px); }
  .promise-item  { display: flex; flex-direction: row; align-items: center; gap: 14px; }
  .promise-text  { display: flex; flex-direction: column; gap: 6px; }
  .promise-title { font-family: var(--font-ui); font-size: 11px; letter-spacing: 0.13em; text-transform: uppercase; color: var(--ivory); font-weight: 500; margin: 0; }
  .promise-desc  { font-family: var(--font-ui); font-size: 11px; line-height: 1.4; color: rgba(164,139,108,0.7); margin: 0; }

  /* ── Footer ────────────────────────────────────────────────────── */
  .site-footer  { border-top: 1px solid rgba(201,177,144,0.08); padding: 26px clamp(20px,4vw,56px); background: #080704; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; }
  .footer-brand { display: flex; align-items: center; gap: 9px; font-family: var(--serif); font-size: 13px; letter-spacing: 0.14em; color: rgba(164,139,108,0.5); }
  .footer-logo-img { display: block; height: 44px; width: auto; max-width: min(280px, 80vw); object-fit: contain; opacity: 0.9; }
  .footer-copy  { font-family: var(--sans); font-size: 10px; letter-spacing: 0.10em; color: rgba(164,139,108,0.4); }

  /* ── Responsive ────────────────────────────────────────────────── */
  @media (min-width: 1280px) {
    html.snap-enabled, body.snap-enabled { scroll-snap-type: y proximity; scroll-padding-top: var(--header-height); }
    .desktop-only { display: flex !important; }
    .mobile-only  { display: none  !important; }
    .primary-nav  { display: flex  !important; }
    .hero-scroll-rail { display: inline-flex; }
    .heritage     { grid-template-columns: 1.45fr 1fr 1fr 1fr; }
    .process-card { min-height: 380px; }
    .product-grid { grid-template-columns: repeat(4, 1fr); }
    .product-card { min-height: 260px; }
    .promises-grid { grid-template-columns: repeat(4, 1fr); }
    .mobile-bottom-nav { display: none !important; }
    .app-shell { padding-bottom: 0; }
  }

  /* Bottom tab bar — phone + tablet */
  @media (max-width: 1279px) {
    :root { --mobile-bottom-nav-h: 64px; }
    .mobile-bottom-nav {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      position: fixed;
      left: 0; right: 0; bottom: 0;
      z-index: 110;
      height: calc(var(--mobile-bottom-nav-h) + env(safe-area-inset-bottom, 0px));
      padding: 0 4px env(safe-area-inset-bottom, 0px);
      background: rgba(8, 7, 4, 0.94);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-top: 1px solid rgba(201, 177, 144, 0.18);
    }
    .mobile-bottom-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      min-height: 44px;
      padding: 8px 4px;
      font-family: var(--font-ui);
      font-size: 8px;
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: rgba(220, 202, 166, 0.48);
      white-space: nowrap;
      transition: color 240ms var(--ease);
    }
    .mobile-bottom-link.is-active,
    .mobile-bottom-link:hover { color: var(--gold); }
    .mobile-bottom-lotus {
      display: block;
      width: 22px;
      height: 20px;
      object-fit: contain;
      opacity: 0.55;
      transition: opacity 240ms var(--ease), filter 240ms var(--ease);
    }
    .mobile-bottom-link.is-active .mobile-bottom-lotus,
    .mobile-bottom-link:hover .mobile-bottom-lotus {
      opacity: 1;
      filter: drop-shadow(0 0 4px rgba(197, 160, 117, 0.35));
    }
    .mobile-bottom-link span {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mobile-bottom-more {
      position: relative;
      display: flex;
      align-items: stretch;
      justify-content: center;
    }
    .mobile-bottom-more-btn {
      width: 100%;
      border: 0;
      background: transparent;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
    }
    .mobile-bottom-more-menu {
      position: absolute;
      right: 4px;
      bottom: calc(100% + 10px);
      min-width: 148px;
      padding: 6px;
      border: 1px solid rgba(197, 160, 117, 0.42);
      border-radius: 5px;
      background: rgba(14, 11, 8, 0.97);
      box-shadow: 0 14px 32px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(197, 160, 117, 0.12);
      display: flex;
      flex-direction: column;
      gap: 2px;
      z-index: 2;
    }
    .mobile-bottom-more-item {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 10px 14px;
      border-radius: 3px;
      font-family: var(--font-ui);
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(220, 202, 166, 0.78);
      white-space: nowrap;
      transition: color 200ms var(--ease), background 200ms var(--ease);
    }
    .mobile-bottom-more-item:hover,
    .mobile-bottom-more-item.is-active {
      color: var(--gold);
      background: rgba(197, 160, 117, 0.1);
    }
    .app-shell {
      padding-bottom: calc(var(--mobile-bottom-nav-h) + env(safe-area-inset-bottom, 0px));
      overflow-x: clip;
    }
  }

  @media (min-width: 768px) and (max-width: 1279px) {
    html.snap-enabled, body.snap-enabled { scroll-snap-type: y proximity; scroll-padding-top: var(--header-height); }
    .desktop-only { display: none !important; }
    .mobile-only  { display: flex !important; }
    .primary-nav  { display: none !important; }
    :root { --cx: calc(100vw - 72px); }
    .hero { min-height: auto; }
    .hero-inner   { gap: 24px; padding-top: 92px; min-height: auto; }
    .hero-copy    { max-width: 640px; padding-top: 0; }
    .hero-title   { font-size: clamp(44px, 5vw, 68px); }
    .hero-stage   { height: clamp(420px, 54vw, 560px); }
    .hero-model-shell { width: clamp(348px, 50vw, 520px); height: clamp(436px, 66vw, 590px); }
    .hero-reference-shadow { left: 55%; bottom: 72px; width: clamp(202px, 24vw, 282px); }
    .hero-model-shell model-viewer { transform: translateY(16px) scale(0.74); }
    .model-contact-shadow { bottom: 94px; width: clamp(148px, 17vw, 196px); }
    .pedestal { bottom: 4px; width: clamp(344px, 46vw, 500px); }
    .rotate-hint { bottom: 48px; }
    .heritage     { grid-template-columns: 1fr 1fr; }
    .heritage-copy { grid-column: span 2; padding: 46px 40px 30px; min-height: auto; }
    .process-card { min-height: 324px; }
    .collection { min-height: auto; padding: 72px 0 56px; }
    .product-grid { grid-template-columns: repeat(2, 1fr); }
    .product-card { min-height: 260px; }
    .promises-grid { grid-template-columns: repeat(2, 1fr); gap: 24px 28px; }
  }

  @media (max-width: 767px) {
    html, body { scroll-snap-type: none; }
    .desktop-only { display: none !important; }
    .mobile-only  { display: flex !important; }
    .primary-nav  { display: none !important; }
    :root { --cx: calc(100vw - 32px); --header-height: 76px; }
    .site-header  { height: 76px; padding-inline: 14px; }
    .site-header.is-scrolled { height: 66px; }
    .site-logo-img { height: 56px; max-width: min(290px, 76vw); }
    .site-header.is-scrolled .site-logo-img { height: 48px; max-width: min(260px, 72vw); }
    .header-inner { grid-template-columns: 1fr auto; gap: 12px; }
    .util-btn { min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; }
    .mobile-drawer-backdrop { display: block; }
    .mobile-drawer { padding-inline: 16px; }
    .snap-section { scroll-snap-align: none; }
    .hero         { min-height: auto; padding-bottom: 20px; }
    .hero-inner   { padding-top: 72px; gap: 18px; min-height: auto; }
    .hero-copy    { padding-top: 0; max-width: 100%; }
    .hero-eyebrow { font-size: 9px; letter-spacing: 0.22em; gap: 10px; margin-bottom: 14px; }
    .hero-title   { font-size: clamp(29px, 8.5vw, 38px); letter-spacing: 0.025em; line-height: 1.05; }
    .hero-tagline { font-size: 15px; line-height: 1.6; max-width: none; margin-bottom: 22px; }
    .hero-body { max-width: 34ch; margin-bottom: 20px; font-size: 16px; line-height: 1.65; }
    .hero-cta { min-height: 44px; padding-inline: 18px; }
    .hero-stage   { height: min(56vh, 360px); }
    .stage-arch { display: none; }
    .hero-model-shell { width: min(86vw, 300px); height: min(52vh, 340px); }
    .hero-reference-shadow { left: 54%; bottom: 48px; width: min(42vw, 140px); }
    .hero-model-shell model-viewer { width: 100% !important; height: 100% !important; transform: translateY(12px) scale(0.78); }
    .model-contact-shadow { bottom: 66px; width: min(42vw, 132px); height: 26px; }
    .pedestal { width: min(90vw, 320px); height: 96px; bottom: 0; }
    .rotate-hint { bottom: 28px; }
    .hero-features { gap: 8px; margin-top: 2px; }
    .hero-feature-chip { font-size: 9px; padding: 6px 10px; min-height: 30px; letter-spacing: 0.08em; }
    /* Heritage + craft panels — mobile museum stack */
    .heritage {
      display: flex; flex-direction: column;
      min-height: 0; border-bottom: none;
    }
    .heritage-copy {
      min-height: auto;
      padding: 40px 20px 36px;
      align-items: center;
      text-align: center;
      gap: 14px;
    }
    .heritage-copy .eyebrow {
      letter-spacing: 0.22em;
      font-size: 10px;
    }
    .heritage-copy .section-title {
      font-size: clamp(26px, 7vw, 32px);
      line-height: 1.15;
      max-width: none;
      margin-inline: auto;
    }
    .heritage-body {
      max-width: 34ch;
      font-family: var(--font-body);
      font-size: 15px;
      line-height: 1.65;
      text-align: center;
      margin-inline: auto;
    }
    .heritage-copy .text-link {
      min-height: 44px;
      justify-content: center;
      padding-inline: 4px;
      margin-top: 2px;
    }
    /* Process — alternating rows on mobile: big thumb + text, zigzag */
    .process-card {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 16px;
      min-height: 0;
      aspect-ratio: auto;
      padding: 18px 16px;
      border-left: none;
      border-top: 1px solid rgba(201,177,144,0.14);
      background: linear-gradient(120deg, rgba(24,18,12,0.98), rgba(10,8,6,0.99));
    }
    .process-card:nth-of-type(even) {
      flex-direction: row-reverse;
    }
    .process-card:nth-of-type(even) .process-footer {
      text-align: right;
      align-items: flex-end;
    }
    .process-img {
      position: static;
      inset: auto;
      width: clamp(108px, 31vw, 132px);
      height: clamp(108px, 31vw, 132px);
      flex: none;
      border-radius: 12px;
      border: 1px solid rgba(201,177,144,0.28);
      object-fit: cover;
    }
    .process-card:hover .process-img { transform: none; }
    .process-overlay { display: none; }
    .process-footer {
      position: static;
      left: auto;
      bottom: auto;
      transform: none;
      width: auto;
      flex: 1;
      min-width: 0;
      text-align: left;
      align-items: flex-start;
      gap: 0;
    }
    .process-card:hover .process-footer,
    .process-card:active .process-footer {
      transform: none;
    }
    .process-title {
      font-size: clamp(18px, 5vw, 21px);
      margin: 0 0 6px;
      line-height: 1.2;
    }
    .process-desc {
      font-size: 13.5px;
      line-height: 1.55;
      max-width: none;
      letter-spacing: 0.02em;
      color: rgba(220,202,166,0.78);
    }
    .process-footer .circle-lotus {
      display: none !important;
    }
    .collection { min-height: auto; padding: 40px 0 36px; overflow: hidden; }
    .collection .container { overflow: visible; }
    .section-head { flex-direction: column; align-items: flex-start; gap: 16px; margin-bottom: 18px; }
    .collection-heading { font-size: clamp(21px, 5.8vw, 26px); line-height: 1.15; max-width: 100%; text-transform: none; letter-spacing: 0.01em; }
    .view-all-link { min-height: 44px; }
    .ring { display: none; }

    /* 3-up horizontal carousel slider */
    .product-carousel {
      margin-inline: calc(50% - 50vw);
      width: 100vw;
      padding-inline: 16px;
      overflow: hidden;
    }
    .product-grid {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scroll-snap-type: x mandatory;
      scroll-padding-inline: 16px;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-x;
      padding-bottom: 6px;
      scrollbar-width: none;
    }
    .product-grid::-webkit-scrollbar { display: none; }
    .product-card {
      flex: 0 0 calc((100% - 12px) / 2);
      width: calc((100% - 12px) / 2);
      min-width: 0;
      min-height: 220px;
      scroll-snap-align: start;
      --frame-inset: 8px;
    }
    .product-card .circle-lotus { width: 26px !important; height: 26px !important; }
    .product-card .circle-lotus img { width: 62% !important; height: 62% !important; }
    .card-footer { inset: auto calc(var(--frame-inset) + 8px) calc(var(--frame-inset) + 10px); gap: 6px; }
    .card-footer-left { gap: 8px; }
    .card-title { font-size: 13px; margin: 0; letter-spacing: 0.02em; }
    .card-sub { display: none; }
    .card-arrow { width: 14px; height: 14px; }

    .promises { padding: 28px 16px 36px; }
    .promises-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
    .promise-item {
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 10px;
      min-height: 100%;
      padding: 18px 12px 16px;
      border: 1px solid rgba(197, 160, 117, 0.55);
      border-radius: 5px;
      background: linear-gradient(180deg, rgba(32, 26, 18, 0.96) 0%, rgba(14, 11, 8, 0.98) 100%);
      box-shadow:
        0 14px 32px rgba(0, 0, 0, 0.72),
        0 4px 12px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(197, 160, 117, 0.18),
        inset 0 1px 0 rgba(212, 175, 122, 0.14);
    }
    .promise-text { align-items: center; gap: 6px; }
    .promise-title { font-size: 10px; letter-spacing: 0.1em; line-height: 1.35; }
    .promise-desc { font-size: 10px; line-height: 1.45; color: rgba(201, 177, 144, 0.72); }
    .site-footer { padding: 22px 16px; flex-direction: column; align-items: flex-start; gap: 10px; }
    .footer-logo-img { height: 38px; max-width: min(250px, 82vw); }
  }

  @media (max-width: 400px) {
    .product-card { min-height: 200px; }
    .card-title { font-size: 12px; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [route, setRoute] = useState(() => ({
    path: window.location.pathname,
    hash: window.location.hash,
  }));
  const {
    brand,
    homeLanding,
    aboutLanding,
    collectionsLanding,
    productsLandingInfo,
    newsLandingInfo,
    artisansLanding,
    contactLanding,
    catalogUx,
    notFound,
  } = useShowroomData();
  const path = route.path;

  useEffect(() => {
    const handlePop = () => {
      setRoute({
        path: window.location.pathname,
        hash: window.location.hash,
      });
    };
    window.addEventListener("popstate", handlePop);

    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const timer = window.setTimeout(() => {
      if (route.hash) {
        const id = decodeURIComponent(route.hash.replace('#', ''));
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }

      window.scrollTo({ top: 0, behavior: 'auto' });
    }, route.hash ? 220 : 0);

    return () => window.clearTimeout(timer);
  }, [route.hash, route.path]);

  useEffect(() => {
    const enableSnap = path === "/";
    document.documentElement.classList.toggle("snap-enabled", enableSnap);
    document.body.classList.toggle("snap-enabled", enableSnap);

    return () => {
      document.documentElement.classList.remove("snap-enabled");
      document.body.classList.remove("snap-enabled");
    };
  }, [path]);

  useEffect(() => {
    if (path.startsWith("/san-pham/") || path.startsWith("/tin-tuc/") || path.startsWith("/nghe-nhan/")) {
      return;
    }

    const routeMeta: Record<string, { title: string; description: string }> = {
      "/": { title: homeLanding.title, description: homeLanding.body },
      "/gioi-thieu": { title: aboutLanding.title, description: aboutLanding.desc },
      "/bo-suu-tap": { title: collectionsLanding.title, description: collectionsLanding.desc },
      "/san-pham": { title: productsLandingInfo.title, description: productsLandingInfo.desc },
      "/danh-muc": { title: catalogUx.listingTitle, description: catalogUx.listingSubtitle },
      "/tin-tuc": { title: newsLandingInfo.title, description: newsLandingInfo.desc },
      "/nghe-nhan": { title: artisansLanding.title, description: artisansLanding.desc },
      "/lien-he": { title: contactLanding.title, description: contactLanding.desc },
    };
    const meta = routeMeta[path] ?? {
      title: notFound.title,
      description: brand.subtitle,
    };
    updatePageMetadata({
      title: path === "/"
        ? `${brand.name} | ${brand.tagline}`
        : `${meta.title} | ${brand.name}`,
      description: meta.description,
      path,
    });
  }, [
    aboutLanding,
    artisansLanding,
    brand,
    catalogUx,
    collectionsLanding,
    contactLanding,
    homeLanding,
    newsLandingInfo,
    notFound.title,
    path,
    productsLandingInfo,
  ]);

  /* Immersive catalog pages keep site Header; hide Footer so 100dvh layouts fit */
  const hideSiteFooter = path === "/danh-muc" || path.startsWith("/san-pham/");

  return (
    <>
      {path === "/" && <IntroOverlay />}
      <style>{CSS}</style>
      <div className="app-shell" style={{ background: "#080704", color: "#D5C3AD", minHeight: "100vh" }}>
        <Header />
        <main
          style={
            hideSiteFooter
              ? {
                  paddingTop: "var(--header-height)",
                  minHeight: "calc(100dvh - var(--header-height))",
                  overflow: "hidden",
                }
              : undefined
          }
        >
          {path === "/bo-suu-tap" ? (
            <>
              <CollectionsPage />
              <Promises />
            </>
          ) : path === "/gioi-thieu" ? (
            <>
              <AboutPage />
              <Promises />
            </>
          ) : path === "/danh-muc" ? (
            <>
              <CatalogListingPage />
            </>
          ) : path.startsWith("/san-pham/") ? (
            <>
              <ProductDetailPage slug={path.replace("/san-pham/", "")} />
            </>
          ) : path === "/san-pham" ? (
            <>
              <ProductsPage />
            </>
          ) : path === "/tin-tuc" ? (
            <>
              <NewsPage />
              <Promises />
            </>
          ) : path.startsWith("/tin-tuc/") ? (
            <NewsDetailPage slug={path.slice("/tin-tuc/".length)} />
          ) : path === "/nghe-nhan" ? (
            <>
              <ArtisansPage />
              <Promises />
            </>
          ) : path.startsWith("/nghe-nhan/") ? (
            <ArtisanDetailPage slug={path.slice("/nghe-nhan/".length)} />
          ) : path === "/lien-he" ? (
            <>
              <ContactPage />
            </>
          ) : path === "/" ? (
            <>
              <Hero />
              <Heritage />
              <Collection />
              <Promises />
            </>
          ) : (
            <section
              aria-labelledby="not-found-title"
              style={{
                minHeight: "70vh",
                display: "grid",
                placeItems: "center",
                padding: "120px 24px 64px",
                textAlign: "center",
              }}
            >
              <div>
                <p style={{ color: "#B8915D", marginBottom: 12 }}>{notFound.eyebrow}</p>
                <h1 id="not-found-title" style={{ fontFamily: "var(--serif)", fontSize: 42, marginBottom: 18 }}>
                  {notFound.title}
                </h1>
                <p style={{ maxWidth: 520, margin: "0 auto 28px", color: "#A79B8E" }}>
                  {notFound.body}
                </p>
                <Link href="/" className="art-btn heritage-cta"><ArtFrame /><span>{notFound.backLabel}</span></Link>
              </div>
            </section>
          )}
        </main>
        {!hideSiteFooter && <Footer />}
        <MobileBottomNav path={path} />
      </div>
    </>
  );
}
