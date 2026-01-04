
import * as React from 'react';
import { getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { getSdks } from '@/firebase/server';
import type { FeaturedFigure } from '@/lib/types';
import HomePageContent from './page-client';


// --- Server-Side Data Fetching ---

/**
 * Fetches the initial list of featured figures from the server.
 * Starposts are now fetched on the client to allow for personalization.
 */
async function getFeaturedFigures(): Promise<FeaturedFigure[]> {
  try {
    const { firestore } = getSdks();
    const featuredQuery = query(collection(firestore, 'featured_figures'), orderBy('order'));
    const snapshot = await getDocs(featuredQuery);
    
    if (snapshot.empty) {
      return [];
    }
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeaturedFigure));
  } catch (error) {
    console.error("Error fetching featured figures on server:", error);
    return []; // Return empty array on error to prevent crashing
  }
}


// --- Main Page Component (Server Component) ---

export default async function HomePage() {
  // Fetch data on the server in parallel
  const initialFeaturedFigures = await getFeaturedFigures();

  // Starposts are now fetched on the client-side in HomePageContent
  return (
    <HomePageContent
      initialFeaturedFigures={initialFeaturedFigures}
    />
  );
}
