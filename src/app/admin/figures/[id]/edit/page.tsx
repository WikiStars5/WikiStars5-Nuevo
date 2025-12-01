
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { generateKeywords, normalizeText } from '@/lib/keywords';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, X, Link as LinkIcon, Plus, Trash2, ArrowLeft, ShieldCheck, Lock, Unlock } from 'lucide-react';
import type { Figure } from '@/lib/types';
import { CountrySelector } from '@/components/figure/country-selector';
import DateInput from '@/components/figure/date-input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

const SOCIAL_MEDIA_CONFIG = {
    website: { label: 'Página Web', placeholder: 'https://...' },
    instagram: { label: 'Instagram', placeholder: 'https://instagram.com/...' },
    twitter: { label: 'X (Twitter)', placeholder: 'https://x.com/...' },
    youtube: { label: 'YouTube', placeholder: 'https://youtube.com/...' },
    facebook: { label: 'Facebook', placeholder: 'https://facebook.com/...' },
    tiktok: { label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
    linkedin: { label: 'LinkedIn', placeholder: 'https://linkedin.com/in/...' },
    discord: { label: 'Discord', placeholder: 'https://discord.gg/...' },
    wikipedia: { label: 'Wikipedia', placeholder: 'https://es.wikipedia.org/wiki/...' },
    fandom: { label: 'Fandom', placeholder: 'https://comunidad.fandom.com/wiki/...' },
} as const;

type SocialPlatform = keyof typeof SOCIAL_MEDIA_CONFIG;

const urlSchema = (domain: string) => z.string().url("URL inválida.").optional().or(z.literal('')).refine(
    (url) => !url || url.includes(domain),
    { message: `La URL debe ser de ${domain}.` }
);

const editFormSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  imageUrl: z.string().url('Debe ser una URL válida.').optional().or(z.literal('')),
  description: z.string().optional(),
  nationality: z.string().optional(),
  gender: z.enum(['Femenino', 'Masculino']).optional(),
  birthDate: z.string().optional(),
  deathDate: z.string().optional(),
  occupation: z.string().max(20, 'La ocupación no puede superar los 20 caracteres.').optional(),
  maritalStatus: z.enum(['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Separado/Ex-Conviviente']).optional(),
  height: z.number().min(100).max(250).optional(),
  socialLinks: z.object({
    website: z.string().url("URL inválida.").optional().or(z.literal('')),
    instagram: urlSchema('instagram.com'),
    twitter: z.string().url("URL inválida.").optional().or(z.literal('')).refine(
        (url) => !url || url.includes('x.com') || url.includes('twitter.com'),
        { message: 'La URL debe ser de x.com o twitter.com.' }
    ),
    youtube: z.string().url("URL inválida.").optional().or(z.literal('')).refine(
        (url) => !url || url.includes('youtube.com') || url.includes('youtu.be'),
        { message: 'La URL debe ser de youtube.com o youtu.be.' }
    ),
    facebook: urlSchema('facebook.com'),
    tiktok: urlSchema('tiktok.com'),
    linkedin: urlSchema('linkedin.com'),
    discord: urlSchema('discord.gg'),
    wikipedia: urlSchema('wikipedia.org'),
    fandom: urlSchema('fandom.com'),
  }).optional(),
});


type EditFormValues = z.infer<typeof editFormSchema>;

const isValidImageUrl = (url: string | undefined | null): boolean => {
    if (!url) return false;
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false; 
    }
};

const getSanitizedDefaultValues = (figure: Figure): EditFormValues => {
    const defaultSocialLinks: { [key in SocialPlatform]?: string } = {};

    for (const key in SOCIAL_MEDIA_CONFIG) {
        const platform = key as SocialPlatform;
        const linkValue = figure.socialLinks?.[platform];
        defaultSocialLinks[platform] = linkValue || '';
    }

    return {
      name: figure.name || '',
      imageUrl: figure.imageUrl || '',
      description: figure.description || '',
      nationality: figure.nationality || '',
      gender: figure.gender || undefined,
      birthDate: figure.birthDate || '',
      deathDate: figure.deathDate || '',
      occupation: figure.occupation || '',
      maritalStatus: figure.maritalStatus || undefined,
      height: figure.height || undefined,
      socialLinks: defaultSocialLinks,
    };
};

