'use server';

import { getFirestore } from 'firebase-admin/firestore';
import { getSdks } from '@/firebase/server';
import { normalizeText } from '@/lib/keywords';

const { firestore } = getSdks();

/**
 * Searches for hashtags using a Firestore range query on document IDs.
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
    // Use the range query trick on the document ID (__name__) for prefix search.
    const snapshot = await hashtagsRef
      .where('__name__', '>=', normalizedQuery)
      .where('__name__', '<=', normalizedQuery + '\uf8ff')
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
