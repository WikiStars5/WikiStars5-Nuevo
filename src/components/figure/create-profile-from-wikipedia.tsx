
'use client';

import * as React from 'react';
import { useForm, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { generateKeywords, normalizeText } from '@/lib/keywords';
import { BLOCKED_NAMES } from '@/lib/blocked-names';

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, ArrowRight, Check, CheckCircle2, Loader2, Search } from 'lucide-react';
import {
  verifyWikipediaCharacter,
  type WikipediaVerificationOutput,
} from '@/ai/flows/verify-wikipedia-character';
import {
  verifyFamousBirthdaysCharacter,
  type VerifyFamousBirthdaysOutput,
} from '@/ai/flows/verify-famous-birthdays-character';
import Image from 'next/image';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Label } from '../ui/label';

const wikipediaSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
});
type WikipediaFormValues = z.infer<typeof wikipediaSchema>;

const famousBirthdaysSchema = z.object({
  url: z.string().url({ message: 'Por favor, introduce una URL válida de Famous Birthdays.' }),
});
type FamousBirthdaysFormValues = z.infer<typeof famousBirthdaysSchema>;

interface CreateProfileFromWikipediaProps {
  onProfileCreated: () => void;
}

export default function CreateProfileFromWikipedia({ onProfileCreated }: CreateProfileFromWikipediaProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [showPlanB, setShowPlanB] = React.useState(false);

  const [verificationResult, setVerificationResult] = React.useState<
    WikipediaVerificationOutput | VerifyFamousBirthdaysOutput | null
  >(null);
  const [verificationError, setVerificationError] = React.useState<string | null>(null);

  const wikipediaForm = useForm<WikipediaFormValues>({
    resolver: zodResolver(wikipediaSchema),
    defaultValues: { name: '' },
  });

  const famousBirthdaysForm = useForm<FamousBirthdaysFormValues>({
    resolver: zodResolver(famousBirthdaysSchema),
    defaultValues: { url: '' },
  });

  const handleVerifyWikipedia = async (data: WikipediaFormValues) => {
    setIsVerifying(true);
    setVerificationError(null);
    setVerificationResult(null);
    setShowPlanB(false);

    try {
      const result = await verifyWikipediaCharacter({ name: data.name });
      if (result.found && result.title) {
        setVerificationResult({ ...result, source: 'Wikipedia' });
      } else {
        setShowPlanB(true);
        setVerificationError(result.verificationError);
        toast({
            title: "No Encontrado en Wikipedia",
            description: "Se activó el Plan B. Inténtalo con un enlace de Famous Birthdays.",
            variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error verifying Wikipedia:', error);
      setShowPlanB(true);
      setVerificationError('Ocurrió un error al verificar en Wikipedia. Inténtalo de nuevo.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyFamousBirthdays = async (data: FamousBirthdaysFormValues) => {
    setIsVerifying(true);
    setVerificationError(null);
    setVerificationResult(null);

    // We need the name from the wikipedia form to pass to the famous birthdays flow
    const wikipediaName = wikipediaForm.getValues('name');
    if (!wikipediaName) {
        setVerificationError('Por favor, introduce un nombre en el campo de Wikipedia primero.');
        setIsVerifying(false);
        return;
    }


    try {
      const result = await verifyFamousBirthdaysCharacter({ url: data.url, name: wikipediaName });
      if (result.found) {
        setVerificationResult(result);
        setShowPlanB(false);
      } else {
        setVerificationError(result.verificationError || 'No se pudo verificar la URL. Asegúrate de que sea correcta.');
      }
    } catch (error) {
      console.error('Error verifying Famous Birthdays:', error);
      setVerificationError('Ocurrió un error al verificar en Famous Birthdays. Inténtalo de nuevo.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCreate = async () => {
    if (!firestore || !verificationResult?.title) return;

    // --- CENSORSHIP CHECK ---
    const normalizedTitle = normalizeText(verificationResult.title);
    if (BLOCKED_NAMES.includes(normalizedTitle)) {
        toast({
            title: 'Creación de Perfil Bloqueada',
            description: 'La creación de perfiles para esta figura está restringida.',
            variant: 'destructive',
        });
        return;
    }
    
    setIsCreating(true);

    const slug = verificationResult.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const figureRef = doc(firestore, 'figures', slug);

    try {
        // First, just check if the document exists outside of a transaction.
        const docSnap = await getDoc(figureRef);
        if (docSnap.exists()) {
            toast({
                variant: 'destructive',
                title: 'Perfil Duplicado',
                description: `Ya existe un perfil para "${verificationResult.title}". Redirigiendo...`,
            });
            router.push(`/figures/${slug}`);
            onProfileCreated();
            setIsCreating(false);
            return;
        }
        
        // If it does not exist, then proceed with the creation transaction.
        await runTransaction(firestore, async (transaction) => {
            const keywords = generateKeywords(verificationResult.title!);

            const figureData = {
                id: slug,
                name: verificationResult.title,
                imageUrl: verificationResult.imageUrl,
                imageHint: `portrait of ${verificationResult.title}`,
                nationality: '',
                tags: [],
                isFeatured: false,
                nameKeywords: keywords,
                createdAt: serverTimestamp(),
                approved: true, // Auto-approved
                attitude: { neutral: 0, fan: 0, simp: 0, hater: 0 },
                emotion: { alegria: 0, envidia: 0, tristeza: 0, miedo: 0, desagrado: 0, furia: 0 },
                ratingCount: 0,
                totalRating: 0,
                ratingsBreakdown: { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
            };
            
            transaction.set(figureRef, figureData);
        });
        
        toast({
            title: '¡Perfil Creado!',
            description: `El perfil para ${verificationResult.title} ha sido añadido.`,
        });
        router.push(`/figures/${slug}`);
        onProfileCreated();

    } catch (error: any) {
        console.error('Error creating profile:', error);
        toast({
            variant: 'destructive',
            title: 'Error al Crear',
            description: error.message || 'No se pudo crear el perfil. Inténtalo de nuevo.',
        });
    } finally {
        setIsCreating(false);
    }
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setVerificationError(null);
    setShowPlanB(false);
    wikipediaForm.reset();
    famousBirthdaysForm.reset();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Crear Perfil desde la Web</DialogTitle>
        <DialogDescription>
          Verifica un personaje en Wikipedia o Famous Birthdays para autocompletar su perfil.
        </DialogDescription>
      </DialogHeader>

      {!verificationResult && (
        <div className="space-y-4 py-4">
          <Form {...wikipediaForm}>
            <form onSubmit={wikipediaForm.handleSubmit(handleVerifyWikipedia)} className="flex items-start gap-2">
              <FormField
                control={wikipediaForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Ej: Lionel Messi" {...field} disabled={isVerifying} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isVerifying} className="w-[150px]">
                {isVerifying && wikipediaForm.formState.isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Search className="mr-2" /> Verificar
                  </>
                )}
              </Button>
            </form>
          </Form>

          {showPlanB && (
             <div className="space-y-4 pt-4">
              <Alert variant="destructive" className="bg-yellow-900/20 border-yellow-700/50 text-yellow-200 [&gt;svg]:text-yellow-400">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-bold text-yellow-300">Plan B: Verificación Manual</AlertTitle>
                <AlertDescription className="text-yellow-300/90">
                  {verificationError || "No se encontró en Wikipedia. Pega el enlace de su perfil en es.famousbirthdays.com para verificarlo manually."}
                </AlertDescription>
              </Alert>
              
              <Form {...famousBirthdaysForm}>
                <form
                  onSubmit={famousBirthdaysForm.handleSubmit(handleVerifyFamousBirthdays)}
                  className="space-y-3"
                >
                 <div className="space-y-2">
                    <Label htmlFor="url" className="text-sm font-medium">URL de FamousBirthdays.com</Label>
                    <FormField
                        control={famousBirthdaysForm.control}
                        name="url"
                        render={({ field }) => (
                        <FormItem>
                            <FormControl>
                            <Input
                                id="url"
                                placeholder="https://es.famousbirthdays.com/people/..."
                                {...field}
                                disabled={isVerifying}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                 </div>
                  <Button type="submit" disabled={isVerifying} className="w-full">
                    {isVerifying && famousBirthdaysForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 
                    (
                        <>
                        <Check className="mr-2 h-4 w-4" /> Verificar con URL
                        </>
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </div>
      )}

      {verificationResult && (
        <div className="py-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="text-green-500" /> Personaje Encontrado
              </CardTitle>
              <CardDescription>
                Hemos verificado la siguiente información. Confirma para crear el perfil.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              {verificationResult.imageUrl && (
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md">
                  <Image
                    src={verificationResult.imageUrl}
                    alt={verificationResult.title || 'Foto de perfil'}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold">{verificationResult.title}</h3>
                <Badge variant="outline">{verificationResult.source}</Badge>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="ghost" onClick={resetVerification} disabled={isCreating}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    Crear Perfil <ArrowRight className="ml-2" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </DialogContent>
  );
}
