
'use client';

import { doc, increment, updateDoc, Firestore } from 'firebase/firestore';

/**
 * Global set to track IDs seen during the current browser session.
 * This persists across client-side navigation in Next.js.
 */
const seenIds = new Set<string>();

/**
 * Silently increments the viewCount of a document in Firestore if it hasn't been seen yet in this session.
 * @param firestore The Firestore instance.
 * @param collectionPath The base path of the collection (e.g., 'figures/messi/comments').
 * @param id The unique identifier of the document.
 */
export function trackView(
  firestore: Firestore | null,
  collectionPath: string,
  id: string
) {
  if (!firestore || !id || seenIds.has(id)) return;

  // Add to session cache immediately to prevent concurrent duplicate increments
  seenIds.add(id);

  const docRef = doc(firestore, collectionPath, id);
  
  // Non-blocking update: we don't await this as it's purely for silent background stats
  updateDoc(docRef, {
    viewCount: increment(1)
  }).catch(err => {
    // Silently fail if there's a permission error or network issue
    // We don't want to alert the user about background tracking failures
    console.debug(`View track failed for ${id}:`, err.message);
  });
}
