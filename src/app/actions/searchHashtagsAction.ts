'use server';

import { getSdks } from '@/firebase/server';
import { normalizeText } from '@/lib/keywords';
import { query, where, limit, getDocs, collection } from 'firebase/firestore';

/**
 * Searches for hashtags using a prefix range query on the document IDs
 * of the `hashtags` collection. This is a highly efficient method for
 * implementing autocomplete functionality in Firestore.
 * @param searchQuery The string to search for.
 * @returns A promise that resolves to an array of matching hashtag names.
 */
export async function searchHashtags(searchQuery: string): Promise<string[]> {
  const { firestore } = getSdks();
  const normalizedQuery = normalizeText(searchQuery);

  if (!normalizedQuery) {
    return [];
  }

  try {
    const hashtagsRef = collection(firestore, 'hashtags');
    
    // This is the key part: a range query on the document ID (__name__).
    // \uf8ff is a very high code point in Unicode, so this query effectively
    // finds all documents whose ID starts with the normalizedQuery string.
    const endStr = normalizedQuery + '\uf8ff';
    const firestoreQuery = query(
      hashtagsRef,
      where('__name__', '>=', normalizedQuery),
      where('__name__', '<=', endStr),
      limit(10)
    );

    const snapshot = await getDocs(firestoreQuery);

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
