'use client';

import React, { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useAdmin } from '@/firebase';
import { collection, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2, Instagram, Image as LucideImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import type { GalleryItem } from '@/lib/types';

export default function FigureGallery({ figureId, figureName }: { figureId: string, figureName: string }) {
  const firestore = useFirestore();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const { theme } = useTheme();

  const [url, setUrl] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const galleryQuery = useMemoFirebase(() => {
    if (!firestore || !figureId) return null;
    return query(
      collection(firestore, 'figures', figureId, 'gallery'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, figureId]);

  const { data: photos, isLoading } = useCollection<GalleryItem>(galleryQuery, { realtime: true });

  const handleFetchPreview = async () => {
    if (!url.trim()) return;
    const match = url.match(/\/p\/([a-zA-Z0-9_-]+)/) || url.match(/\/reel\/([a-zA-Z0-9_-]+)/);
    if (!match) {
        toast({ title: "Enlace inválido", description: "Asegúrate de que sea un link de post o reel de Instagram.", variant: "destructive" });
        return;
    }

    setIsVerifying(true);
    try {
        const postId = match[1];
        const cleanUrl = `https://www.instagram.com/p/${postId}/media/?size=l`;
        const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}`;

        const imgTester = new window.Image();
        imgTester.onload = () => {
            setPreviewUrl(proxiedUrl);
            setIsVerifying(false);
        };
        imgTester.onerror = () => {
            setIsVerifying(false);
            toast({ title: "Error", description: "No se pudo obtener la imagen. ¿La cuenta es pública?", variant: "destructive" });
        };
        imgTester.src = proxiedUrl;
    } catch (e) {
        setIsVerifying(false);
        toast({ title: "Error", description: "Error inesperado.", variant: "destructive" });
    }
  };

  const handleAddPhoto = async () => {
    if (!firestore || !previewUrl || !figureId) return;
    setIsAdding(true);

    try {
      await addDoc(collection(firestore, 'figures', figureId, 'gallery'), {
        url: url,
        imageUrl: previewUrl,
        createdAt: serverTimestamp()
      });
      toast({ title: "Foto añadida", description: "La imagen se ha guardado en la galería." });
      setPreviewUrl(null);
      setUrl('');
    } catch (err) {
      toast({ title: "Error", description: "No se pudo guardar la imagen.", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!firestore || !figureId) return;
    try {
      await deleteDoc(doc(firestore, 'figures', figureId, 'gallery', photoId));
      toast({ title: "Foto eliminada" });
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
              <Instagram className="h-5 w-5 text-pink-500" />
              Añadir a Galería
            </CardTitle>
            <CardDescription>Pega el link de un post de Instagram para añadirlo a la galería de {figureName}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.instagram.com/p/..."
                className="flex-1"
                disabled={isVerifying || isAdding}
              />
              <Button onClick={handleFetchPreview} disabled={isVerifying || isAdding || !url.trim()}>
                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ver Foto"}
              </Button>
            </div>

            {previewUrl && (
              <div className="mt-4 space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="relative aspect-square max-w-[300px] mx-auto rounded-lg overflow-hidden border-2 border-primary/20 bg-muted">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                </div>
                <div className="flex justify-center gap-2">
                  <Button variant="ghost" onClick={() => setPreviewUrl(null)}>Cancelar</Button>
                  <Button onClick={handleAddPhoto} disabled={isAdding}>
                    {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    Confirmar y Añadir
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-12">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl" />
          ))
        ) : photos && photos.length > 0 ? (
          photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border/40 shadow-sm hover:shadow-xl transition-all duration-300">
              <img 
                src={photo.imageUrl} 
                alt="Gallery item" 
                className="w-full h-full object-contain transition-transform group-hover:scale-105 duration-700 ease-out" 
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                 <Instagram className="h-8 w-8 text-white opacity-50" />
              </div>
              {isAdmin && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg"
                  onClick={() => handleDelete(photo.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/10">
            <LucideImageIcon className="mx-auto h-16 w-16 text-muted-foreground/10 mb-4" />
            <p className="text-muted-foreground font-medium">La galería está vacía.</p>
            {isAdmin && <p className="text-xs text-muted-foreground mt-1">Usa el panel de arriba para añadir las mejores fotos.</p>}
          </div>
        )}
      </div>
    </div>
  );
}