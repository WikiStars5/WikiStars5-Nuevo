import FigureCard from '@/components/shared/figure-card';
import { Button } from '@/components/ui/button';
import { getFigures, type Figure } from '@/lib/data';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default async function ExplorePage() {
  const figures = await getFigures();

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight font-headline">Explore Figures</h1>
        <p className="text-muted-foreground mt-2">Browse through the entire collection of public figures.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
        {figures.map((figure) => (
          <FigureCard key={figure.id} figure={figure} />
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <div className="flex items-center gap-4">
          <Button variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm font-medium">Page 1 of 10</span>
          <Button variant="outline">
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
