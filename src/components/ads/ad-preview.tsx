'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, ImageOff } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface AdPreviewProps {
  adTitle?: string;
  adDescription?: string;
  adImageUrl?: string;
  adLinkUrl?: string;
  callToAction?: string;
}

function getDomainFromUrl(url: string | undefined): string {
    if (!url) return 'ejemplo.com';
    try {
        const hostname = new URL(url).hostname;
        return hostname.replace(/^www\./, '');
    } catch (e) {
        return 'enlace-invalido';
    }
}

export default function AdPreview({ adTitle, adDescription, adImageUrl, adLinkUrl, callToAction }: AdPreviewProps) {
    const domain = getDomainFromUrl(adLinkUrl);
    const isValidImage = adImageUrl && adImageUrl.startsWith('https');

    return (
        <div className="space-y-4">
             <h3 className="font-semibold text-lg">Previsualización del Anuncio</h3>
            <Card className="w-full max-w-sm mx-auto overflow-hidden">
                <CardContent className="p-0">
                    <div className="relative aspect-[1.91/1] w-full bg-muted flex items-center justify-center">
                        {isValidImage ? (
                            <Image
                                src={adImageUrl}
                                alt="Previsualización del anuncio"
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <ImageOff className="h-8 w-8" />
                                <span className="text-xs">Imagen del anuncio</span>
                            </div>
                        )}
                    </div>
                    <div className="p-3 space-y-3">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase flex items-center gap-1.5">
                                <Globe className="h-3 w-3"/>
                                {domain}
                            </p>
                            <h4 className="font-semibold text-base leading-tight truncate">{adTitle || 'Título del anuncio'}</h4>
                            <p className="text-sm text-muted-foreground leading-snug truncate">{adDescription || 'Descripción corta del anuncio'}</p>
                        </div>
                        <Button className="w-full" size="sm">
                            {callToAction || 'Llamado a la acción'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
