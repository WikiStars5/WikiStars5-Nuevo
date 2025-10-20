
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import type { Figure } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProfileHeaderProps {
  figure: Figure;
}

export default function ProfileHeader({ figure }: ProfileHeaderProps) {
    
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <div className="relative flex flex-col items-center gap-4 md:flex-row md:gap-8">
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
          <div className="flex flex-col items-center md:items-start flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight font-headline">
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
