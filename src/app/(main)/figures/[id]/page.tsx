import { notFound } from 'next/navigation';
import { getSdks } from '@/firebase/server';
import FigureDetailClient from './client-page';
import type { Figure } from '@/lib/types';


async function getFigure(id: string): Promise<Figure | null> {
  // We get a new instance of the server SDKs here.
  const { firestore } = getSdks();
  // Use the admin SDK syntax: firestore.doc('collection/docId')
  const figureDocRef = firestore.doc(`figures/${id}`);
  const figureDoc = await figureDocRef.get();

  if (!figureDoc.exists) {
    return null;
  }

  // We are sure that the data matches the Figure type.
  return { id: figureDoc.id, ...figureDoc.data() } as Figure;
}

export default async function FigureDetailPage({ params }: { params: { id:string } }) {
  const figure = await getFigure(params.id);

  if (!figure) {
    notFound();
  }

  return <FigureDetailClient figure={figure} />;
}
