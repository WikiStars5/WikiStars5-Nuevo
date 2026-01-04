import { getSdks } from '@/firebase/server';
import type { Figure } from '@/lib/types';
import type { MetadataRoute } from 'next';

const URL = 'https://wikistars5.co';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { firestore } = getSdks();

  // Fetch all figures to generate dynamic routes
  const figuresSnapshot = await firestore.collection('figures').get();
  const figures = figuresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Figure));

  const figureUrls = figures.map((figure) => ({
    url: `${URL}/figures/${figure.id}`,
    lastModified: figure.updatedAt?.toDate() || figure.createdAt?.toDate() || new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));
  
  // Fetch all users to generate their public profile pages
  const usersSnapshot = await firestore.collection('users').get();
  const userUrls = usersSnapshot.docs
    .map(doc => doc.data()?.username)
    .filter(username => !!username) // Filter out users without a username
    .map((username) => ({
      url: `${URL}/u/${encodeURIComponent(username)}`,
      lastModified: new Date(), // User profiles can change often
      changeFrequency: 'daily' as const,
      priority: 0.6,
    }));


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
      priority: 0.7,
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

  return [...staticUrls, ...figureUrls, ...userUrls];
}
