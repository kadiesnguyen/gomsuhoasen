import type { ShowroomV2ContentContract } from '@gomhoasen/contracts';
import { api } from './api';

export type NewsLanding = ShowroomV2ContentContract['newsLanding'];
export type NewsCard = NonNullable<NewsLanding['newsCards']>[number];
export type NewsCategory = NonNullable<NewsLanding['categories']>[number];

export async function loadV2News(): Promise<{
  content: ShowroomV2ContentContract;
  newsLanding: NewsLanding;
}> {
  const content = await api.site.getV2Content();
  return {
    content,
    newsLanding: content.newsLanding,
  };
}

export async function saveV2NewsLanding(
  content: ShowroomV2ContentContract,
  newsLanding: NewsLanding,
): Promise<ShowroomV2ContentContract> {
  return api.site.updateV2Content({
    ...content,
    newsLanding: {
      ...content.newsLanding,
      ...newsLanding,
      categories: newsLanding.categories ?? content.newsLanding.categories ?? [],
      newsCards: newsLanding.newsCards ?? content.newsLanding.newsCards ?? [],
    },
  });
}

export function listNewsCards(newsLanding: NewsLanding): NewsCard[] {
  return Array.isArray(newsLanding.newsCards) ? newsLanding.newsCards : [];
}

export function listNewsCategories(newsLanding: NewsLanding): NewsCategory[] {
  return Array.isArray(newsLanding.categories) ? newsLanding.categories : [];
}
