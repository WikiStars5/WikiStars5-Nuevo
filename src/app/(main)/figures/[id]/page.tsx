import FigureDetailClient from './client-page';

export default async function FigureDetailPage({ params }: { params: { id: string } }) {
  // Data fetching is now handled on the client side.
  // We just pass the figure ID to the client component.
  // We extract the 'id' from 'params' here to align with Next.js best practices.
  const { id } = params;
  return <FigureDetailClient figureId={id} />;
}
