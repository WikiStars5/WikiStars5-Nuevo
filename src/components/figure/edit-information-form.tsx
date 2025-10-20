'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, X } from 'lucide-react';
import type { Figure } from '@/lib/types';
import DateInput from './date-input';

interface EditInformationFormProps {
  figure: Figure;
  onFormClose: () => void;
}

const editFormSchema = z.object({
  imageUrl: z.string().url('Por favor, introduce una URL válida para la imagen.'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  gender: z.enum(['Femenino', 'Masculino']).optional(),
  birthDate: z.string().optional(),
  deathDate: z.string().optional(),
  nationality: z.string().optional(),
  occupation: z.string().optional(),
  maritalStatus: z.enum(['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a']).optional(),
});

type EditFormValues = z.infer<typeof editFormSchema>;

export default function EditInformationForm({ figure, onFormClose }: EditInformationFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      imageUrl: figure.imageUrl || '',
      name: figure.name || '',
      gender: figure.gender,
      birthDate: figure.birthDate || '',
      deathDate: figure.deathDate || '',
      nationality: figure.nationality || '',
      occupation: figure.occupation || '',
      maritalStatus: figure.maritalStatus,
    },
  });
  
  const imageUrlWatcher = form.watch('imageUrl');

  const onSubmit = async (data: EditFormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    
    const figureRef = doc(firestore, 'figures', figure.id);

    try {
      const dataToSave: { [key: string]: any } = {};
      
      (Object.keys(data) as Array<keyof EditFormValues>).forEach((key) => {
        const value = data[key];
        // Only include fields that have a non-empty value.
        // For optional fields, an empty string means we want to clear it.
        if (value !== undefined && value !== '') {
          dataToSave[key] = value;
        } else if (figure[key] !== undefined) {
           // If the form value is empty/undefined, but it exists on the original figure,
           // set it to null to delete it from Firestore.
          dataToSave[key] = null;
        }
      });
      
      await updateDoc(figureRef, dataToSave);

      toast({
        title: '¡Perfil Actualizado!',
        description: `La información de ${data.name} ha sido guardada.`,
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
                <CardDescription>Modifica los datos biográficos de {figure.name}.</CardDescription>
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
                                            <Input placeholder="https://ejemplo.com/imagen.jpg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                                />
                        </div>
                        <div className="space-y-2">
                             <Label>Vista Previa</Label>
                             <div className="aspect-square relative w-full max-w-[150px] rounded-md overflow-hidden border-2 border-dashed flex items-center justify-center bg-muted">
                                {imageUrlWatcher && form.formState.errors.imageUrl === undefined ? (
                                    <Image src={imageUrlWatcher} alt="Vista previa" layout="fill" objectFit="cover" />
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
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nombre Completo</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="gender"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Sexo</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                    <DateInput
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
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
                                    <DateInput
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="nationality"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>País de origen</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Ej: Argentina" />
                                </FormControl>
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
                                    <Input {...field} placeholder="Ej: Futbolista, Cantante" />
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
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
