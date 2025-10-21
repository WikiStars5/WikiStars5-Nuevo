'use server';

import { getFirestore } from 'firebase-admin/firestore';
import { getSdks } from '@/firebase/server';
import { normalizeText } from '@/lib/keywords';
import { Figure } from '@/lib/types';

const { firestore } = getSdks();

/**
 * Searches for hashtags by querying figures that contain matching tag keywords.
 * This is used for the autocomplete functionality in the hashtag editor.
 * @param query The string to search for.
 * @returns A promise that resolves to an array of matching hashtag names.
 */
export async function searchHashtags(query: string): Promise<string[]> {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return [];
  }

  try {
    const figuresRef = firestore.collection('figures');
    // Search the `tagKeywords` array which contains all possible prefixes for all tags in a figure.
    const snapshot = await figuresRef
      .where('tagKeywords', 'array-contains', normalizedQuery)
      .limit(10)
      .get();

    if (snapshot.empty) {
      return [];
    }
    
    // From the matched figures, collect all their tags.
    const allTags = new Set<string>();
    snapshot.docs.forEach(doc => {
        const figure = doc.data() as Figure;
        figure.tags?.forEach(tag => {
            // Only add tags that actually start with the searched query
            if (normalizeText(tag).startsWith(normalizedQuery)) {
                allTags.add(tag);
            }
        });
    });

    // Return a sorted, unique list of matching tags
    return Array.from(allTags).sort();
    
  } catch (error) {
    console.error('Error searching hashtags:', error);
    // In case of an error, return an empty array to prevent the client from crashing.
    return [];
  }
}
