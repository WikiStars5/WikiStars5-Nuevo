
import * as React from 'react';
import { getDocs, collection, query, orderBy, limit, DocumentSnapshot, getDoc } from 'firebase/firestore';
import { getSdks } from '@/firebase/server';
import type { Comment, FeaturedFigure } from '@/lib/types';
import HomePageContent from '@/app/(main)/page-client';


// --- Server-Side Data Fetching ---

async function getFeaturedFigures(): Promise<FeaturedFigure[]> {
    const { firestore } = getSdks();
    const featuredRef = collection(firestore, 'featured_figures');
    const q = query(featuredRef, orderBy('order'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeaturedFigure));
}

async function getInitialStarposts(): Promise<{ posts: Comment[], lastVisible: DocumentSnapshot | null, hasMore: boolean }> {
    const { firestore } = getSdks();
    const starpostsRef = collection(firestore, 'starposts');
    const q = query(starpostsRef, orderBy('createdAt', 'desc'), limit(10));
    const snapshot = await getDocs(q);

    const posts = snapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore Timestamps to plain objects for serialization
        return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt.toDate().toISOString(),
            updatedAt: data.updatedAt?.toDate().toISOString() || null,
        } as unknown as Comment;
    });

    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === 10;

    return { posts, lastVisible, hasMore };
}


// --- Server Component (Wrapper) ---
// This component fetches the initial data on the server.

export default async function HomePage() {
  const initialFeaturedFigures = await getFeaturedFigures();
  const { posts: initialPosts, lastVisible, hasMore } = await getInitialStarposts();
  
  // A simple hack to serialize the DocumentSnapshot
  const serializableLastVisible = lastVisible ? {
    _id: lastVisible.id,
    _data: lastVisible.data(),
  } : null;

  return (
    <HomePageContent
      initialFeaturedFigures={initialFeaturedFigures}
      initialPosts={initialPosts}
      initialLastVisible={serializableLastVisible as any}
      initialHasMore={hasMore}
    />
  );
}

// Helper to deserialize the snapshot on the client (won't be needed if we adjust client component)
// This is just a conceptual note; the client will need to handle this.
function deserializeSnapshot(data: any) {
    if (!data) return null;
    // The client-side Firebase SDK can't "rehydrate" a server-side DocumentSnapshot.
    // The `startAfter` function needs the actual object.
    // For this simple pagination, we can pass the field value to start after.
    return data;
}

