
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { generateKeywords } from '@/lib/keywords';

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, Globe, Loader2, ArrowRight } from 'lucide-react';
import { verifyDomain } from '@/ai/flows/verify-domain';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';

const domainSchema = z.object({
  domain: z
    .string()
    .min(3, { message: 'El dominio debe tener al menos 3 caracteres.' }),
});
type DomainFormValues = z.infer<typeof domainSchema>;

interface CreateProfileFromWebDialogProps {
  onProfileCreated: () => void;
}

/**
 * Extracts and cleans the domain from a given string.
 * "https://www.example.com/path" -> "example.com"
 * "sub.example.co.uk" -> "sub.example.co.uk"
 */
function cleanDomain(input: string): string {
    let domain = input;
    // Remove protocol
    domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '');
    // Remove path
    domain = domain.split('/')[0];
    return domain;
}


export default function CreateProfileFromWebDialog({ onProfileCreated }: CreateProfileFromWebDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState<'verify' | 'confirm'>('verify');
  const [verifiedDomain, setVerifiedDomain] = React.useState<string | null>(null);
  const [verificationError, setVerificationError] = React.useState<string | null>(null);

  const form = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema),
    defaultValues: { domain: '' },
  });

  const handleVerifyDomain = async (data: DomainFormValues) => {
    setIsVerifying(true);
    setVerificationError(null);
    
    const domainToVerify = cleanDomain(data.domain);

    if (!domainToVerify) {
        setVerificationError('Por favor, introduce un dominio válido.');
        setIsVerifying(false);
        return;
    }

    try {
      const result = await verifyDomain({ domain: domainToVerify });
      if (result.isValid) {
        toast({
          title: 'Dominio Válido',
          description: `El dominio ${domainToVerify} es accesible.`,
        });
        setVerifiedDomain(domainToVerify);
        setCurrentStep('confirm');
      } else {
        setVerificationError(result.error || 'No se pudo verificar el dominio.');
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      setVerificationError('Ocurrió un error inesperado al verificar el dominio.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!firestore || !verifiedDomain) return;
    setIsCreating(true);

    const slug = verifiedDomain.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const figureRef = doc(firestore, 'figures', slug);

    try {
      const docSnap = await getDoc(figureRef);
      if (docSnap.exists()) {
        toast({
          variant: 'destructive',
          title: 'Perfil Duplicado',
          description: `Ya existe un perfil para ${verifiedDomain}. Redirigiendo...`,
        });
        router.push(`/figures/${slug}`);
        onProfileCreated();
        return;
      }

      const keywords = generateKeywords(verifiedDomain);
      
      const figureData = {
        id: slug,
        name: verifiedDomain,
        imageUrl: `https://www.google.com/s2/favicons?sz=128&domain_url=${verifiedDomain}`,
        imageHint: `favicon for ${verifiedDomain}`,
        nationality: 'Web',
        tags: [verifiedDomain],
        isFeatured: false,
        nameKeywords: keywords,
        createdAt: serverTimestamp(),
        approved: true,
      };

      setDocumentNonBlocking(figureRef, figureData, { merge: false });

      toast({
        title: '¡Perfil Creado!',
        description: `El perfil para ${verifiedDomain} ha sido añadido.`,
      });
      
      router.push(`/figures/${slug}`);
      onProfileCreated();

    } catch (error) {
      console.error('Error creating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Crear',
        description: 'No se pudo crear el perfil. Inténtalo de nuevo.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetFlow = () => {
    setCurrentStep('verify');
    setVerifiedDomain(null);
    setVerificationError(null);
    form.reset();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Crear Perfil Web</DialogTitle>
        <DialogDescription>
          {currentStep === 'verify'
            ? 'Verifica un dominio para crear un perfil web básico.'
            : 'Confirma la creación del perfil para el dominio verificado.'}
        </DialogDescription>
      </DialogHeader>

      {currentStep === 'verify' && (
        <div className="space-y-4 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleVerifyDomain)} className="flex items-start gap-2">
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="ejemplo.com o https://ejemplo.com" {...field} disabled={isVerifying} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isVerifying} className="w-[180px]">
                {isVerifying ? <Loader2 className="animate-spin" /> : <><Globe className="mr-2" /> Verificar</>}
              </Button>
            </form>
          </Form>

          {verificationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Verificación Fallida</AlertTitle>
              <AlertDescription>{verificationError}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {currentStep === 'confirm' && verifiedDomain && (
         <div className="py-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="text-green-500" /> Dominio Verificado
              </CardTitle>
              <CardDescription>
                ¿Deseas crear un perfil para el siguiente dominio?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-bold text-center p-4 bg-muted rounded-md">{verifiedDomain}</h3>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="ghost" onClick={resetFlow} disabled={isCreating}>
                Cancelar
              </Button>
              <Button onClick={handleCreateProfile} disabled={isCreating}>
                {isCreating ? <Loader2 className="animate-spin" /> : <>Confirmar y Crear <ArrowRight className="ml-2" /></>}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </DialogContent>
  );
}
