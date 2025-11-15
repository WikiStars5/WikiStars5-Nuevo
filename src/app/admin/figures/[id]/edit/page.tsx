
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
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, X, Link as LinkIcon, Tag, Plus, Trash2, ArrowLeft } from 'lucide-react';
import type { Figure } from '@/lib/types';
import { CountrySelector } from '@/components/figure/country-selector';
import DateInput from '@/components/figure/date-input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import HashtagCombobox from '@/components/figure/hashtag-combobox';
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
} as const;

type SocialPlatform = keyof typeof SOCIAL_MEDIA_CONFIG;

const editFormSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  imageUrl: z.string().url('Debe ser una URL válida.').optional().or(z.literal('')),
  description: z.string().optional(),
  nationality: z.string().optional(),
  gender: z.enum(['Femenino', 'Masculino']).optional(),
  birthDate: z.string().optional(),
  deathDate: z.string().optional(),
  occupation: z.string().optional(),
  maritalStatus: z.enum(['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Separado/Ex-Conviviente']).optional(),
  height: z.number().min(100).max(250).optional(),
  socialLinks: z.object(
    Object.keys(SOCIAL_MEDIA_CONFIG).reduce((acc, key) => {
        acc[key as SocialPlatform] = z.string().url().or(z.literal('')).optional();
        return acc;
    }, {} as Record<SocialPlatform, z.ZodTypeAny>)
  ).optional(),
  tags: z.array(z.string()).optional(),
  isFeatured: z.boolean().default(false),
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
      tags: figure.tags?.map(tag => normalizeText(tag)) || [],
      isFeatured: figure.isFeatured || false,
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
  });

  React.useEffect(() => {
    if (figure) {
      form.reset(getSanitizedDefaultValues(figure));
    }
  }, [figure, form]);

  const imageUrlWatcher = form.watch('imageUrl');
  const heightWatcher = form.watch('height');
  const tagsWatcher = form.watch('tags') || [];
  const [hashtagInput, setHashtagInput] = React.useState('');

  const handleAddHashtag = (newTag?: string) => {
    const tagToAdd = normalizeText(newTag || hashtagInput);
    if (!tagToAdd) return;
    if (tagsWatcher.length >= 10) {
      toast({ title: 'Límite de Hashtags Alcanzado', description: 'No puedes añadir más de 10 hashtags.', variant: 'destructive' });
      return;
    }
    const currentTagsLower = tagsWatcher.map(t => normalizeText(t));
    if (!currentTagsLower.includes(tagToAdd)) {
        form.setValue('tags', [...tagsWatcher, tagToAdd]);
    }
    setHashtagInput('');
  };

  const handleRemoveHashtag = (tagToRemove: string) => {
    form.setValue('tags', tagsWatcher.filter(tag => normalizeText(tag) !== normalizeText(tagToRemove)));
  };

  const onSubmit = async (data: EditFormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    
    try {
      const batch = writeBatch(firestore);
      const dataToSave: { [key: string]: any } = {};
      
      Object.entries(data).forEach(([key, value]) => {
          if (key !== 'socialLinks' && key !== 'tags') {
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
      
      const finalTags = (data.tags || []).map(tag => normalizeText(tag)).filter(Boolean);
      dataToSave.tags = finalTags;
      dataToSave.nameKeywords = generateKeywords(data.name);

      finalTags.forEach(tag => {
        const hashtagRef = doc(firestore, 'hashtags', tag);
        batch.set(hashtagRef, { name: tag }, { merge: true });
      });

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
                    <CardDescription>Modifica los datos de {figure.name}.</CardDescription>
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
                            <Tag />
                        </span>
                        Categorización
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                             <Label>Hashtags (máx. 10)</Label>
                            <div className="flex items-center gap-2">
                                <HashtagCombobox
                                    inputValue={hashtagInput}
                                    onInputChange={setHashtagInput}
                                    onTagSelect={handleAddHashtag}
                                />
                                <Button type="button" onClick={() => handleAddHashtag()} disabled={!hashtagInput.trim()}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2 min-h-[24px]">
                                {tagsWatcher.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="pl-3">
                                    {tag}
                                    <button
                                        type="button"
                                        className="ml-2 rounded-full p-0.5 hover:bg-destructive/20"
                                        onClick={() => handleRemoveHashtag(tag)}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                         <FormField
                            control={form.control}
                            name="isFeatured"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm h-fit mt-auto">
                                <div className="space-y-0.5">
                                    <FormLabel>Perfil Destacado</FormLabel>
                                    <FormMessage />
                                </div>
                                <FormControl>
                                    <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                </FormItem>
                            )}
                        />
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
