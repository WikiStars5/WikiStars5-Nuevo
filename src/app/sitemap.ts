import { getSdks } from '@/firebase/server';
import type { Figure } from '@/lib/types';

const URL = 'https://wikistars5.co';

export default async function sitemap() {
  const { firestore } = getSdks();

  // Fetch all figures to generate dynamic routes
  const figuresSnapshot = await firestore.collection('figures').get();
  const figures = figuresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Figure));

  const figureUrls = figures.map((figure) => {
    return {
      url: `${URL}/figures/${figure.id}`,
      lastModified: figure.createdAt ? figure.createdAt.toDate() : new Date(),
    };
  });

  const staticUrls = [
    {
      url: URL,
      lastModified: new Date(),
    },
    {
      url: `${URL}/figures`,
      lastModified: new Date(),
    },
    {
      url: `${URL}/profile`,
      lastModified: new Date(),
    }
  ];

  return [...staticUrls, ...figureUrls];
}
