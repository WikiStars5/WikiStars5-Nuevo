'use client';

import { useState } from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, doc, getDoc, writeBatch } from 'firebase/firestore';
import { generateKeywords } from '@/lib/keywords';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

const MAX_NAMES = 50;

export default function BulkCreateDialog() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [names, setNames] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: number } | null>(null);

  const handleCreate = async () => {
    if (!firestore) {
      toast({ title: 'Error de conexión', description: 'No se pudo conectar a la base de datos.', variant: 'destructive' });
      return;
    }
    
    setIsCreating(true);
    setResult(null);

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

    for (const name of nameList) {
      try {
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        if (!slug) continue;
        
        const figureRef = doc(firestore, 'figures', slug);
        const docSnap = await getDoc(figureRef);

        if (docSnap.exists()) {
          skippedCount++;
        } else {
          const keywords = generateKeywords(name);
          const figureData = {
            id: slug,
            name: name,
            imageUrl: `https://placehold.co/600x400?text=${encodeURIComponent(name)}`,
            imageHint: `placeholder for ${name}`,
            nameKeywords: keywords,
            approved: true,
            createdAt: new Date(),
            attitude: { neutral: 0, fan: 0, simp: 0, hater: 0 },
            emotion: { alegria: 0, envidia: 0, tristeza: 0, miedo: 0, desagrado: 0, furia: 0 },
            ratingCount: 0,
            totalRating: 0,
            ratingsBreakdown: { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          };
          batch.set(figureRef, figureData);
          createdCount++;
        }
      } catch (error) {
        console.error(`Error processing name "${name}":`, error);
        errorCount++;
      }
    }

    try {
      await batch.commit();
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
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Creación Rápida de Perfiles</DialogTitle>
        <DialogDescription>
          Pega una lista de nombres (uno por línea) para crear múltiples perfiles a la vez. El sistema omitirá los duplicados.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-4">
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
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Resultados del Proceso</AlertTitle>
            <AlertDescription>
                <ul className="list-disc pl-5 text-sm">
                    <li><span className="font-bold">{result.created}</span> perfiles creados.</li>
                    <li><span className="font-bold">{result.skipped}</span> perfiles omitidos (duplicados).</li>
                    {result.errors > 0 && <li className="text-destructive"><span className="font-bold">{result.errors}</span> errores.</li>}
                </ul>
            </AlertDescription>
          </Alert>
        )}

      </div>
      <DialogFooter className="gap-2 sm:justify-end">
        <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isCreating}>Cerrar</Button>
        </DialogClose>
        <Button onClick={handleCreate} disabled={isCreating || lineCount === 0 || lineCount > MAX_NAMES}>
          {isCreating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Crear {lineCount > 0 ? lineCount : ''} Perfiles
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
