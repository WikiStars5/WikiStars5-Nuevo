
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, Globe, Loader2 } from 'lucide-react';
import { verifyDomain } from '@/ai/flows/verify-domain';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const domainSchema = z.object({
  domain: z
    .string()
    .min(3, { message: 'El dominio debe tener al menos 3 caracteres.' })
    .refine(val => !val.startsWith('http'), { message: 'Introduce solo el dominio, sin http:// o https://.' }),
});
type DomainFormValues = z.infer<typeof domainSchema>;

interface CreateProfileFromWebProps {
  onProfileCreated: () => void;
}

export default function CreateProfileFromWebDialog({ onProfileCreated }: CreateProfileFromWebProps) {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [verificationResult, setVerificationResult] = React.useState<{ domain: string; isValid: boolean; error: string | null } | null>(null);

  const form = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema),
    defaultValues: { domain: '' },
  });

  const handleVerifyDomain = async (data: DomainFormValues) => {
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const result = await verifyDomain({ domain: data.domain });
      setVerificationResult({ domain: data.domain, ...result });

      if (result.isValid) {
        toast({
          title: 'Dominio Válido',
          description: `El dominio ${data.domain} es accesible. Procediendo...`,
          variant: 'default',
        });
        // Automatically proceed to the next step on success
        onProfileCreated();
      } else {
        toast({
          title: 'Error de Verificación',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      toast({
        title: 'Error Inesperado',
        description: 'Ocurrió un error al intentar verificar el dominio.',
        variant: 'destructive',
      });
      setVerificationResult({
        domain: data.domain,
        isValid: false,
        error: 'Ocurrió un error inesperado.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const resetVerification = () => {
    setVerificationResult(null);
    form.reset();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Crear Perfil Web</DialogTitle>
        <DialogDescription>
          Verifica que un dominio es accesible antes de continuar con la creación del perfil.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleVerifyDomain)} className="flex items-start gap-2">
            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder="ejemplo.com" {...field} disabled={isVerifying} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isVerifying} className="w-[180px]">
              {isVerifying ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Globe className="mr-2" /> Verificar y Crear
                </>
              )}
            </Button>
          </form>
        </Form>

        {verificationResult && !verificationResult.isValid && (
          <div className="mt-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Verificación Fallida</AlertTitle>
                <AlertDescription>
                  {verificationResult.error || 'No se pudo verificar el dominio.'}
                </AlertDescription>
              </Alert>
          </div>
        )}
      </div>

       <DialogFooter className="justify-end gap-2">
          <Button variant="ghost" onClick={resetVerification} disabled={isVerifying}>
            Limpiar
          </Button>
        </DialogFooter>

    </DialogContent>
  );
}
