
import * as React from 'react';
import { getSdks } from '@/firebase/server';
import type { FeaturedFigure } from '@/lib/types';
import HomePageContent from './page-client';


// --- Server-Side Data Fetching ---

/**
 * Fetches the initial list of featured figures from the server using Admin SDK.
 */
async function getFeaturedFigures(): Promise<FeaturedFigure[]> {
  try {
    const { firestore } = getSdks();
    // Usar sintaxis correcta de Admin SDK (no mezclar con funciones de cliente como query/orderBy)
    const snapshot = await firestore.collection('featured_figures').orderBy('order').get();
    
    if (snapshot.empty) {
      return [];
    }
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeaturedFigure));
  } catch (error) {
    console.error("Error fetching featured figures on server:", error);
    return [];
  }
}


// --- Main Page Component (Server Component) ---

export default async function HomePage() {
  // Fetch data on the server
  const initialFeaturedFigures = await getFeaturedFigures();

  return (
    <HomePageContent
      initialFeaturedFigures={initialFeaturedFigures}
    />
  );
}
