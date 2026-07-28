"use client";

// POC source files:
// - product-detail-360/product-detail.html
// - product-detail-360/src/main.js, sections.js, hotspots.js, panels.js, variants.js, contact.js
// - product-detail-360/styles/main.css
// POC parity: D-01..D-18 (see docs/02_SPECS/M1_SHOWROOM/POC_PARITY_MATRIX.md)

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { ArrowDown, Maximize2, X } from "lucide-react";
import type {
  ViewSectionContract,
  HotspotContract,
  ProductVariantContract,
  ProductStoryContract,
  ProductCtaContract,
} from "@gomhoasen/contracts";
import {
  GHS_API,
  RFQ_SOURCES,
  resolveApiOrigin,
  toAssetUrl,
} from "@gomhoasen/contracts";
import css from "./product-detail-viewer.module.css";
import { showroomApiPost } from "./showroom-api-client";
import {
  readShowroomCameraOrbit,
  readShowroomCameraTarget,
  readShowroomFormText,
  readShowroomHotspots,
  readShowroomText,
} from "./showroom-display-normalization";

const API_ORIGIN = resolveApiOrigin();

/* ================================================================
   Props — mirrors POC product.json exactly
   ================================================================ */
export interface ProductDetailViewerProps {
  productId: string;
  productName: string;
  brandName: string;
  productSubtitle?: string;
  modelUrl?: string;
  video360Url?: string;
  posterUrl?: string;
  images?: string[];
  viewSections?: ViewSectionContract[];
  variants?: ProductVariantContract[];
  specs?: Record<string, string>;
  story?: ProductStoryContract;
  cta?: ProductCtaContract;
  copy: {
    backLabel: string;
    loadingSubtitle: string;
    specsTitle: string;
    contactTitle: string;
    directChatLabel: string;
    namePlaceholder: string;
    phonePlaceholder: string;
    emailPlaceholder: string;
    notePlaceholder: string;
    submitLabel: string;
    submittingLabel: string;
    successTemplate: string;
    errorMessage: string;
    view360Title: string;
    view360Note: string;
    exit3dLabel: string;
    fullscreen3dLabel: string;
    productInfoLabel: string;
    imageUpdatingLabel: string;
    imageLabel: string;
    viewLabel: string;
    interact3dLabel: string;
    video360Label: string;
    variantsTitle: string;
    storyTitle: string;
    zaloLabel: string;
    hotlineLabel: string;
    emailLabel: string;
    rfqTitle: string;
    shortcutVariantLabel: string;
    shortcutStoryLabel: string;
    shortcutSpecsLabel: string;
    shortcutContactLabel: string;
  };
}

/* ================================================================
   Component
   ================================================================ */
