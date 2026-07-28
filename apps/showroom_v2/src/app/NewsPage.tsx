import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useShowroomData } from './data/ShowroomContext';
import Link from './mocks/next/link';
import './news-page.css';

const E = [0.22, 1, 0.36, 1] as const;
const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0 } };

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div variants={fadeUp} initial="show" animate="show" transition={{ duration: 1.0, ease: E, delay }} className={className}>
      {children}
    </motion.div>
  );
}

export function NewsPage() {
  const { newsHero, newsCards, newsLandingInfo } = useShowroomData();
  const [activeCategory, setActiveCategory] = useState(newsLandingInfo.allCategoryLabel);

  const categories = useMemo(() => {
    const labels = new Set<string>();
    [newsHero, ...newsCards].forEach((item) => {
      if (item?.category) labels.add(item.category);
    });
    return [newsLandingInfo.allCategoryLabel, ...Array.from(labels)];
  }, [newsCards, newsHero, newsLandingInfo.allCategoryLabel]);

  useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory(newsLandingInfo.allCategoryLabel);
    }
  }, [activeCategory, categories, newsLandingInfo.allCategoryLabel]);

  const filteredNews = activeCategory === newsLandingInfo.allCategoryLabel
    ? newsCards
    : newsCards.filter((item) => item.category === activeCategory);

  return (
    <div className="news-page">
      <header className="news-header">
        <Reveal>
          <span className="news-header-eyebrow">{newsLandingInfo.eyebrow}</span>
          <h1 className="news-header-title">{newsLandingInfo.title}</h1>
          <p className="news-header-desc">
            {newsLandingInfo.desc}
          </p>
        </Reveal>
      </header>

      {newsHero && (
        <Reveal delay={0.2} className="news-hero-article">
          <Link
            className="hero-article-inner"
            aria-label={`${newsLandingInfo.readArticleLabel}: ${newsHero.title}`}
            href={`/tin-tuc/${newsHero.slug}`}
          >
            <img src={newsHero.image} alt={newsHero.title} className="hero-article-bg" />
            <div className="hero-article-overlay"></div>
            <div className="hero-article-content">
              <span className="article-badge">{newsLandingInfo.featuredLabel}</span>
              <h2 className="hero-article-title">{newsHero.title}</h2>
              <div className="hero-article-meta">
                <span>{newsHero.category}</span>
                <span className="dot"></span>
                <span>{newsHero.date}</span>
              </div>
              <p className="hero-article-excerpt" style={{ marginBottom: 0 }}>
                {newsHero.excerpt}
              </p>
              <span className="read-more-btn">
                {newsLandingInfo.readArticleLabel}
                <ArrowRight size={14} aria-hidden="true" />
              </span>
            </div>
          </Link>
        </Reveal>
      )}

      <nav className="news-filter-container">
        {categories.map((category) => (
          <button
            key={category}
            className={`filter-tab ${activeCategory === category ? 'is-active' : ''}`}
            onClick={() => setActiveCategory(category)}
            type="button"
          >
            {category}
          </button>
        ))}
      </nav>

      <div className="news-grid">
        {filteredNews.length > 0 ? (
          filteredNews.map((item, index) => (
            <Reveal key={item.id} delay={0.1 * index} className="news-card">
              <Link
                className="news-card-link"
                href={`/tin-tuc/${item.slug}`}
                aria-label={`${newsLandingInfo.readArticleLabel}: ${item.title}`}
              >
                <div className="news-card-img-wrapper">
                  <img src={item.image} alt={item.title} className="news-card-img" />
                </div>
                <div className="news-card-meta">
                  <span className="news-card-category">{item.category}</span>
                  <span>•</span>
                  <span className="news-card-date">{item.date}</span>
                </div>
                <h3 className="news-card-title">{item.title}</h3>
                <p className="news-card-excerpt">{item.excerpt}</p>
                <span className="news-card-cta">
                  {newsLandingInfo.readArticleLabel}
                  <ArrowRight size={13} aria-hidden="true" />
                </span>
              </Link>
            </Reveal>
          ))
        ) : (
          <div className="news-empty-state">
            {newsLandingInfo.emptyStateLabel}
          </div>
        )}
      </div>
    </div>
  );
}
