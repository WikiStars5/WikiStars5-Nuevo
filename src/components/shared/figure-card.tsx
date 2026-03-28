import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Figure } from '@/lib/types';
import { StarRating } from './star-rating';

type FigureCardProps = {
  figure: Figure;
  isPriority?: boolean;
};

export default function FigureCard({ figure, isPriority = false }: FigureCardProps) {
  const averageRating = (figure.ratingCount ?? 0) > 0 
    ? (figure.totalRating ?? 0) / (figure.ratingCount || 1) 
    : 0;

  return (
    <Link href={`/figures/${figure.id}`} scroll={true}>
      <Card className="h-full overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-300 ease-in-out flex flex-col dark:bg-black">
        <CardHeader className="p-0">
          <div className="relative aspect-[4/5] w-full bg-muted">
            <Image
              src={figure.imageUrl}
              alt={figure.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 200px"
              data-ai-hint={figure.imageHint}
              priority={isPriority}
              loading={isPriority ? "eager" : "lazy"}
            />
          </div>
        </CardHeader>
        <CardContent className="p-3 flex-grow">
          <h3 className="font-bold text-sm md:text-base font-headline truncate">{figure.name}</h3>
           <div className="flex items-center gap-1.5 mt-1">
              <StarRating rating={averageRating} starClassName="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm font-bold text-muted-foreground">{averageRating.toFixed(1)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
