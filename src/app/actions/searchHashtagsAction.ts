'use server';

import { getFirestore } from 'firebase-admin/firestore';
import { getSdks } from '@/firebase/server';
import { normalizeText } from '@/lib/keywords';

const { firestore } = getSdks();

/**
 * Searches for hashtags that start with a given query string.
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
    const hashtagsRef = firestore.collection('hashtags');
    // We search the `keywords` array which contains all possible prefixes.
    const snapshot = await hashtagsRef
      .where('keywords', 'array-contains', normalizedQuery)
      .limit(10)
      .get();

    if (snapshot.empty) {
      return [];
    }

    // We only need the document IDs, which are the hashtag names themselves.
    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('Error searching hashtags:', error);
    // In case of an error, return an empty array to prevent the client from crashing.
    return [];
  }
}
