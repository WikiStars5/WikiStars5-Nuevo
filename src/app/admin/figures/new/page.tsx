
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
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
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';


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

const createFormSchema = z.object({
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

type CreateFormValues = z.infer<typeof createFormSchema>;


const isValidImageUrl = (url: string | undefined | null): boolean => {
    if (!url) return false;
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false; 
    }
};

export default function AdminNewFigurePage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      name: '',
      imageUrl: '',
      description: '',
      nationality: '',
      isFeatured: false,
      tags: [],
      socialLinks: {},
    },
  });
  
  const imageUrlWatcher = form.watch('imageUrl');
  const heightWatcher = form.watch('height');
  const tagsWatcher = form.watch('tags') || [];
  const [hashtagInput, setHashtagInput] = React.useState('');

  const handleAddHashtag = (newTag?: string) => {
    const tagToAdd = normalizeText(newTag || hashtagInput);
    if (!tagToAdd) return;

    if (tagsWatcher.length >= 10) {
      toast({
        title: 'Límite de Hashtags Alcanzado',
        description: 'No puedes añadir más de 10 hashtags.',
        variant: 'destructive',
      });
      return;
    }

    const currentTagsLower = tagsWatcher.map(t => normalizeText(t));
    if (!currentTagsLower.includes(tagToAdd)) {
        form.setValue('tags', [...tagsWatcher, tagToAdd]);
    }
    setHashtagInput('');
  };

  const handleRemoveHashtag = (tagToRemove: string) => {
    form.setValue(
        'tags',
        tagsWatcher.filter(tag => normalizeText(tag) !== normalizeText(tagToRemove))
    );
  };

  const onSubmit = async (data: CreateFormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const figureRef = doc(firestore, 'figures', slug);

    try {
      const docSnap = await getDoc(figureRef);
      if (docSnap.exists()) {
        toast({
          variant: 'destructive',
          title: 'Perfil Duplicado',
          description: `Ya existe un perfil para "${data.name}" con el ID "${slug}".`,
        });
        setIsSaving(false);
        return;
      }
      
      const keywords = generateKeywords(data.name);
      
      const figureData: Partial<Figure> = {
        id: slug,
        name: data.name,
        imageUrl: data.imageUrl || `https://placehold.co/600x400?text=${encodeURIComponent(data.name)}`,
        imageHint: data.imageUrl ? `portrait of ${data.name}` : `placeholder for ${data.name}`,
        description: data.description || '',
        nationality: data.nationality || null,
        gender: data.gender || null,
        birthDate: data.birthDate || null,
        deathDate: data.deathDate || null,
        occupation: data.occupation || null,
        maritalStatus: data.maritalStatus || null,
        height: data.height || null,
        socialLinks: data.socialLinks || {},
        isFeatured: data.isFeatured,
        tags: data.tags?.map(t => normalizeText(t)) || [],
        nameKeywords: keywords,
        approved: true, // Admin-created profiles are auto-approved
        createdAt: serverTimestamp(),
        attitude: { neutral: 0, fan: 0, simp: 0, hater: 0 },
        emotion: { alegria: 0, envidia: 0, tristeza: 0, miedo: 0, desagrado: 0, furia: 0 },
        ratingCount: 0,
        totalRating: 0,
        ratingsBreakdown: { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      };

      setDocumentNonBlocking(figureRef, figureData, { merge: false });

      toast({
        title: '¡Perfil Creado!',
        description: `El perfil para ${data.name} ha sido añadido.`,
      });
      
      router.push(`/admin/figures`);

    } catch (error) {
      console.error('Error creating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Crear',
        description: 'No se pudo crear el perfil. Inténtalo de nuevo.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
       <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Añadir Nuevo Perfil</CardTitle>
                    <CardDescription>Crea un perfil de figura pública manualmente.</CardDescription>
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
                                        <Input placeholder="https://..." {...field} />
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
                    Crear Perfil
                </Button>
            </CardFooter>
        </form>
       </Form>
    </Card>
  );
}

    