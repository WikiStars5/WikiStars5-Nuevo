
'use server';

import { getSdks } from '@/firebase/server';
import { normalizeText } from '@/lib/keywords';
import type { Figure } from '@/lib/types';


export async function searchFiguresByName(searchTerm: string): Promise<Figure[]> {
  const normalizedSearchTerm = normalizeText(searchTerm);
  if (normalizedSearchTerm.length < 1) {
    return [];
  }
  
  const { firestore } = getSdks();

  try {
    const figuresCollection = firestore.collection('figures');
    
    const firestoreQuery = figuresCollection
      .where('nameKeywords', 'array-contains', normalizedSearchTerm)
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
    
    figures.sort((a, b) => a.name.localeCompare(b.name));

    return figures;
  } catch (error) {
    console.error('Error searching figures by name:', error);
    if (String(error).includes('requires an index')) {
      console.error("Firestore index missing for 'figures' collection on 'nameKeywords' field.");
    }
    return [];
  }
}
