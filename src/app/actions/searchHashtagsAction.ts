'use server';

import { getSdks } from '@/firebase/server';
import { normalizeText } from '@/lib/keywords';

/**
 * Searches for hashtags using a keyword array query on the `hashtags` collection.
 * This is used for the autocomplete functionality in the hashtag editor.
 * @param query The string to search for.
 * @returns A promise that resolves to an array of matching hashtag names.
 */
export async function searchHashtags(query: string): Promise<string[]> {
  const { firestore } = getSdks();
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  try {
    const hashtagsRef = firestore.collection('hashtags');
    // This query now correctly searches the `keywords` array.
    const snapshot = await hashtagsRef
      .where('keywords', 'array-contains', normalizedQuery)
      .limit(10)
      .get();

    if (snapshot.empty) {
      return [];
    }

    // The document IDs are the hashtag names themselves.
    const matchingTags = snapshot.docs.map(doc => doc.id);

    return matchingTags.sort();
  } catch (error) {
    console.error('Error searching hashtags:', error);
    // In case of an error, return an empty array to prevent the client from crashing.
    return [];
  }
}
