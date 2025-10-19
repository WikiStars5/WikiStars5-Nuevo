
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore } from '@/firebase';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { generateKeywords } from '@/lib/keywords';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import CreateProfileFromWeb from '@/components/figure/create-profile-from-web';

const figureFormSchema = z.object({
  name: z.string().min(2, 'El nombre es obligatorio.'),
  nationality: z.string().optional(),
  imageUrl: z.string().url('Debe ser una URL de imagen válida.').optional(),
});

type FigureFormValues = z.infer<typeof figureFormSchema>;

export default function NewFigurePage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = React.useState(false);
  const [verifiedDomain, setVerifiedDomain] = React.useState<string | null>(null);

  const form = useForm<FigureFormValues>({
    resolver: zodResolver(figureFormSchema),
    defaultValues: {
      name: '',
      nationality: '',
      imageUrl: '',
    },
  });

  const handleDomainVerified = (domain: string) => {
    setVerifiedDomain(domain);
    // You could potentially pre-fill the name based on the domain if desired
    // form.setValue('name', domain.split('.')[0]);
  };

  const handleCreateProfile = async (data: FigureFormValues) => {
    if (!firestore) return;
    setIsCreating(true);

    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const figureRef = doc(firestore, 'figures', slug);

    try {
      const docSnap = await getDoc(figureRef);
      if (docSnap.exists()) {
        toast({
          variant: 'destructive',
          title: 'Perfil Duplicado',
          description: `Ya existe un perfil para ${data.name}.`,
        });
        setIsCreating(false);
        return;
      }

      const keywords = generateKeywords(data.name);
      
      const figureData = {
        id: slug,
        name: data.name,
        imageUrl: data.imageUrl || `https://picsum.photos/seed/${slug}/600/400`,
        imageHint: `portrait of ${data.name}`,
        nationality: data.nationality || '',
        tags: verifiedDomain ? [verifiedDomain] : [],
        isFeatured: false,
        nameKeywords: keywords,
        createdAt: serverTimestamp(),
        approved: true, // Auto-approved for web profiles for now
      };

      setDocumentNonBlocking(figureRef, figureData, { merge: false });

      toast({
        title: '¡Perfil Creado!',
        description: `El perfil para ${data.name} ha sido añadido. Redirigiendo...`,
      });

      // Redirect after a short delay to allow toast to be seen
      setTimeout(() => {
        router.push(`/admin/figures`);
        router.refresh();
      }, 2000);

    } catch (error) {
      console.error('Error creating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Crear',
        description: 'No se pudo crear el perfil. Inténtalo de nuevo.',
      });
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
       <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold md:text-2xl">Crear Nuevo Perfil Web</h1>
        </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Paso 1: Verificar Dominio</CardTitle>
          <CardDescription>
            Introduce un dominio para asegurarte de que es accesible. Este dominio se usará como una etiqueta para el perfil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateProfileFromWeb onDomainVerified={handleDomainVerified} />
        </CardContent>
      </Card>

      {verifiedDomain && (
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateProfile)}>
              <CardHeader>
                <CardTitle>Paso 2: Completar Perfil</CardTitle>
                <CardDescription>
                  El dominio <span className="font-bold text-primary">{verifiedDomain}</span> ha sido verificado. Ahora, completa los detalles del perfil.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Perfil</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Mi Sitio Web Increíble" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nacionalidad (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Internacional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de la Imagen (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://ejemplo.com/logo.png" {...field} />
                      </FormControl>
                       <FormDescription>
                        Si se deja en blanco, se usará una imagen de marcador de posición.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : (
                    <Save className="mr-2" />
                  )}
                  Guardar Perfil
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      )}
    </div>
  );
}
