import { MetadataRoute } from 'next'

/**
 * Generates the robots.txt file for the application.
 * This file tells search engines which parts of the site they can crawl.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/profile/', '/login/'],
    },
    sitemap: 'https://starryz5.com/sitemap.xml',
  }
}
