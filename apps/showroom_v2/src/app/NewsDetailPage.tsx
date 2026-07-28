import { useEffect, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Clock3, UserRound } from 'lucide-react';
import { toRenderableRichHtml } from '@gomhoasen/ui-showroom';
import { useShowroomData } from './data/ShowroomContext';
import type { ShowroomV2Data } from './data/adapter';
import { updatePageMetadata } from './data/page-metadata';
import Link from './mocks/next/link';
import './news-detail-page.css';

type NewsArticle = ShowroomV2Data['newsCards'][number];

function articleHref(article: NewsArticle) {
  return `/tin-tuc/${article.slug}`;
}

export function NewsDetailPage({ slug }: { slug: string }) {
  const {
    brand,
    newsHero,
    newsCards,
    newsLandingInfo,
  } = useShowroomData();

  const articles = useMemo(
    () => [newsHero, ...newsCards].filter((item): item is NewsArticle => item !== null),
    [newsCards, newsHero],
  );
  const article = articles.find((item) => item.slug === slug);
  const related = article
    ? [
        ...articles.filter((item) => item.id !== article.id && item.category === article.category),
        ...articles.filter((item) => item.id !== article.id && item.category !== article.category),
      ].slice(0, 3)
    : [];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    updatePageMetadata({
      title: article
        ? `${article.title} | ${brand.name}`
        : `${newsLandingInfo.notFoundTitle} | ${brand.name}`,
      description: article?.excerpt ?? newsLandingInfo.notFoundBody,
      path: `/tin-tuc/${slug}`,
      image: article?.image,
    });
  }, [article, brand.name, newsLandingInfo.notFoundBody, newsLandingInfo.notFoundTitle, slug]);

  if (!article) {
    return (
      <section className="news-detail-not-found" aria-labelledby="news-not-found-title">
        <div>
          <span className="news-detail-kicker">404</span>
          <h1 id="news-not-found-title">{newsLandingInfo.notFoundTitle}</h1>
          <p>{newsLandingInfo.notFoundBody}</p>
          <Link href="/tin-tuc" className="news-detail-back">
            <ArrowLeft size={15} aria-hidden="true" />
            {newsLandingInfo.backToNewsLabel}
          </Link>
        </div>
      </section>
    );
  }

  const bodyHtml = toRenderableRichHtml(article.content);

  return (
    <article className="news-detail-page">
      <header className="news-detail-hero">
        <img src={article.image} alt={article.title} className="news-detail-hero-image" />
        <div className="news-detail-hero-overlay" aria-hidden="true" />
        <div className="news-detail-hero-content">
          <Link href="/tin-tuc" className="news-detail-back news-detail-back-on-image">
            <ArrowLeft size={15} aria-hidden="true" />
            {newsLandingInfo.backToNewsLabel}
          </Link>
          <span className="news-detail-category">{article.category}</span>
          <h1>{article.title}</h1>
          <p className="news-detail-lead">{article.excerpt}</p>
          <div className="news-detail-meta">
            <span>{article.date}</span>
            {article.author && (
              <span>
                <UserRound size={14} aria-hidden="true" />
                {article.author}
              </span>
            )}
            {article.readingTime && (
              <span>
                <Clock3 size={14} aria-hidden="true" />
                {article.readingTime}
              </span>
            )}
          </div>
        </div>
      </header>

      <div
        className="news-detail-body news-detail-rich"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      {related.length > 0 && (
        <section className="news-related" aria-labelledby="news-related-title">
          <div className="news-related-inner">
            <h2 id="news-related-title">{newsLandingInfo.relatedTitle}</h2>
            <div className="news-related-grid">
              {related.map((item) => (
                <Link key={item.id} href={articleHref(item)} className="news-related-item">
                  <img src={item.image} alt={item.title} />
                  <span className="news-related-category">{item.category}</span>
                  <h3>{item.title}</h3>
                  <span className="news-related-cta">
                    {newsLandingInfo.readArticleLabel}
                    <ArrowRight size={13} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
