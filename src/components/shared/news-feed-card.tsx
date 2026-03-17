'use client';

import * as React from 'react';
import type { NewsItem } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Newspaper, ExternalLink, Globe } from 'lucide-react';
import Link from 'next/link';
import { cn, formatDateDistance } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from 'next-themes';

interface NewsFeedCardProps {
  item: NewsItem & { figureName: string };
}

export default function NewsFeedCard({ item }: NewsFeedCardProps) {
  const { language } = useLanguage();
  const { theme } = useTheme();

  return (
    <Card className={cn("overflow-hidden border-border/40 hover:shadow-md transition-all", (theme === 'dark' || theme === 'army') && "bg-black")}>
      <div className="p-4 border-b border-border/40 flex items-center gap-2">
        <div className="bg-primary/10 p-2 rounded-full">
          <Newspaper className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Noticia sobre <Link href={`/figures/${item.figureId}`} className="text-primary hover:underline">{item.figureName}</Link>
          </p>
          <p className="text-[10px] text-muted-foreground">
            {item.createdAt?.toDate ? formatDateDistance(item.createdAt.toDate(), language) : ''}
          </p>
        </div>
      </div>
      
      {item.image && (
        <div className="relative aspect-[16/9] w-full bg-muted">
          <img 
            src={item.image} 
            alt={item.title} 
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
          <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
          {item.domain}
        </div>
        <h3 className="font-bold text-lg leading-tight line-clamp-2">{item.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
        
        <Button variant="outline" size="sm" asChild className="w-full rounded-full group mt-2">
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            Leer noticia completa <ExternalLink className="ml-2 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
