'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { generateKeywords } from '@/lib/keywords';
import { Loader2, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { verifyWikipediaCharacter } from '@/ai/flows/verify-wikipedia-character';
import { Skeleton } from '@/components/ui/skeleton';
import type { Figure } from '@/lib/types';


const MAX_NAMES = 50;

function RecentlyCreatedCard({ figures }: { figures: Figure[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Perfiles Creados Recientemente</CardTitle>
                <CardDescription>Estos son los últimos perfiles que se han añadido.</CardDescription>
            </CardHeader>
            <CardContent>
                {figures.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Aún no se ha creado ningún perfil.</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {figures.map(figure => (
                            <Link key={figure.id} href={`/figures/${figure.id}`} className="group space-y-2">
                                <div className="aspect-[4/5] w-full bg-muted rounded-md overflow-hidden relative">
                                    <Image
                                        src={figure.imageUrl}
                                        alt={figure.name}
                                        fill
                                        className="object-cover transition-transform group-hover:scale-105"
                                    />
                                </div>
                                <p className="text-xs font-medium text-center truncate group-hover:underline">{figure.name}</p>
                            </Link>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default function BulkCreatePage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [names, setNames] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: number } | null>(null);
  const [recentlyCreated, setRecentlyCreated] = useState<Figure[]>([]);


  const handleCreate = async () => {
    if (!firestore) {
      toast({ title: 'Error de conexión', description: 'No se pudo conectar a la base de datos.', variant: 'destructive' });
      return;
    }
    
    setIsCreating(true);
    setResult(null);
    setRecentlyCreated([]);

    const nameList = names.split('\n').map(name => name.trim()).filter(Boolean);

    if (nameList.length === 0) {
      toast({ title: 'Lista vacía', description: 'Por favor, introduce al menos un nombre.', variant: 'destructive' });
      setIsCreating(false);
      return;
    }

    if (nameList.length > MAX_NAMES) {
      toast({ title: 'Límite Excedido', description: `Solo puedes crear hasta ${MAX_NAMES} perfiles a la vez.`, variant: 'destructive' });
      setIsCreating(false);
      return;
    }

    const batch = writeBatch(firestore);
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const createdFiguresForDisplay: Figure[] = [];

    for (const name of nameList) {
      try {
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        if (!slug) continue;
        
        const figureRef = doc(firestore, 'figures', slug);
        const docSnap = await getDoc(figureRef);

        if (docSnap.exists()) {
          skippedCount++;
        } else {
          const wikiResult = await verifyWikipediaCharacter({ name });

          const figureName = wikiResult.found && wikiResult.title ? wikiResult.title : name;
          const imageUrl = wikiResult.found && wikiResult.imageUrl 
            ? wikiResult.imageUrl 
            : `https://placehold.co/600x400?text=${encodeURIComponent(name)}`;
            
          const keywords = generateKeywords(figureName);
          const figureData = {
            id: slug,
            name: figureName,
            imageUrl: imageUrl,
            imageHint: wikiResult.found ? `portrait of ${figureName}` : `placeholder for ${figureName}`,
            nameKeywords: keywords,
            approved: true,
            createdAt: serverTimestamp(),
            attitude: { neutral: 0, fan: 0, simp: 0, hater: 0 },
            emotion: { alegria: 0, envidia: 0, tristeza: 0, miedo: 0, desagrado: 0, furia: 0 },
            ratingCount: 0,
            totalRating: 0,
            ratingsBreakdown: { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          };
          batch.set(figureRef, figureData);
          createdFiguresForDisplay.push(figureData as Figure);
          createdCount++;
        }
      } catch (error) {
        console.error(`Error processing name "${name}":`, error);
        errorCount++;
      }
    }

    try {
      await batch.commit();
      setRecentlyCreated(createdFiguresForDisplay);
      setResult({ created: createdCount, skipped: skippedCount, errors: errorCount });
      toast({
        title: '¡Proceso Completado!',
        description: `Se crearon ${createdCount} perfiles y se omitieron ${skippedCount} duplicados.`,
      });
    } catch (error) {
      console.error('Error committing batch:', error);
      toast({ title: 'Error Crítico', description: 'No se pudieron guardar los perfiles. Inténtalo de nuevo.', variant: 'destructive' });
      setResult({ created: 0, skipped: nameList.length, errors: errorCount });
    } finally {
      setIsCreating(false);
      setNames('');
    }
  };
  
  const lineCount = names.split('\n').filter(Boolean).length;

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle>Creación Rápida de Perfiles</CardTitle>
                        <CardDescription>
                        Pega una lista de nombres (uno por línea). El sistema buscará una imagen en Wikipedia y omitirá los duplicados.
                        </CardDescription>
                    </div>
                     <Button variant="outline" asChild>
                        <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Volver al panel</Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid w-full gap-2">
                    <Textarea
                        placeholder="Lionel Messi\nCristiano Ronaldo\n..."
                        value={names}
                        onChange={(e) => setNames(e.target.value)}
                        rows={10}
                        disabled={isCreating}
                    />
                    <p className="text-sm text-muted-foreground">
                        Líneas: <span className="font-bold">{lineCount}</span> / {MAX_NAMES}
                    </p>
                </div>

                {result && (
                <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Resultados del Proceso Anterior</AlertTitle>
                    <AlertDescription>
                        <ul className="list-disc pl-5 text-sm">
                            <li><span className="font-bold">{result.created}</span> perfiles creados.</li>
                            <li><span className="font-bold">{result.skipped}</span> perfiles omitidos (duplicados).</li>
                            {result.errors > 0 && <li className="text-destructive"><span className="font-bold">{result.errors}</span> errores.</li>}
                        </ul>
                    </AlertDescription>
                </Alert>
                )}
            </CardContent>
            <CardFooter>
                 <Button onClick={handleCreate} disabled={isCreating || lineCount === 0 || lineCount > MAX_NAMES}>
                    {isCreating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Crear {lineCount > 0 ? lineCount : ''} Perfiles
                </Button>
            </CardFooter>
        </Card>
        {result && <RecentlyCreatedCard figures={recentlyCreated} />}
    </div>
  );
}
