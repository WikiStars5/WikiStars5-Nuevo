'use server';

import { getSdks } from '@/firebase/server';
import type { Figure } from '@/lib/types';

/**
 * Searches for public figures in Firestore based on a hashtag.
 * It queries the `tags` array field.
 * @param hashtag The hashtag to search for, without the '#'.
 * @returns A promise that resolves to an array of matching Figure objects.
 */
export async function searchFiguresByHashtag(hashtag: string): Promise<Figure[]> {
  const trimmedHashtag = hashtag.trim().toLowerCase();
  if (!trimmedHashtag) {
    return [];
  }

  const { firestore } = getSdks();

  try {
    const figuresCollection = firestore.collection('figures');
    
    const firestoreQuery = figuresCollection
      .where('tags', 'array-contains', trimmedHashtag)
      .where('approved', '==', true)
      .limit(10);

    const snapshot = await firestoreQuery.get();

    if (snapshot.empty) {
      return [];
    }
    
    const figures = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            imageUrl: data.imageUrl,
            imageHint: data.imageHint,
            nationality: data.nationality,
            tags: data.tags,
            isFeatured: data.isFeatured,
            nameKeywords: data.nameKeywords,
            approved: data.approved,
            description: data.description,
            photoUrl: data.photoUrl,
        } as Figure;
    });

    return figures;
  } catch (error) {
    console.error('Error searching figures by hashtag:', error);
    return [];
  }
}
