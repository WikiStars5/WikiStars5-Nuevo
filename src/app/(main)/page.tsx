
import * as React from 'react';
import { getSdks } from '@/firebase/server';
import type { FeaturedFigure } from '@/lib/types';
import HomePageContent from './page-client';
import { unstable_cache as cache } from 'next/cache';


// --- Server-Side Data Fetching with Caching ---

/**
 * Fetches the initial list of featured figures from the server.
 * Wrapped in cache to minimize Firestore reads across multiple users.
 */
const getFeaturedFigures = cache(
  async (): Promise<FeaturedFigure[]> => {
    try {
      const { firestore } = getSdks();
      // Use Admin SDK syntax
      const snapshot = await firestore.collection('featured_figures').orderBy('order').get();
      
      if (snapshot.empty) {
        return [];
      }
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeaturedFigure));
    } catch (error) {
      console.error("Error fetching featured figures on server:", error);
      return [];
    }
  },
  ['featured-figures-main'],
  { revalidate: 300 } // Cache for 5 minutes
);


// --- Main Page Component (Server Component) ---

export default async function HomePage() {
  // Fetch data on the server - this now hits the cache if available
  const initialFeaturedFigures = await getFeaturedFigures();

  return (
    <HomePageContent
      initialFeaturedFigures={initialFeaturedFigures}
    />
  );
}
