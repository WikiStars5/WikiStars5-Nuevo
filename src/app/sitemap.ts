import type { MetadataRoute } from 'next';
import { getSdks } from '@/firebase/server';
import type { Figure } from '@/lib/types';

const URL = 'https://starryz5.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { firestore } = getSdks();

  // 1. Get static pages
  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${URL}/figures`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
     {
      url: `${URL}/rules`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
     {
      url: `${URL}/disclaimer`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // 2. Get dynamic figure pages
  let figureUrls: MetadataRoute.Sitemap = [];
  try {
    const figuresSnapshot = await firestore.collection('figures').get();
    figureUrls = figuresSnapshot.docs.map(doc => {
      const figure = doc.data() as Figure;
      // Use the 'updatedAt' field if it exists, otherwise fall back to a recent date.
      // This is better than createdAt because it reflects content changes.
      const lastModified = figure.updatedAt ? figure.updatedAt.toDate() : new Date();
      return {
        url: `${URL}/figures/${doc.id}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.7,
      };
    });
  } catch (error) {
    console.error("Error fetching figures for sitemap:", error);
    // In case of an error, we'll just return the static URLs to avoid breaking the build.
    return staticUrls;
  }
  
  // 3. Combine and return all URLs
  return [...staticUrls, ...figureUrls];
}
