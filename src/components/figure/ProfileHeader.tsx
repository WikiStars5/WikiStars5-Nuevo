
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import type { Figure } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const SOCIAL_MEDIA_CONFIG: Record<string, { label: string }> = {
    website: { label: 'Página Web' },
    instagram: { label: 'Instagram' },
    twitter: { label: 'X (Twitter)' },
    youtube: { label: 'YouTube' },
    facebook: { label: 'Facebook' },
    tiktok: { label: 'TikTok' },
    linkedin: { label: 'LinkedIn' },
    discord: { label: 'Discord' },
};

const SocialLink = ({ platform, url }: { platform: string; url: string }) => {
    try {
        const domain = new URL(url).hostname;
        const config = SOCIAL_MEDIA_CONFIG[platform] || { label: domain };

        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                             <Link href={url} target="_blank" rel="noopener noreferrer">
                                <Image
                                    src={`https://www.google.com/s2/favicons?sz=32&domain_url=${domain}`}
                                    alt={`${config.label} icon`}
                                    width={16}
                                    height={16}
                                    className="h-4 w-4 object-contain"
                                />
                             </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{config.label}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    } catch (e) {
        return null;
    }
};

interface ProfileHeaderProps {
  figure: Figure;
}

export default function ProfileHeader({ figure }: ProfileHeaderProps) {
  const hasSocialLinks = figure.socialLinks && Object.values(figure.socialLinks).some(link => !!link);
    
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
            {hasSocialLinks && (
                 <div className="mt-2 flex items-center gap-1">
                    {Object.entries(figure.socialLinks || {}).map(([platform, url]) => (
                        url ? <SocialLink key={platform} platform={platform} url={url} /> : null
                    ))}
                </div>
            )}
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
