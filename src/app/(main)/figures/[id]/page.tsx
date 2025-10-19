import FigureDetailClient from './client-page';

export default function FigureDetailPage({ params }: { params: { id: string } }) {
  // Data fetching is now handled on the client side.
  // We just pass the figure ID to the client component.
  return <FigureDetailClient figureId={params.id} />;
}
