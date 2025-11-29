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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { generateKeywords } from '@/lib/keywords';
import { Loader2, Sparkles, AlertCircle, ArrowLeft, Pencil } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { verifyWikipediaCharacter } from '@/ai/flows/verify-wikipedia-character';
import { verifyFandomCharacter } from '@/ai/flows/verify-fandom-character';
import type { Figure } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import EditImageDialog from '@/components/admin/EditImageDialog';


const MAX_NAMES = 50;

function RecentlyCreatedCard({ figures, onFigureUpdate }: { figures: Figure[], onFigureUpdate: (figureId: string, newImageUrl: string) => void }) {
    if (figures.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Perfiles Creados Recientemente</CardTitle>
                <CardDescription>Estos son los últimos perfiles que se han añadido.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {figures.map(figure => (
                        <div key={figure.id} className="group space-y-2">
                            <Link href={`/figures/${figure.id}`} className="block">
                                <div className="aspect-[4/5] w-full bg-muted rounded-md overflow-hidden relative">
                                    <Image
                                        src={figure.imageUrl}
                                        alt={figure.name}
                                        fill
                                        className="object-cover transition-transform group-hover:scale-105"
                                    />
                                </div>
                            </Link>
                            <div className="text-center">
                                <p className="text-xs font-medium truncate">{figure.name}</p>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="link" size="sm" className="text-xs h-auto p-0">
                                            <Pencil className="mr-1 h-3 w-3" /> Editar
                                        </Button>
                                    </DialogTrigger>
                                    <EditImageDialog figure={figure} onImageUpdate={onFigureUpdate} />
                                </Dialog>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

export default function BulkCreatePage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [wikiNames, setWikiNames] = useState('');
  const [fandomNames, setFandomNames] = useState('');
  const [fandomDomain, setFandomDomain] = useState('');

  const [isCreating, setIsCreating] = useState<false | 'wiki' | 'fandom'>(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: number; skippedNames: string[] } | null>(null);
  const [recentlyCreated, setRecentlyCreated] = useState<Figure[]>([]);


  const handleCreate = async (source: 'wiki' | 'fandom') => {
    if (!firestore) {
      toast({ title: 'Error de conexión', description: 'No se pudo conectar a la base de datos.', variant: 'destructive' });
      return;
    }
    
    setIsCreating(source);
    setResult(null);
    setRecentlyCreated([]);
    
    const isFandom = source === 'fandom';
    const nameList = (isFandom ? fandomNames : wikiNames).split('\n').map(name => name.trim()).filter(Boolean);

    if (nameList.length === 0) {
      toast({ title: 'Lista vacía', description: 'Por favor, introduce al menos un nombre.', variant: 'destructive' });
      setIsCreating(false);
      return;
    }

    if (isFandom && !fandomDomain) {
      toast({ title: 'Dominio Faltante', description: 'Por favor, introduce el dominio del wiki de Fandom (ej: onepiece.fandom.com).', variant: 'destructive' });
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
    const skippedNames: string[] = [];
    const createdFiguresForDisplay: Figure[] = [];

    for (const name of nameList) {
      try {
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        if (!slug) continue;
        
        const figureRef = doc(firestore, 'figures', slug);
        const docSnap = await getDoc(figureRef);

        if (docSnap.exists()) {
          skippedCount++;
          skippedNames.push(name);
        } else {
            let verificationResult;
            if (isFandom) {
                const fullDomain = fandomDomain.startsWith('http') ? fandomDomain : `https://${fandomDomain}`;
                verificationResult = await verifyFandomCharacter({ name, fandomDomain: fullDomain });
            } else {
                verificationResult = await verifyWikipediaCharacter({ name });
            }
            
            const figureName = verificationResult.found && verificationResult.title ? verificationResult.title : name;
            const imageUrl = verificationResult.found && verificationResult.imageUrl 
                ? verificationResult.imageUrl 
                : `https://placehold.co/600x400?text=${encodeURIComponent(name)}`;
                
            const keywords = generateKeywords(figureName);
            const figureData = {
                id: slug,
                name: figureName,
                imageUrl: imageUrl,
                imageHint: verificationResult.found ? `portrait of ${figureName}` : `placeholder for ${figureName}`,
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
      setResult({ created: createdCount, skipped: skippedCount, errors: errorCount, skippedNames });
      toast({
        title: '¡Proceso Completado!',
        description: `Se crearon ${createdCount} perfiles y se omitieron ${skippedCount} duplicados.`,
      });
    } catch (error) {
      console.error('Error committing batch:', error);
      toast({ title: 'Error Crítico', description: 'No se pudieron guardar los perfiles. Inténtalo de nuevo.', variant: 'destructive' });
      setResult({ created: 0, skipped: nameList.length, errors: errorCount, skippedNames: nameList });
    } finally {
      setIsCreating(false);
      if (isFandom) setFandomNames(''); else setWikiNames('');
    }
  };
  
  const wikiLineCount = wikiNames.split('\n').filter(Boolean).length;
  const fandomLineCount = fandomNames.split('\n').filter(Boolean).length;
  
  const handleFigureUpdate = (figureId: string, newImageUrl: string) => {
    setRecentlyCreated(prevFigures => 
        prevFigures.map(fig => 
            fig.id === figureId ? { ...fig, imageUrl: newImageUrl } : fig
        )
    );
  };

  return (
    <div className="space-y-6">
        <div className="flex items-start justify-between">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold">Creación Rápida de Perfiles</h1>
                <p className="text-muted-foreground">Herramientas para añadir múltiples perfiles desde fuentes externas.</p>
            </div>
             <Button variant="outline" asChild>
                <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Volver al panel</Link>
            </Button>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Desde Wikipedia</CardTitle>
                <CardDescription>
                Pega una lista de nombres (uno por línea). El sistema buscará una imagen en Wikipedia y omitirá los duplicados.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid w-full gap-2">
                    <Textarea
                        placeholder="Lionel Messi\nCristiano Ronaldo\n..."
                        value={wikiNames}
                        onChange={(e) => setWikiNames(e.target.value)}
                        rows={10}
                        disabled={!!isCreating}
                    />
                    <p className="text-sm text-muted-foreground">
                        Líneas: <span className="font-bold">{wikiLineCount}</span> / {MAX_NAMES}
                    </p>
                </div>

                {isCreating === false && result && (
                <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Resultados del Proceso Anterior</AlertTitle>
                    <AlertDescription>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                            <li><span className="font-bold">{result.created}</span> perfiles creados.</li>
                            {result.skipped > 0 ? (
                                <li>
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="item-1" className="border-b-0">
                                            <AccordionTrigger className="p-0 text-sm hover:no-underline">
                                                 <span className="font-bold">{result.skipped}</span> perfiles omitidos (duplicados).
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-2">
                                                <ul className="list-disc pl-5 text-xs text-muted-foreground max-h-24 overflow-y-auto">
                                                    {result.skippedNames.map((name, index) => (
                                                        <li key={index}>{name}</li>
                                                    ))}
                                                </ul>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </li>
                            ) : (
                                <li><span className="font-bold">0</span> perfiles omitidos.</li>
                            )}
                            {result.errors > 0 && <li className="text-destructive"><span className="font-bold">{result.errors}</span> errores durante el proceso.</li>}
                        </ul>
                    </AlertDescription>
                </Alert>
                )}
            </CardContent>
            <CardFooter>
                 <Button onClick={() => handleCreate('wiki')} disabled={!!isCreating || wikiLineCount === 0 || wikiLineCount > MAX_NAMES}>
                    {isCreating === 'wiki' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Crear {wikiLineCount > 0 ? wikiLineCount : ''} Perfiles
                </Button>
            </CardFooter>
        </Card>

         <Card>
            <CardHeader>
                <CardTitle>Desde Fandom</CardTitle>
                <CardDescription>
                Pega una lista de nombres y especifica el dominio del wiki de Fandom (ej: `onepiece.fandom.com`).
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <label htmlFor="fandom-domain" className="text-sm font-medium">Dominio del Wiki de Fandom*</label>
                    <Input
                        id="fandom-domain"
                        placeholder="onepiece.fandom.com"
                        value={fandomDomain}
                        onChange={(e) => setFandomDomain(e.target.value)}
                        disabled={!!isCreating}
                    />
                </div>
                <div className="grid w-full gap-2">
                    <Textarea
                        placeholder="Monkey D. Luffy\nRoronoa Zoro\n..."
                        value={fandomNames}
                        onChange={(e) => setFandomNames(e.target.value)}
                        rows={10}
                        disabled={!!isCreating}
                    />
                    <p className="text-sm text-muted-foreground">
                        Líneas: <span className="font-bold">{fandomLineCount}</span> / {MAX_NAMES}
                    </p>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={() => handleCreate('fandom')} disabled={!!isCreating || fandomLineCount === 0 || fandomLineCount > MAX_NAMES}>
                    {isCreating === 'fandom' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Crear {fandomLineCount > 0 ? fandomLineCount : ''} Perfiles
                </Button>
            </CardFooter>
        </Card>
        
        {recentlyCreated.length > 0 && <RecentlyCreatedCard figures={recentlyCreated} onFigureUpdate={handleFigureUpdate} />}
    </div>
  );
}
