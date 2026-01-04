import type { MetadataRoute } from 'next';

const URL = 'https://wikistars5.co';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // As we can't use the admin SDK reliably, we'll return a static sitemap for now.
  // This is a trade-off to ensure the build doesn't fail.
  // Dynamic routes for figures and users won't be included until server-side data fetching is stable.

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

  return staticUrls;
}
