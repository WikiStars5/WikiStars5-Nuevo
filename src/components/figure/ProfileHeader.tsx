
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import type { Figure } from '@/lib/types';

interface ProfileHeaderProps {
  figure: Figure;
}

export default function ProfileHeader({ figure }: ProfileHeaderProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <div className="relative flex items-center gap-6">
          <div className="relative flex-shrink-0 w-28 h-28 md:w-36 md:h-36">
            <Button className="h-full w-full rounded-full border-4 border-card p-0 shadow-lg">
                <Image
                    src={figure.imageUrl}
                    alt={figure.name}
                    fill
                    className="rounded-full object-cover"
                    data-ai-hint={figure.imageHint}
                />
            </Button>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight font-headline">
              {figure.name}
            </h1>
          </div>
          <div className="absolute right-0 top-0">
            <Button variant="ghost" size="icon">
              <Share2 className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
