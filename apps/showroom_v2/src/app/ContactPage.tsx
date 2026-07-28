import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Package, Truck, Headset, MapPin } from 'lucide-react';
import { useShowroomData } from './data/ShowroomContext';
import { showroomApiPost } from '@gomhoasen/ui-showroom';
import { GHS_API, RFQ_SOURCES } from '@gomhoasen/contracts';
import { ArtFrame } from './ArtFrame';
import './contact-page.css';

const ICON_MAP: Record<string, React.ReactNode> = {
  check: <CheckCircle size={24} strokeWidth={1.5} />,
  package: <Package size={24} strokeWidth={1.5} />,
  truck: <Truck size={24} strokeWidth={1.5} />,
  headset: <Headset size={24} strokeWidth={1.5} />,
};

const E = [0.22, 1, 0.36, 1] as const;
const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0 } };

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div variants={fadeUp} initial="show" animate="show" transition={{ duration: 1.0, ease: E, delay }} className={className}>
      {children}
    </motion.div>
  );
}

export function ContactPage() {
  const { brand, trustBadges, contactLanding } = useShowroomData();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const locationParts = useMemo(() => brand.location?.split(',').map((part) => part.trim()) ?? [], [brand.location]);
  const isEmailPending = !brand.email || !brand.email.includes('@');
  const phoneHref = brand.phone ? `tel:${brand.phone.replace(/[^\d+]/g, '')}` : '';
  const mapHref = contactLanding.mapCtaHref?.trim() ?? '';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg('');
    const form = event.currentTarget;
    const fd = new FormData(form);

    const payload = {
      customerName: String(fd.get('name') ?? '').trim(),
      customerPhone: String(fd.get('phone') ?? '').trim(),
      customerEmail: String(fd.get('email') ?? '').trim() || null,
      message: String(fd.get('note') ?? '').trim(),
      lineItems: [],
      source: RFQ_SOURCES.CONTACT_PAGE,
    };

    try {
      await showroomApiPost(GHS_API.RFQ.PUBLIC_SUBMIT, payload);
      form.reset();
      setIsSubmitting(false);
      setIsSubmitted(true);
    } catch {
      setErrorMsg(contactLanding.errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <section className="contact-hero">
        <img src={contactLanding.heroBg} alt={brand.name} className="contact-hero-bg" />
        <div className="contact-hero-overlay"></div>
        <Reveal className="contact-hero-content">
          <h1 className="contact-hero-title">{contactLanding.title}</h1>
          <p className="contact-hero-desc">
            {contactLanding.desc}
          </p>
        </Reveal>
      </section>

      <section className="contact-body">
        <Reveal delay={0.1} className="contact-form-wrapper">
          <h2 className="contact-form-title">{contactLanding.formTitle}</h2>
          {isSubmitted ? (
            <div className="form-success-msg" role="status" aria-live="polite">
              <CheckCircle size={32} className="success-icon" />
              <p style={{ whiteSpace: 'pre-line' }}>{contactLanding.successMessage}</p>
              <button type="button" className="art-btn form-reset-btn" onClick={() => setIsSubmitted(false)}>
                <ArtFrame />
                <span>{contactLanding.successResetLabel}</span>
              </button>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <input type="text" name="name" className="form-input" placeholder={contactLanding.namePlaceholder} autoComplete="name" minLength={2} required />
              </div>
              <div className="form-group">
                <input
                  type="tel"
                  name="phone"
                  className="form-input"
                  placeholder={contactLanding.phonePlaceholder}
                  autoComplete="tel"
                  inputMode="tel"
                  minLength={8}
                  maxLength={20}
                  required
                />
              </div>
              <div className="form-group">
                <input type="email" name="email" className="form-input" placeholder={contactLanding.emailPlaceholder} autoComplete="email" />
              </div>
              <div className="form-group">
                <textarea name="note" className="form-input" placeholder={contactLanding.notePlaceholder} minLength={5} required></textarea>
              </div>
              {errorMsg && <p role="alert" style={{ color: '#ff6b6b', fontSize: '14px', marginBottom: '16px' }}>{errorMsg}</p>}
              <button type="submit" className="art-btn form-submit-btn" disabled={isSubmitting} aria-busy={isSubmitting}>
                <ArtFrame />
                <span>{isSubmitting ? contactLanding.submittingLabel : contactLanding.submitLabel}</span>
              </button>
            </form>
          )}
        </Reveal>

        <Reveal delay={0.2} className="contact-info-wrapper">
          <div className="info-block">
            <span className="info-label">{contactLanding.showroomLabel}</span>
            <span className="info-value">
              {locationParts.map((part, index) => (
                <React.Fragment key={`${part}-${index}`}>
                  {part}
                  {index < locationParts.length - 1 ? ', ' : ''}
                  {index === 0 && locationParts.length > 1 ? <br /> : null}
                </React.Fragment>
              ))}
            </span>
          </div>
          <div className="info-block">
            <span className="info-label">{contactLanding.hotlineLabel}</span>
            {phoneHref ? (
              <a className="info-value info-link" href={phoneHref}>{brand.phone}</a>
            ) : (
              <span className="info-value is-muted">{brand.phone}</span>
            )}
          </div>
          <div className="info-block">
            <span className="info-label">{contactLanding.openingHoursLabel}</span>
            <span className="info-value" style={{ whiteSpace: 'pre-wrap' }}>{contactLanding.openingHours}</span>
          </div>
          <div className="info-block">
            <span className="info-label">{contactLanding.emailLabel}</span>
            {isEmailPending ? (
              <span className="info-value is-muted">{brand.email}</span>
            ) : (
              <a className="info-value info-link" href={`mailto:${brand.email}`}>{brand.email}</a>
            )}
          </div>
        </Reveal>
      </section>

      <Reveal delay={0.3} className="contact-location-band">
        <img src={contactLanding.locationBandImage} alt={contactLanding.locationImageAlt} className="location-bg" />
        <div className="location-overlay"></div>
        {mapHref ? (
          <a href={mapHref} target="_blank" rel="noreferrer" className="art-btn location-cta">
            <ArtFrame />
            <MapPin size={18} strokeWidth={1.5} />
            <span>{contactLanding.mapCtaLabel}</span>
          </a>
        ) : (
          <span className="art-btn location-cta" aria-disabled="true">
            <ArtFrame />
            <MapPin size={18} strokeWidth={1.5} />
            <span>{contactLanding.mapCtaLabel}</span>
          </span>
        )}
      </Reveal>

      <div className="contact-trust-strip">
        {trustBadges.map((badge, index) => (
          <Reveal key={index} delay={0.1 * index} className="contact-trust-item">
            <div className="trust-item-icon" aria-hidden="true">{ICON_MAP[badge.iconType]}</div>
            <h4 className="trust-item-title">{badge.title}</h4>
            <p className="trust-item-desc">{badge.desc}</p>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
