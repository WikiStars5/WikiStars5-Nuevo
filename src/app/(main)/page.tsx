
import * as React from 'react';
import { getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { getSdks } from '@/firebase/server';
import type { Comment, FeaturedFigure } from '@/lib/types';
import HomePageContent from './page-client';


// --- Server-Side Data Fetching ---

async function getFeaturedFigures(): Promise<FeaturedFigure[]> {
  try {
    const { firestore } = getSdks();
    const featuredQuery = query(collection(firestore, 'featured_figures'), orderBy('order'));
    const snapshot = await getDocs(featuredQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeaturedFigure));
  } catch (error) {
    console.error("Error fetching featured figures:", error);
    return []; // Return empty array on error
  }
}

async function getInitialStarposts(): Promise<Comment[]> {
  try {
    const { firestore } = getSdks();
    const firstBatch = query(collection(firestore, 'starposts'), orderBy('createdAt', 'desc'), limit(10));
    const snapshot = await getDocs(firstBatch);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
  } catch (error) {
    console.error("Error fetching initial starposts:", error);
    return []; // Return empty array on error
  }
}

// --- Main Server Component ---

export default async function HomePage() {
  // Fetch data on the server in parallel
  const [featuredFigures, initialPosts] = await Promise.all([
    getFeaturedFigures(),
    getInitialStarposts(),
  ]);

  // Pass server-fetched data to the client component
  return <HomePageContent initialFeaturedFigures={featuredFigures} initialPosts={initialPosts} />;
}
