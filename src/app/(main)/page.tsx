
import * as React from 'react';
import { getDocs, collection, query, orderBy, limit, DocumentSnapshot, getDoc } from 'firebase/firestore';
import { getSdks } from '@/firebase/server';
import type { Comment, FeaturedFigure } from '@/lib/types';
import HomePageContent from './page-client';


// --- Server-Side Data Fetching ---

/**
 * Fetches the initial list of featured figures from the server.
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

/**
 * Fetches the initial batch of starposts from the server.
 */
async function getInitialPosts(): Promise<{ posts: Comment[], lastVisible: any | null, hasMore: boolean }> {
  try {
    const { firestore } = getSdks();
    const postsQuery = query(
      collection(firestore, 'starposts'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const snapshot = await getDocs(postsQuery);

    if (snapshot.empty) {
      return { posts: [], lastVisible: null, hasMore: false };
    }

    const posts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            // Convert Firestore Timestamps to serializable strings
            createdAt: data.createdAt.toDate().toISOString(),
            updatedAt: data.updatedAt?.toDate().toISOString() || null,
        } as unknown as Comment;
    });
    
    const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];

    // To make the snapshot serializable, we extract the necessary data from it.
    // The client will use this data to construct the next query.
    const lastVisibleData = lastVisibleDoc ? {
        _data: {
            // We only need the field we are ordering by for the cursor.
            createdAt: (lastVisibleDoc.data().createdAt as any).toDate().toISOString()
        }
    } : null;

    return {
      posts,
      lastVisible: lastVisibleData,
      hasMore: snapshot.docs.length === 10,
    };
  } catch (error) {
    console.error("Error fetching initial posts on server:", error);
    return { posts: [], lastVisible: null, hasMore: false };
  }
}

// --- Main Page Component (Server Component) ---

export default async function HomePage() {
  // Fetch data on the server in parallel
  const [initialFeaturedFigures, { posts, lastVisible, hasMore }] = await Promise.all([
    getFeaturedFigures(),
    getInitialPosts()
  ]);

  return (
    <HomePageContent
      initialFeaturedFigures={initialFeaturedFigures}
      initialPosts={posts}
      initialLastVisible={lastVisible}
      initialHasMore={hasMore}
    />
  );
}
