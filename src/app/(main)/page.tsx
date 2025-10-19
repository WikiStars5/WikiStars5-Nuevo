import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getFeaturedFigures, type Figure } from '@/lib/data';
import { Search } from 'lucide-react';
import FigureCard from '@/components/shared/figure-card';

export default async function HomePage() {
  const featuredFigures = await getFeaturedFigures();

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <section className="text-center mb-12 md:mb-16">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 font-headline bg-gradient-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent">
          Welcome to Starboard
        </h1>
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
          Discover, rate, and discuss the most influential figures of our time.
        </p>
        <div className="mt-8 max-w-lg mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for a figure..."
              className="w-full pl-10 pr-4 py-2 h-12 text-lg rounded-full"
            />
            <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full" size="icon">
               <Search className="h-5 w-5" />
               <span className="sr-only">Search</span>
            </Button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-bold tracking-tight mb-8 font-headline">Featured Figures</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
          {featuredFigures.map((figure) => (
            <FigureCard key={figure.id} figure={figure} />
          ))}
        </div>
      </section>
    </div>
  );
}
