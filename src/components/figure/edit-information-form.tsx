
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, writeBatch } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, X, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import type { Figure } from '@/lib/types';
import { CountrySelector } from './country-selector';
import DateInput from './date-input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '../ui/badge';

interface EditInformationFormProps {
  figure: Figure;
  onFormClose: () => void;
}

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
  imageUrl: z.string().optional(),
  gender: z.enum(['Femenino', 'Masculino']).optional(),
  birthDate: z.string().optional(),
  deathDate: z.string().optional(),
  nationality: z.string().optional(),
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
        const urlObject = new URL(url);
        return urlObject.protocol === 'https:' && 
               (urlObject.hostname === 'upload.wikimedia.org' || urlObject.hostname === 'i.pinimg.com');
    } catch (e) {
        return false; 
    }
};

const getSanitizedDefaultValues = (figure: Figure): Omit<EditFormValues, 'name'> => {
    const defaultSocialLinks: { [key in SocialPlatform]?: string } = {};

    for (const key in SOCIAL_MEDIA_CONFIG) {
        const platform = key as SocialPlatform;
        const linkValue = figure.socialLinks?.[platform];
        defaultSocialLinks[platform] = linkValue || '';
    }

    return {
      imageUrl: figure.imageUrl || '',
      gender: figure.gender || undefined,
      birthDate: figure.birthDate || '',
      deathDate: figure.deathDate || '',
      nationality: figure.nationality || '',
      occupation: figure.occupation || '',
      maritalStatus: figure.maritalStatus || undefined,
      height: figure.height || undefined,
      socialLinks: defaultSocialLinks,
    };
};

export default function EditInformationForm({ figure, onFormClose }: EditInformationFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: getSanitizedDefaultValues(figure),
  });
  
  const imageUrlWatcher = form.watch('imageUrl');
  const heightWatcher = form.watch('height');

  const onSubmit = async (data: EditFormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    
    const figureRef = doc(firestore, 'figures', figure.id);

    try {
      const batch = writeBatch(firestore);
      
      const dataToSave: { [key: string]: any } = {};
      
      // Handle direct properties, converting undefined or empty strings to null
      Object.entries(data).forEach(([key, value]) => {
          if (key !== 'socialLinks') {
            dataToSave[key] = value === '' || value === undefined ? null : value;
          }
      });
      
      // Handle social links, converting empty strings to null
      if (data.socialLinks) {
        dataToSave.socialLinks = {};
        for (const platform in SOCIAL_MEDIA_CONFIG) {
          const key = platform as SocialPlatform;
          const link = data.socialLinks[key];
          dataToSave.socialLinks[key] = (link && link.trim()) ? link.trim() : null;
        }
      }

      batch.update(figureRef, dataToSave);
      await batch.commit();

      toast({
        title: '¡Perfil Actualizado!',
        description: `La información de ${figure.name} ha sido guardada.`,
      });
      onFormClose();
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

  return (
    <Card>
       <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
                <CardTitle>Editar Información</CardTitle>
                <CardDescription>Modifica los datos biográficos de ${figure.name}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center">
                        <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M20.4 14.5c0-1.6-1.3-3-3-3s-3 1.3-3 3c0 .8.3 1.5.8 2.1l-2.7 2.7c-.4.4-.4 1 0 1.4.2.2.5.3.7.3s.5-.1.7-.3l2.7-2.7c.6.5 1.3.8 2.1.8 1.7 0 3-1.4 3-3Z"/></svg>
                        </span>
                        Imagen de Perfil
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                        <div className="md:col-span-2 space-y-2">
                             <FormField
                                control={form.control}
                                name="imageUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL de la Imagen</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://upload.wikimedia.org/..." {...field} value={field.value || ''}/>
                                        </FormControl>
                                        <div className="flex items-center justify-between pt-1">
                                            <p className="text-xs text-muted-foreground">
                                                Solo se permiten URLs de `upload.wikimedia.org` y `i.pinimg.com`.
                                            </p>
                                            {field.value && (
                                                <Button
                                                    type="button"
                                                    variant="link"
                                                    size="sm"
                                                    className="h-auto p-0 text-xs text-destructive"
                                                    onClick={() => form.setValue('imageUrl', '')}
                                                >
                                                    <Trash2 className="mr-1 h-3 w-3" />
                                                    Eliminar enlace
                                                </Button>
                                            )}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                                />
                        </div>
                        <div className="space-y-2">
                             <Label>Vista Previa</Label>
                             <div className="aspect-square relative w-full max-w-[150px] rounded-md overflow-hidden border-2 border-dashed flex items-center justify-center bg-muted">
                                {isValidImageUrl(imageUrlWatcher) ? (
                                    <Image src={imageUrlWatcher!} alt="Vista previa" fill objectFit="cover" />
                                ) : (
                                    <span className="text-xs text-muted-foreground p-2 text-center">URL inválida o vacía</span>
                                )}
                             </div>
                        </div>
                    </div>
                </div>
                
                <div className="space-y-4">
                     <h3 className="text-lg font-medium flex items-center">
                        <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3">
                           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </span>
                        Información Personal
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
                            name="birthDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha de Nacimiento</FormLabel>
                                    <FormControl>
                                        <DateInput
                                            value={field.value || ''}
                                            onChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="deathDate"
                            render={({ field }) => (
                               <FormItem className="flex flex-col">
                                    <FormLabel>Fecha de Fallecimiento</FormLabel>
                                    <FormControl>
                                        <DateInput
                                            value={field.value || ''}
                                            onChange={field.onChange}
                                        />
                                    </FormControl>
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
                        <FormField
                            control={form.control}
                            name="occupation"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Ocupación</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Ej: Futbolista, Cantante" value={field.value || ''} maxLength={20} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="maritalStatus"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Estado Civil</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un estado civil" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Soltero/a">Soltero/a</SelectItem>
                                        <SelectItem value="Casado/a">Casado/a</SelectItem>
                                        <SelectItem value="Divorciado/a">Divorciado/a</SelectItem>
                                        <SelectItem value="Viudo/a">Viudo/a</SelectItem>
                                        <SelectItem value="Separado/Ex-Conviviente">Separado/Ex-Conviviente</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="height"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Altura</FormLabel>
                                    <div className="flex items-center gap-4">
                                        <FormControl>
                                            <Slider
                                                min={100}
                                                max={250}
                                                step={1}
                                                defaultValue={[field.value || 170]}
                                                onValueChange={(value) => field.onChange(value[0])}
                                                className="w-[80%]"
                                            />
                                        </FormControl>
                                        <span className="w-[20%] text-center text-sm font-medium text-muted-foreground">
                                            {heightWatcher ? `${heightWatcher} cm` : 'N/A'}
                                        </span>
                                    </div>
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
                <Button variant="ghost" onClick={onFormClose} type="button">
                    <X className="mr-2 h-4 w-4" />
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

    