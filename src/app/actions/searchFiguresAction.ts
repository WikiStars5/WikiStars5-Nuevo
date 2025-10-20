
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
 * Uses a pre-computed `nameKeywords` array for efficient prefix searching.
 * @param searchTerm The user's search term.
 * @returns A promise that resolves to an array of matching Figure objects.
 */
export async function searchFiguresByName(searchTerm: string): Promise<Figure[]> {
  const trimmedSearchTerm = normalizeText(searchTerm.trim());
  if (trimmedSearchTerm.length < 1) { // Allow search from 1 character
    return [];
  }
    
  const { firestore } = getSdks();

  try {
    const figuresCollection = firestore.collection('figures');
    
    // This query uses an index on `nameKeywords` for efficient searching.
    const firestoreQuery = figuresCollection
      .where('nameKeywords', 'array-contains', trimmedSearchTerm)
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
    
    // Sort results alphabetically for a consistent user experience.
    figures.sort((a, b) => a.name.localeCompare(b.name));

    return figures;
  } catch (error) {
    console.error('Error searching figures:', error);
    if (String(error).includes('requires an index')) {
      throw new Error(
        "La función de búsqueda necesita un índice de Firestore que no existe. Por favor, crea el índice compuesto para la colección 'figures' en el campo 'nameKeywords' desde la consola de Firebase."
      );
    }
    // In a real app, you might want to handle this more gracefully
    // or re-throw a more specific error.
    return [];
  }
}
