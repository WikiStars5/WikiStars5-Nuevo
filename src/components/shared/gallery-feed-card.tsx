'use client';

import * as React from 'react';
import type { GalleryItem } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Instagram, Image as LucideImageIcon } from 'lucide-react';
import Link from 'next/link';
import { cn, formatDateDistance } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from 'next-themes';

interface GalleryFeedCardProps {
  item: GalleryItem & { figureId: string; figureName: string; figureImageUrl: string };
}

export default function GalleryFeedCard({ item }: GalleryFeedCardProps) {
  const { language } = useLanguage();
  const { theme } = useTheme();

  return (
    <Card className={cn("overflow-hidden border-border/40 hover:shadow-md transition-all", (theme === 'dark' || theme === 'army') && "bg-black")}>
      <div className="p-4 flex items-center gap-3">
        <Link href={`/figures/${item.figureId}`} className="flex-shrink-0">
          <div className="relative h-8 w-8 rounded-full overflow-hidden border-2 border-primary/20">
            <img src={item.figureImageUrl} alt={item.figureName} className="object-cover w-full h-full" />
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate">
            <Link href={`/figures/${item.figureId}`} className="hover:underline">{item.figureName}</Link>
            <span className="text-muted-foreground font-normal ml-1">añadió una foto</span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            {item.createdAt?.toDate ? formatDateDistance(item.createdAt.toDate(), language) : ''}
          </p>
        </div>
        <Instagram className="h-4 w-4 text-pink-500 opacity-50" />
      </div>

      <div className="relative aspect-square w-full bg-muted flex items-center justify-center overflow-hidden border-y">
        <img 
          src={item.imageUrl} 
          alt={`Galería de ${item.figureName}`} 
          className="w-full h-full object-contain transition-transform hover:scale-105 duration-700" 
        />
      </div>

      <div className="p-3 bg-muted/10 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <LucideImageIcon className="h-3 w-3" />
          Nueva foto en galería
        </div>
        <Link 
          href={`/figures/${item.figureId}?tab=galeria`} 
          className="text-[10px] font-black uppercase tracking-tighter text-primary hover:underline"
        >
          Ver toda la galería →
        </Link>
      </div>
    </Card>
  );
}