export function ProductDetailViewer({
  productId,
  productName,
  brandName,
  productSubtitle = "",
  modelUrl,
  video360Url,
  posterUrl,
  images = [],
  viewSections = [],
  variants = [],
  specs = {},
  story,
  cta = {},
  copy,
}: ProductDetailViewerProps) {
  const viewerRef = useRef<HTMLElement | null>(null);
  const immersiveViewerRef = useRef<HTMLElement | null>(null);
  const normalizedModelUrl = readShowroomText(modelUrl);
  const normalizedPosterUrl = readShowroomText(posterUrl);
  const normalizedVideo360Url = readShowroomText(video360Url);
  const initialCameraOrbit = readShowroomCameraOrbit(
    viewSections[0]?.camera?.orbit,
  );
  const initialCameraTarget = readShowroomCameraTarget(
    viewSections[0]?.camera?.target,
  );

  // --- UI State ---
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [hotspotPanel, setHotspotPanel] = useState<
    HotspotContract["panel"] | null
  >(null);
  const [activeVariant, setActiveVariant] = useState(0);
  const [nightMode, setNightMode] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [loadPercent, setLoadPercent] = useState(0);
  const [performanceTier, setPerformanceTier] = useState<"high" | "low">(
    "high",
  );
  const [rfqState, setRfqState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [rfqMsg, setRfqMsg] = useState("");
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [video360Open, setVideo360Open] = useState(false);
  const [modelFailed, setModelFailed] = useState(false);

  // --- Layout Modes ---
  const [isImmersive, setIsImmersive] = useState(false);

  // --- D-06: Import model-viewer custom element ---
  useEffect(() => {
    let active = true;
    import("@google/model-viewer").catch(() => {
      if (active) setModelFailed(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setModelFailed(false);
  }, [normalizedModelUrl]);

  // --- D-06: Camera transition on section change ---
  const navigateSection = useCallback(
    (idx: number) => {
      setActiveSection(idx);
      const section = viewSections[idx];
      const el = isImmersive ? immersiveViewerRef.current : viewerRef.current;
      if (!section?.camera || !el) return;
      el.setAttribute("camera-orbit", section.camera.orbit);
      el.setAttribute("camera-target", section.camera.target);
    },
    [viewSections, isImmersive],
  );

  // --- D-02: Fake loading progress ---
  useEffect(() => {
    if (!normalizedModelUrl) {
      setShowLoading(false);
      return;
    }
    let pct = 0;
    const iv = setInterval(() => {
      pct += Math.random() * 15 + 5;
      if (pct >= 100) {
        pct = 100;
        clearInterval(iv);
      }
      setLoadPercent(Math.round(pct));
    }, 200);
    return () => clearInterval(iv);
  }, [normalizedModelUrl]);

  useEffect(() => {
    if (loadPercent >= 100) {
      const t = setTimeout(() => {
        setShowLoading(false);
        setIsLoaded(true);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [loadPercent]);

  // --- F3: WebGL Performance tiering ---
  useEffect(() => {
    const el = isImmersive ? immersiveViewerRef.current : viewerRef.current;
    if (!el) return;
    if (performanceTier === "high") {
      el.setAttribute("shadow-intensity", "1");
      el.setAttribute("environment-image", "neutral");
      el.setAttribute("exposure", "1");
    } else {
      el.setAttribute("shadow-intensity", "0");
      el.removeAttribute("environment-image");
      el.setAttribute("exposure", "0.8");
    }
  }, [performanceTier, isImmersive, isLoaded]);

  // --- Panel helpers ---
  const openPanel = useCallback((id: string) => {
    setActivePanel(id);
    setHotspotPanel(null);
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
    setHotspotPanel(null);
  }, []);

  const openVideo360 = useCallback(() => {
    if (!normalizedVideo360Url) return;
    closePanel();
    setVideo360Open(true);
  }, [closePanel, normalizedVideo360Url]);

  const closeVideo360 = useCallback(() => {
    setVideo360Open(false);
  }, []);

  // --- ESC handler order ---
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (video360Open) {
        closeVideo360();
      } else if (activePanel) {
        closePanel();
      } else if (isImmersive) {
        setIsImmersive(false);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [closePanel, closeVideo360, video360Open, activePanel, isImmersive]);

  useEffect(() => {
    if (!isImmersive && !video360Open && !activePanel) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activePanel, isImmersive, video360Open]);

  // --- D-10: Hotspot click ---
  const onHotspotClick = useCallback((hs: HotspotContract) => {
    setActivePanel("hotspot");
    setHotspotPanel(hs.panel);
  }, []);

  // --- D-13: RFQ submit (real API call) ---
  async function handleRfqSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; // capture before async
    setRfqState("submitting");
    setRfqMsg("");
    const fd = new FormData(form);
    const payload = {
      customerName: readShowroomFormText(fd.get("name")),
      customerPhone: readShowroomFormText(fd.get("phone")),
      customerEmail: readShowroomFormText(fd.get("email")) || null,
      message: readShowroomFormText(fd.get("note")),
      lineItems: [{ productId, productName, quantity: 1 }],
      source: RFQ_SOURCES.PRODUCT_DETAIL,
    };
    try {
      await showroomApiPost(GHS_API.RFQ.PUBLIC_SUBMIT, payload);
      setRfqState("success");
      setRfqMsg(copy.successTemplate.replace("{name}", payload.customerName));
      form.reset();
    } catch {
      setRfqState("error");
      setRfqMsg(copy.errorMessage);
    }
  }

  // --- Smooth scroll helper ---
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // --- Derived ---
  const currentSection = viewSections[activeSection];
  const currentHotspots = readShowroomHotspots(currentSection);
  const ctaPhone = readShowroomFormText(cta.hotline);
  const ctaZalo = readShowroomFormText(cta.zalo);
  const ctaEmail = readShowroomFormText(cta.email);
  const hasUsableEmail = typeof ctaEmail === "string" && ctaEmail.includes("@");
  const ctaVideo360 = normalizedVideo360Url
    ? toAssetUrl(normalizedVideo360Url, API_ORIGIN)
    : "";
  const hasUsableModel = normalizedModelUrl !== undefined && !modelFailed;
  const nextDetailSectionId = variants.length > 0
    ? "variants"
    : story
      ? "story"
      : Object.keys(specs).length > 0
        ? "specs"
        : "contact";

  // --- Shared render helpers ---
  function renderContactForm() {
    return (
      <form className={css.contactForm} onSubmit={handleRfqSubmit}>
        <input
          name="name"
          type="text"
          placeholder={copy.namePlaceholder}
          autoComplete="name"
          minLength={2}
          required
          className={css.formInput}
        />
        <input
          name="phone"
          type="tel"
          placeholder={copy.phonePlaceholder}
          autoComplete="tel"
          inputMode="tel"
          minLength={8}
          maxLength={20}
          required
          className={css.formInput}
        />
        <input
          name="email"
          type="email"
          placeholder={copy.emailPlaceholder}
          autoComplete="email"
          className={css.formInput}
        />
        <textarea
          name="note"
          placeholder={copy.notePlaceholder}
          className={`${css.formInput} ${css.formTextarea}`}
        />
        <button
          type="submit"
          className={css.formSubmit}
          disabled={rfqState === "submitting"}
        >
          {rfqState === "submitting" ? copy.submittingLabel : copy.submitLabel}
        </button>
        {rfqMsg && (
          <p
            className={rfqState === "success" ? css.rfqSuccess : css.rfqError}
            role={rfqState === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {rfqMsg}
          </p>
        )}
      </form>
    );
  }

  function renderPanels() {
    return (
      <>
        {activePanel && (
          <div className={css.panelBackdrop} onClick={closePanel} />
        )}

        {/* D-10: Hotspot info panel */}
        {activePanel === "hotspot" && hotspotPanel && (
          <div className={`${css.panel} ${css.infoPanel}`} role="dialog" aria-modal="true" aria-label={hotspotPanel.title}>
            <button
              className={css.panelClose}
              onClick={closePanel}
              type="button"
              aria-label="Đóng thông tin"
            >
              ✕
            </button>
            {hotspotPanel.image && (
              <div className={css.panelImage}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={toAssetUrl(hotspotPanel.image, API_ORIGIN)}
                  alt={hotspotPanel.title}
                />
              </div>
            )}
            <h2 className={css.panelTitle}>{hotspotPanel.title}</h2>
            <p className={css.panelContent}>{hotspotPanel.content}</p>
            {hotspotPanel.cta && (
              <button
                className={css.panelCta}
                onClick={() => openPanel("contact")}
                type="button"
              >
                {hotspotPanel.cta}
              </button>
            )}
          </div>
        )}

        {/* D-11: Specs panel (Fallback overlay support if triggered) */}
        {activePanel === "specs" && (
          <div className={`${css.panel} ${css.specsPanel}`} role="dialog" aria-modal="true" aria-label={copy.specsTitle}>
            <button
              className={css.panelClose}
              onClick={closePanel}
              type="button"
              aria-label="Đóng thông số"
            >
              ✕
            </button>
            <h2 className={css.panelTitle}>{copy.specsTitle}</h2>
            <div className={css.specsGrid}>
              {Object.entries(specs).map(([label, value]) => (
                <div className={css.specItem} key={label}>
                  <div className={css.specLabel}>{label}</div>
                  <div className={css.specValue}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* D-12: Story panel (Fallback overlay support if triggered) */}
        {activePanel === "story" && story && (
          <div className={`${css.panel} ${css.storyPanel}`} role="dialog" aria-modal="true" aria-label={story.title}>
            <button
              className={css.panelClose}
              onClick={closePanel}
              type="button"
              aria-label="Đóng câu chuyện"
            >
              ✕
            </button>
            {story.image && (
              <div className={css.storyImage}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={toAssetUrl(story.image, API_ORIGIN)}
                  alt={story.title}
                />
              </div>
            )}
            <h2 className={css.panelTitle}>{story.title}</h2>
            <div className={css.storySubtitle}>{story.subtitle}</div>
            <div className={css.storyContent}>{story.content}</div>
          </div>
        )}

        {/* D-13: Contact panel (Fallback overlay support if triggered) */}
        {activePanel === "contact" && (
          <div className={`${css.panel} ${css.contactPanel}`} role="dialog" aria-modal="true" aria-label={copy.contactTitle}>
            <button
              className={css.panelClose}
              onClick={closePanel}
              type="button"
              aria-label="Đóng form tư vấn"
            >
              ✕
            </button>
            <h2 className={css.panelTitle}>{copy.contactTitle}</h2>
            <div className={css.contactOptions}>
              {ctaZalo && (
                <a
                  href={ctaZalo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={css.contactOption}
                >
                  <span className={css.contactIcon}>💬</span>
                  <div>
                    <div className={css.contactLabel}>{copy.zaloLabel}</div>
                    <div className={css.contactValue}>{copy.directChatLabel}</div>
                  </div>
                </a>
              )}
              {ctaPhone && (
                <a
                  href={`tel:${ctaPhone.replace(/\s/g, "")}`}
                  className={css.contactOption}
                >
                  <span className={css.contactIcon}>📞</span>
                  <div>
                    <div className={css.contactLabel}>{copy.hotlineLabel}</div>
                    <div className={css.contactValue}>{ctaPhone}</div>
                  </div>
                </a>
              )}
              {ctaEmail && (
                hasUsableEmail ? (
                  <a href={`mailto:${ctaEmail}`} className={css.contactOption}>
                    <span className={css.contactIcon}>✉️</span>
                    <div>
                      <div className={css.contactLabel}>{copy.emailLabel}</div>
                      <div className={css.contactValue}>{ctaEmail}</div>
                    </div>
                  </a>
                ) : (
                  <div className={`${css.contactOption} ${css.contactOptionMuted}`} aria-disabled="true">
                    <span className={css.contactIcon}>✉️</span>
                    <div>
                      <div className={css.contactLabel}>{copy.emailLabel}</div>
                      <div className={css.contactValue}>{ctaEmail}</div>
                    </div>
                  </div>
                )
              )}
            </div>
            {renderContactForm()}
          </div>
        )}
      </>
    );
  }

  function renderVideo360Modal() {
    if (!video360Open || !ctaVideo360) return null;
    const lowerUrl = ctaVideo360.toLowerCase();
    const isVideoFile =
      lowerUrl.endsWith(".mp4") ||
      lowerUrl.endsWith(".webm") ||
      lowerUrl.endsWith(".ogg");
    return (
      <>
        <div className={css.video360Backdrop} onClick={closeVideo360} />
        <div
          className={css.video360Modal}
          role="dialog"
          aria-modal="true"
          aria-label={`${copy.view360Title} ${productName}`}
        >
          <div className={css.video360Header}>
            <div>
              <div className={css.video360Eyebrow}>{copy.view360Title}</div>
              <h2>{productName}</h2>
            </div>
            <button
              className={css.video360Close}
              onClick={closeVideo360}
              type="button"
                aria-label={`${copy.exit3dLabel}: ${copy.view360Title}`}
            >
              ✕
            </button>
          </div>
          <div className={css.video360Frame}>
            {isVideoFile ? (
              <video
                src={ctaVideo360}
                poster={toAssetUrl(normalizedPosterUrl, API_ORIGIN)}
                controls
                preload="metadata"
                playsInline
              />
            ) : (
              <iframe
                src={ctaVideo360}
                title={`${copy.view360Title} ${productName}`}
                loading="lazy"
              />
            )}
          </div>
          <p className={css.video360Note}>{copy.view360Note}</p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* D-02: Loading screen */}
      {showLoading && (
        <div
          id="loading-screen"
          className={`${css.loadingScreen} ${loadPercent >= 100 ? css.loadingDone : ""}`}
        >
          <div className={css.loadingContent}>
            <div className={css.loadingBrand}>{brandName}</div>
            <div className={css.loadingSubtitle}>{copy.loadingSubtitle}</div>
            <div className={css.loadingBarTrack}>
              <div
                className={css.loadingBarFill}
                style={{ width: `${loadPercent}%` }}
              />
            </div>
            <div className={css.loadingPercent}>{loadPercent}%</div>
          </div>
        </div>
      )}

      {/* Main Experience Container */}
      <div
        className={`${css.experience} ${nightMode ? css.nightMode : ""} ${uiHidden ? css.hideUi : ""} ${isImmersive ? css.immersiveMode : ""}`}
      >
        {/* --- 1. Immersive 3D View Mode Overlay --- */}
        {isImmersive && hasUsableModel && (
          <div className={css.immersiveContainer}>
            <button
              className={css.exitImmersiveBtn}
              onClick={() => setIsImmersive(false)}
              aria-label={copy.exit3dLabel}
              type="button"
            >
              <X size={17} aria-hidden="true" /> {copy.exit3dLabel}
            </button>

            {/* D-08: Section navigation inside immersive mode */}
            {viewSections.length > 1 && (
              <nav className={css.sectionNavImmersive}>
                {viewSections.map((s, i) => (
                  <button
                    key={s.id}
                    className={`${css.sectionNavItem} ${i === activeSection ? css.sectionActive : ""}`}
                    onClick={() => navigateSection(i)}
                    type="button"
                  >
                    <div className={css.sectionRadio}>
                      <div className={css.sectionRadioDot} />
                    </div>
                    <span>{s.name}</span>
                  </button>
                ))}
              </nav>
            )}

            <model-viewer
              ref={immersiveViewerRef}
              src={toAssetUrl(normalizedModelUrl, API_ORIGIN)}
              poster={toAssetUrl(normalizedPosterUrl, API_ORIGIN)}
              camera-controls
              touch-action="pan-y"
              interaction-prompt="none"
              auto-rotate
              ar
              ar-modes="webxr scene-viewer quick-look"
              ar-scale="auto"
              camera-orbit={initialCameraOrbit}
              camera-target={initialCameraTarget}
              min-camera-orbit="auto auto 0.2m"
              max-camera-orbit="auto auto 1m"
              interpolation-decay="100"
              className={css.immersiveViewer}
              onLoad={() => setIsLoaded(true)}
              onError={() => {
                setModelFailed(true);
                setIsImmersive(false);
              }}
            >
              {/* Hotspots */}
              {currentHotspots.map((hs) => (
                <button
                  key={hs.id}
                  className={css.hotspotMarker}
                  slot={`hotspot-${hs.id}`}
                  data-position={hs.position}
                  data-normal={hs.normal}
                  onClick={() => onHotspotClick(hs)}
                  type="button"
                >
                  ✦<span className={css.hotspotTooltip}>{hs.label}</span>
                </button>
              ))}
            </model-viewer>

            {/* Immersive Controls (Utility Bar) */}
            <div className={css.utilityBarImmersive}>
              <button
                className={css.utilBtn}
                onClick={() =>
                  setPerformanceTier((p) => (p === "high" ? "low" : "high"))
                }
                title="Hiệu suất WebGL"
                aria-label="Hiệu suất WebGL"
                type="button"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  {performanceTier === "high" ? (
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  ) : (
                    <>
                      <rect x="6" y="7" width="12" height="10" rx="1" />
                      <line x1="12" y1="17" x2="12" y2="20" />
                      <line x1="8" y1="20" x2="16" y2="20" />
                      <line x1="6" y1="4" x2="18" y2="4" />
                    </>
                  )}
                </svg>
              </button>
              <button
                className={css.utilBtn}
                onClick={() => setNightMode((p) => !p)}
                title="Chế độ đêm"
                aria-label="Chế độ đêm"
                type="button"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  {nightMode ? (
                    <circle cx="12" cy="12" r="5" />
                  ) : (
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  )}
                </svg>
              </button>
              <button
                className={css.utilBtn}
                onClick={() => {
                  const el = immersiveViewerRef.current;
                  if (!el) return;
                  el.setAttribute("camera-orbit", initialCameraOrbit);
                  el.setAttribute("camera-target", initialCameraTarget);
                  setActiveSection(0);
                }}
                title="Reset camera"
                aria-label="Reset camera"
                type="button"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* --- 2. Default Product Page (Scrollable) --- */}
        {!isImmersive && (
          <div className={css.scrollableContainer}>
            {/* Top Breadcrumb Header */}
            <div className={css.topHeader}>
              <Link
                href="/danh-muc-san-pham"
                className={css.breadcrumbLink}
                data-testid="product-detail-back-link"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ marginRight: 6 }}
                >
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                {copy.backLabel}
              </Link>
            </div>

            {/* Split Page Layout */}
            <div className={css.detailLayout}>
              {/* Left/Top Column: Viewer Stage */}
              <div className={css.viewerStage}>
                {hasUsableModel ? (
                  <div className={css.stageWrapper}>
                    <model-viewer
                      ref={viewerRef}
                      src={toAssetUrl(normalizedModelUrl, API_ORIGIN)}
                      poster={toAssetUrl(normalizedPosterUrl, API_ORIGIN)}
                      camera-controls
                      touch-action="pan-y"
                      interaction-prompt="none"
                      auto-rotate
                      camera-orbit={initialCameraOrbit}
                      camera-target={initialCameraTarget}
                      min-camera-orbit="auto auto 0.2m"
                      max-camera-orbit="auto auto 1m"
                      interpolation-decay="100"
                      className={css.stageViewer}
                      onLoad={() => setIsLoaded(true)}
                      onError={() => setModelFailed(true)}
                    >
                      {/* Hotspots */}
                      {currentHotspots.map((hs) => (
                        <button
                          key={hs.id}
                          className={css.hotspotMarker}
                          slot={`hotspot-${hs.id}`}
                          data-position={hs.position}
                          data-normal={hs.normal}
                          onClick={() => onHotspotClick(hs)}
                          type="button"
                        >
                          ✦
                          <span className={css.hotspotTooltip}>{hs.label}</span>
                        </button>
                      ))}
                    </model-viewer>

                    {/* Immersive Transition CTA */}
                    <div className={css.stageOverlay}>
                      <button
                        className={css.immersiveBtn}
                        onClick={() => setIsImmersive(true)}
                        type="button"
                      >
                        <Maximize2 size={16} aria-hidden="true" />
                        {copy.fullscreen3dLabel}
                      </button>
                      <button
                        className={css.continueBtn}
                        onClick={() => scrollToSection(nextDetailSectionId)}
                        type="button"
                      >
                        {copy.productInfoLabel}
                        <ArrowDown size={16} aria-hidden="true" />
                      </button>
                    </div>

                    {/* Camera view switcher inline on default viewer stage */}
                    {viewSections.length > 1 && (
                      <nav className={css.stageSectionNav}>
                        {viewSections.map((s, i) => (
                          <button
                            key={s.id}
                            className={`${css.stageSectionNavItem} ${i === activeSection ? css.stageSectionActive : ""}`}
                            onClick={() => navigateSection(i)}
                            type="button"
                          >
                            {s.name}
                          </button>
                        ))}
                      </nav>
                    )}
                  </div>
                ) : (
                  /* Fallback Gallery (No 3D Model) */
                  <div className={css.galleryWrapper}>
                    {images.length > 0 ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={toAssetUrl(images[galleryIdx], API_ORIGIN)}
                          alt={`${productName} — ${copy.imageLabel} ${galleryIdx + 1}`}
                          className={css.galleryImage}
                        />
                        {images.length > 1 && (
                          <div className={css.galleryDots}>
                            {images.map((_, i) => (
                              <button
                                key={i}
                                className={`${css.galleryDot} ${i === galleryIdx ? css.galleryDotActive : ""}`}
                                onClick={() => setGalleryIdx(i)}
                                type="button"
                                aria-label={`${copy.imageLabel} ${i + 1}`}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className={css.emptyGallery}>
                        <div className={css.emptyIcon}>🏺</div>
                        <span>{copy.imageUpdatingLabel}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right/Bottom Column: Info Rail */}
              <div className={css.infoColumn}>
                {/* Product Name & Subtitles */}
                <div className={css.infoProductHeader}>
                  <h1 className={css.infoProductName} data-testid="product-detail-title">
                    {productName}
                  </h1>
                  {productSubtitle && (
                    <div className={css.infoProductSubtitle}>
                      {productSubtitle}
                    </div>
                  )}

                  {/* Current view description in default stage */}
                  {currentSection?.description && (
                    <div className={css.currentSectionDesc}>
                      <span className={css.sectionDescLabel}>
                        {copy.viewLabel}: {currentSection.name}
                      </span>
                      <p>{currentSection.description}</p>
                    </div>
                  )}
                </div>

                {/* 3D/360 CTA Section */}
                {(hasUsableModel || ctaVideo360) && (
                  <div className={css.actionButtons}>
                    {hasUsableModel && (
                      <button
                        className={css.primaryActionBtn}
                        onClick={() => setIsImmersive(true)}
                        type="button"
                      >
                        <Maximize2 size={17} aria-hidden="true" />
                        {copy.interact3dLabel}
                      </button>
                    )}
                    {ctaVideo360 && (
                      <button
                        className={css.secondaryActionBtn}
                        onClick={openVideo360}
                        aria-label={copy.video360Label}
                        type="button"
                      >
                        ▶️ {copy.video360Label}
                      </button>
                    )}
                  </div>
                )}

                {/* Variants Section */}
                {variants.length > 0 && (
                  <div id="variants" className={css.inlineSection}>
                    <h2 className={css.sectionTitleInline}>
                      {copy.variantsTitle}
                    </h2>
                    <div className={css.variantsSwatchesInline}>
                      {variants.map((v, i) => (
                        <button
                          key={v.id}
                          className={`${css.variantSwatchInline} ${i === activeVariant ? css.swatchActiveInline : ""}`}
                          onClick={() => setActiveVariant(i)}
                          type="button"
                        >
                          <div
                            className={css.swatchCircleInline}
                            style={{ background: v.swatch }}
                          />
                          <span className={css.swatchNameInline}>{v.name}</span>
                        </button>
                      ))}
                    </div>
                    <div className={css.variantDetailInline}>
                      {variants[activeVariant]?.image && (
                        <div className={css.variantPreviewInline}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={toAssetUrl(
                              variants[activeVariant].image,
                              API_ORIGIN,
                            )}
                            alt={variants[activeVariant].name}
                          />
                        </div>
                      )}
                      <div className={css.variantTextInline}>
                        <span className={css.variantLabelInline}>
                          {variants[activeVariant]?.name}
                        </span>
                        {variants[activeVariant]?.description && (
                          <p className={css.variantDescInline}>
                            {variants[activeVariant].description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Story Section */}
                {story && (
                  <div id="story" className={css.inlineSection}>
                    <h2 className={css.sectionTitleInline}>
                      {copy.storyTitle}
                    </h2>
                    {story.image && (
                      <div className={css.storyImageInline}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={toAssetUrl(story.image, API_ORIGIN)}
                          alt={story.title}
                        />
                      </div>
                    )}
                    <h3 className={css.storyTitleInline}>{story.title}</h3>
                    <div className={css.storySubtitleInline}>
                      {story.subtitle}
                    </div>
                    <p className={css.storyContentInline}>{story.content}</p>
                  </div>
                )}

                {/* Specs Section */}
                {Object.keys(specs).length > 0 && (
                  <div id="specs" className={css.inlineSection}>
                    <h2 className={css.sectionTitleInline}>
                      {copy.specsTitle}
                    </h2>
                    <div className={css.specsGridInline}>
                      {Object.entries(specs).map(([label, value]) => (
                        <div className={css.specItemInline} key={label}>
                          <div className={css.specLabelInline}>{label}</div>
                          <div className={css.specValueInline}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact & RFQ Inquiry Section */}
                <div id="contact" className={css.inlineSection}>
                  <h2 className={css.sectionTitleInline}>{copy.contactTitle}</h2>
                  <div className={css.contactOptionsInline}>
                    {ctaZalo && (
                      <a
                        href={ctaZalo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={css.contactLinkInline}
                      >
                        💬 {copy.zaloLabel}
                      </a>
                    )}
                    {ctaPhone && (
                      <a
                        href={`tel:${ctaPhone.replace(/\s/g, "")}`}
                        className={css.contactLinkInline}
                      >
                        📞 {copy.hotlineLabel}: {ctaPhone}
                      </a>
                    )}
                    {ctaEmail && (
                      hasUsableEmail ? (
                        <a
                          href={`mailto:${ctaEmail}`}
                          className={css.contactLinkInline}
                        >
                          ✉️ {copy.emailLabel}: {ctaEmail}
                        </a>
                      ) : (
                        <span className={`${css.contactLinkInline} ${css.contactLinkInlineMuted}`} aria-disabled="true">
                          ✉️ {copy.emailLabel}: {ctaEmail}
                        </span>
                      )
                    )}
                  </div>
                  <div className={css.rfqFormInline}>
                    <h3 className={css.rfqTitleInline}>
                      {copy.rfqTitle}
                    </h3>
                    {renderContactForm()}
                  </div>
                </div>
              </div>
            </div>

            {/* Right-rail shortcuts (smooth scrolls to sections) */}
            <div className={css.categoryIconsNormal}>
              {variants.length > 0 && (
                <button
                  className={css.catIcon}
                  onClick={() => scrollToSection("variants")}
                  title={copy.shortcutVariantLabel}
                  aria-label={copy.shortcutVariantLabel}
                  type="button"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                  </svg>
                </button>
              )}
              {story && (
                <button
                  className={css.catIcon}
                  onClick={() => scrollToSection("story")}
                  title={copy.shortcutStoryLabel}
                  aria-label={copy.shortcutStoryLabel}
                  type="button"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M4 4h6a2 2 0 012 2v14l-4-2-4 2V6a2 2 0 012-2z" />
                    <path d="M14 4h6a2 2 0 012 2v14l-4-2-4 2V6a2 2 0 012-2z" />
                  </svg>
                </button>
              )}
              {Object.keys(specs).length > 0 && (
                <button
                  className={css.catIcon}
                  onClick={() => scrollToSection("specs")}
                  title={copy.shortcutSpecsLabel}
                  aria-label={copy.shortcutSpecsLabel}
                  type="button"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <line x1="8" y1="9" x2="16" y2="9" />
                    <line x1="8" y1="13" x2="14" y2="13" />
                    <line x1="8" y1="17" x2="12" y2="17" />
                  </svg>
                </button>
              )}
              <button
                className={css.catIcon}
                onClick={() => scrollToSection("contact")}
                title={copy.shortcutContactLabel}
                aria-label={copy.shortcutContactLabel}
                type="button"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                </svg>
              </button>
            </div>

            {/* Floating CTA for Mobile (scrolls to RFQ form) */}
            <button
              className={css.floatingCtaMobile}
              onClick={() => scrollToSection("contact")}
              type="button"
              aria-label={copy.shortcutContactLabel}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
            </button>
          </div>
        )}

        {/* Backdrop modals (active panel, video) */}
        {renderPanels()}
        {renderVideo360Modal()}
      </div>
    </>
  );
}
