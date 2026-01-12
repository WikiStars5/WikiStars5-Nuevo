
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Figure } from '@/lib/types';
import { StarRating } from './star-rating';

type FigureCardProps = {
  figure: Figure;
};

export default function FigureCard({ figure }: FigureCardProps) {
  const averageRating = (figure.ratingCount ?? 0) > 0 
    ? (figure.totalRating ?? 0) / (figure.ratingCount || 1) 
    : 0;

  return (
    <Link href={`/figures/${figure.id}`} scroll={true}>
      <Card className="h-full overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-300 ease-in-out flex flex-col dark:bg-black">
        <CardHeader className="p-0">
          <div className="relative aspect-[4/5] w-full">
            <Image
              src={figure.imageUrl}
              alt={figure.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              data-ai-hint={figure.imageHint}
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          <h3 className="font-bold text-lg font-headline truncate">{figure.name}</h3>
           <div className="flex items-center gap-2 mt-1">
              <StarRating rating={averageRating} starClassName="h-4 w-4" />
              <span className="text-sm font-bold text-muted-foreground">{averageRating.toFixed(1)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