function EditFigurePageContent({ figureId }: { figureId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isSaving, setIsSaving] = React.useState(false);

  const figureRef = useMemoFirebase(() => doc(firestore, 'figures', figureId), [firestore, figureId]);
  const { data: figure, isLoading } = useDoc<Figure>(figureRef);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name: '',
      imageUrl: '',
      description: '',
      nationality: '',
      gender: undefined,
      birthDate: '',
      deathDate: '',
      occupation: '',
      maritalStatus: undefined,
      height: undefined,
      socialLinks: {},
    }
  });

  React.useEffect(() => {
    if (figure) {
      form.reset(getSanitizedDefaultValues(figure));
    }
  }, [figure, form]);

  const onSubmit = async (data: EditFormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    
    try {
      const batch = writeBatch(firestore);
      const dataToSave: { [key: string]: any } = {};
      
      Object.entries(data).forEach(([key, value]) => {
          if (key !== 'socialLinks') {
            dataToSave[key] = value === '' || value === undefined ? null : value;
          }
      });
      
      if (data.socialLinks) {
        dataToSave.socialLinks = {};
        for (const platform in SOCIAL_MEDIA_CONFIG) {
          const key = platform as SocialPlatform;
          const link = data.socialLinks[key];
          dataToSave.socialLinks[key] = (link && link.trim()) ? link.trim() : null;
        }
      }
      
      dataToSave.nameKeywords = generateKeywords(data.name);

      batch.update(figureRef, dataToSave);
      await batch.commit();

      toast({
        title: '¡Perfil Actualizado!',
        description: `La información de ${data.name} ha sido guardada.`,
      });
      router.push('/admin/figures');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Guardar',
        description: 'No se pudo actualizar el perfil. Por favor, inténtalo de nuevo.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-5 w-2/3" />
            </CardHeader>
            <CardContent className="space-y-6">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
            </CardContent>
            <CardFooter>
                 <Skeleton className="h-10 w-24" />
            </CardFooter>
        </Card>
    )
  }

  if (!figure) {
      return (
          <Card>
              <CardHeader>
                <CardTitle>Perfil no encontrado</CardTitle>
              </CardHeader>
              <CardContent>
                <p>No se pudo encontrar el perfil que intentas editar.</p>
                <Button asChild className="mt-4"><Link href="/admin/figures">Volver a la lista</Link></Button>
              </CardContent>
          </Card>
      )
  }

  return (
    <Card>
       <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Editar Perfil</CardTitle>
                    <CardDescription>Modifica los datos de ${figure.name}.</CardDescription>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/admin/figures"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a la lista</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
                 <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center">
                        <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3">
                           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </span>
                        Información Esencial
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nombre Completo*</FormLabel>
                                <FormControl>
                                    <Input {...field} />
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
                                    <FormLabel>URL de la Imagen</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://..." {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                     <h3 className="text-lg font-medium flex items-center">
                        <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3">
                           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 9h.01"/><path d="M11 12h1v4h1"/></svg>
                        </span>
                        Información Detallada (Opcional)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <FormField
                            control={form.control}
                            name="gender"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Sexo</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un sexo" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Femenino">Femenino</SelectItem>
                                        <SelectItem value="Masculino">Masculino</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="nationality"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>País de origen</FormLabel>
                                 <CountrySelector
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                  />
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
                 <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center">
                        <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3">
                            <LinkIcon />
                        </span>
                        Redes Sociales y Wikis
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        {(Object.keys(SOCIAL_MEDIA_CONFIG) as SocialPlatform[]).map((platform) => (
                             <FormField
                                key={platform}
                                control={form.control}
                                name={`socialLinks.${platform}`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{SOCIAL_MEDIA_CONFIG[platform].label}</FormLabel>
                                        <div className="relative">
                                            <FormControl>
                                                <Input 
                                                    placeholder={SOCIAL_MEDIA_CONFIG[platform].placeholder} 
                                                    {...field}
                                                    value={field.value || ''}
                                                    className="pr-8"
                                                />
                                            </FormControl>
                                            {field.value && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-destructive"
                                                    onClick={() => form.setValue(`socialLinks.${platform}`, '')}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ))}
                    </div>
                 </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 p-6 border-t mt-6">
                <Button variant="ghost" onClick={() => router.back()} type="button">
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Cambios
                </Button>
            </CardFooter>
        </form>
       </Form>
    </Card>
  );
}

export default function EditFigurePage() {
    const params = useParams();
    const figureId = Array.isArray(params.id) ? params.id[0] : params.id;

    return <EditFigurePageContent figureId={figureId} />;
}

    