'use client';

import * as React from 'react';
import { useForm, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

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
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Search } from 'lucide-react';
import {
  verifyWikipediaCharacter,
  type VerifyWikipediaCharacterOutput,
} from '@/ai/flows/verify-wikipedia-character';
import {
  verifyFamousBirthdaysCharacter,
  type VerifyFamousBirthdaysOutput,
} from '@/ai/flows/verify-famous-birthdays-character';
import Image from 'next/image';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

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

  const [verificationResult, setVerificationResult] = React.useState<
    VerifyWikipediaCharacterOutput | VerifyFamousBirthdaysOutput | null
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

    try {
      const result = await verifyWikipediaCharacter({ name: data.name });
      if (result.found) {
        setVerificationResult(result);
      } else {
        setVerificationError(
          result.verificationError || 'No se encontró un personaje coincidente en Wikipedia. Prueba con Famous Birthdays.'
        );
      }
    } catch (error) {
      console.error('Error verifying Wikipedia:', error);
      setVerificationError('Ocurrió un error al verificar en Wikipedia. Inténtalo de nuevo.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyFamousBirthdays = async (data: FamousBirthdaysFormValues) => {
    setIsVerifying(true);
    setVerificationError(null);
    setVerificationResult(null);

    try {
      const result = await verifyFamousBirthdaysCharacter({ url: data.url });
      if (result.found) {
        setVerificationResult(result);
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
    setIsCreating(true);

    const slug = verificationResult.title.toLowerCase().replace(/\s+/g, '-');
    const figureRef = doc(firestore, 'figures', slug);

    try {
      const docSnap = await getDoc(figureRef);
      if (docSnap.exists()) {
        toast({
          variant: 'destructive',
          title: 'Perfil Duplicado',
          description: `Ya existe un perfil para ${verificationResult.title}. Redirigiendo...`,
        });
        router.push(`/figures/${slug}`);
        onProfileCreated();
        setIsCreating(false);
        return;
      }

      const figureData = {
        id: slug,
        name: verificationResult.title,
        imageUrl: verificationResult.imageUrl,
        imageHint: `portrait of ${verificationResult.title}`,
        bio: '', // Se puede rellenar después
        nationality: '', // Se puede rellenar después
        tags: [],
        ratings: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
        socials: {},
        isFeatured: false,
        createdAt: serverTimestamp(),
        approved: false, // Los perfiles creados así pueden necesitar aprobación
      };
      
      // Use the non-blocking fire-and-forget write function
      setDocumentNonBlocking(figureRef, figureData, {});

      toast({
        title: '¡Perfil Creado!',
        description: `El perfil para ${verificationResult.title} ha sido añadido.`,
      });
      router.push(`/figures/${slug}`);
      onProfileCreated();

    } catch (error) {
      // This generic catch block might handle errors from getDoc, but the setDoc error
      // is now handled non-blockingly and will be caught by the global error listener.
      console.error('Error during profile creation check:', error);
      toast({
        variant: 'destructive',
        title: 'Error de Verificación',
        description: 'No se pudo comprobar si el perfil ya existe. Por favor, inténtalo de nuevo.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setVerificationError(null);
    wikipediaForm.reset();
    famousBirthdaysForm.reset();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Crear Perfil desde la Web</DialogTitle>
        <DialogDescription>
          Verifica un personaje en Wikipedia para autocompletar su perfil.
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
                {isVerifying ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Search className="mr-2" /> Verificar
                  </>
                )}
              </Button>
            </form>
          </Form>

          {verificationError && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error de Verificación</AlertTitle>
                <AlertDescription>{verificationError}</AlertDescription>
              </Alert>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Plan B</span>
                </div>
              </div>
              <Form {...famousBirthdaysForm}>
                <form
                  onSubmit={famousBirthdaysForm.handleSubmit(handleVerifyFamousBirthdays)}
                  className="flex items-start gap-2"
                >
                  <FormField
                    control={famousBirthdaysForm.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder="https://es.famousbirthdays.com/people/..."
                            {...field}
                            disabled={isVerifying}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isVerifying} variant="secondary" className="w-[150px]">
                    {isVerifying ? <Loader2 className="animate-spin" /> : 'Verificar URL'}
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
