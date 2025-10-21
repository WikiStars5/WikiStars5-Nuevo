import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Figure } from '@/lib/types';

type FigureCardProps = {
  figure: Figure;
};

export default function FigureCard({ figure }: FigureCardProps) {
  return (
    <Link href={`/figures/${figure.id}`}>
      <Card className="h-full overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-300 ease-in-out">
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
        <CardContent className="p-4">
          <h3 className="font-bold text-lg font-headline truncate">{figure.name}</h3>
          <p className="text-sm text-muted-foreground">{figure.nationality}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
