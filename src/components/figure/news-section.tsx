'use client';

import React, { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useAdmin } from '@/firebase';
import { collection, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Globe, Trash2, ExternalLink, Newspaper, PlusCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import type { NewsItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface FigureNewsSectionProps {
  figureId: string;
  figureName: string;
}

export default function FigureNewsSection({ figureId, figureName }: FigureNewsSectionProps) {
  const firestore = useFirestore();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const { theme } = useTheme();

  const [url, setUrl] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Partial<NewsItem> | null>(null);
  const [isPublishing, setIsSubmitting] = useState(false);

  const newsQuery = useMemoFirebase(() => {
    if (!firestore || !figureId) return null;
    return query(
      collection(firestore, 'figures', figureId, 'news'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, figureId]);

  const { data: news, isLoading } = useCollection<NewsItem>(newsQuery, { realtime: true });

  const formatUrl = (inputUrl: string) => {
    let formattedUrl = inputUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    return formattedUrl;
  };

  const getDomain = (urlString: string) => {
    try {
      const domain = new URL(urlString).hostname;
      return domain.replace(/^www\./, '').toUpperCase();
    } catch (e) {
      return '';
    }
  };

  const fetchPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoadingPreview(true);
    setError('');
    setPreview(null);

    const targetUrl = formatUrl(url);

    try {
      const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}`);
      const data = await response.json();

      if (data.status === 'success' && data.data) {
        setPreview({
          title: data.data.title || 'Sin título',
          description: data.data.description || 'Sin descripción disponible.',
          image: data.data.image?.url || data.data.logo?.url || null,
          domain: getDomain(data.data.url || targetUrl),
          url: data.data.url || targetUrl,
          publisher: data.data.publisher || 'Sitio Web'
        });
      } else {
        setError('No se pudo generar la vista previa. ¿La URL es correcta?');
      }
    } catch (err) {
      setError('Error de conexión. Verifica tu internet o la URL.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handlePublish = async () => {
    if (!firestore || !preview || !figureId) return;
    setIsSubmitting(true);

    try {
      await addDoc(collection(firestore, 'figures', figureId, 'news'), {
        ...preview,
        figureId,
        createdAt: serverTimestamp()
      });
      toast({ title: "Noticia publicada", description: "El enlace se ha añadido correctamente." });
      setPreview(null);
      setUrl('');
    } catch (err) {
      toast({ title: "Error", description: "No se pudo publicar la noticia.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (newsId: string) => {
    if (!firestore || !figureId) return;
    try {
      await deleteDoc(doc(firestore, 'figures', figureId, 'news', newsId));
      toast({ title: "Noticia eliminada" });
    } catch (err) {
      toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      {isAdmin && (
        <Card className={cn((theme === 'dark' || theme === 'army') && "bg-black border-primary/20")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              Publicar Noticia
            </CardTitle>
            <CardDescription>Pega el enlace de una noticia sobre {figureName} para compartirla con la comunidad.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={fetchPreview} className="flex flex-col sm:flex-row gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.ejemplo.com/noticia"
                className="flex-1"
                disabled={loadingPreview}
              />
              <Button type="submit" disabled={loadingPreview || !url.trim()}>
                {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analizar Link"}
              </Button>
            </form>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {preview && (
              <div className="mt-6 border rounded-lg overflow-hidden bg-muted/30">
                <div className="relative aspect-[1.91/1] w-full bg-muted flex items-center justify-center overflow-hidden">
                  {preview.image ? (
                    <img 
                      src={preview.image} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x315?text=Imagen+No+Disponible'; }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Globe className="h-12 w-12 opacity-20" />
                      <span className="text-xs mt-2">Sin imagen de vista previa</span>
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    {preview.domain}
                  </div>
                  <h3 className="font-bold text-lg leading-tight">{preview.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{preview.description}</p>
                </div>
                <div className="p-4 border-t flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setPreview(null)} disabled={isPublishing}>Cancelar</Button>
                  <Button size="sm" onClick={handlePublish} disabled={isPublishing}>
                    {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publicar Ahora"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <h2 className="text-2xl font-bold font-headline flex items-center gap-2">
          <Newspaper className="text-primary" />
          Últimas Noticias
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[1.91/1] w-full" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : news && news.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-12">
            {news.map((item) => (
              <Card key={item.id} className={cn("group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1", (theme === 'dark' || theme === 'army') && "bg-black border-border/40")}>
                <div className="relative aspect-[1.91/1] w-full bg-muted flex items-center justify-center overflow-hidden">
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x315?text=Imagen+No+Disponible'; }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <Globe className="h-12 w-12 opacity-10" />
                    </div>
                  )}
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary mb-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    {item.domain}
                  </div>
                  <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{item.description}</p>
                  <Button variant="outline" size="sm" asChild className="w-full rounded-full group-hover:bg-primary group-hover:text-primary-foreground">
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      Leer noticia completa <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
            <Newspaper className="mx-auto h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground">No hay noticias publicadas para {figureName} todavía.</p>
            {isAdmin && <p className="text-xs text-muted-foreground mt-1">Usa el formulario de arriba para añadir contenido.</p>}
          </div>
        )}
      </div>
    </div>
  );
}