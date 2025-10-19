'use server';

import { getSdks } from '@/firebase/server';
import type { Figure } from '@/lib/types';

/**
 * Normalizes a string by converting it to lowercase and removing accents.
 * @param text The string to normalize.
 * @returns The normalized string.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Searches for public figures in Firestore based on a name query.
 * Uses a pre-computed `nameKeywords` array for efficient prefix searching
 * and only returns figures that have been approved.
 * @param query The user's search term.
 * @returns A promise that resolves to an array of matching Figure objects.
 */
export async function searchFigures(query: string): Promise<Figure[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const normalizedQuery = normalizeText(trimmedQuery);
  const { firestore } = getSdks();

  try {
    const figuresCollection = firestore.collection('figures');
    
    // This query uses an index on `nameKeywords` and `approved` for efficient searching.
    const firestoreQuery = figuresCollection
      .where('nameKeywords', 'array-contains', normalizedQuery)
      .where('approved', '==', true) // Only show approved figures
      .limit(10);

    const snapshot = await firestoreQuery.get();

    if (snapshot.empty) {
      return [];
    }
    
    const figures = snapshot.docs.map(doc => doc.data() as Figure);
    
    // Sort results alphabetically for a consistent user experience.
    figures.sort((a, b) => a.name.localeCompare(b.name));

    return figures;
  } catch (error) {
    console.error('Error searching figures:', error);
    // In a real app, you might want to handle this more gracefully
    // or re-throw a more specific error.
    return [];
  }
}
