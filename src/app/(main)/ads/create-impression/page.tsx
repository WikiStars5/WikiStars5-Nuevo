'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Eye, Target, Image as ImageIcon, HandCoins, Sparkles, XCircle, ArrowLeft, Save, Send, Trash2 } from 'lucide-react';
import FigureSearchInput from '@/components/figure/figure-search-input';
import type { Figure } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';

const targetingCriterionSchema = z.object({
    figureId: z.string().min(1, 'Debes seleccionar una figura.'),
    figureName: z.string(),
    figureImageUrl: z.string().url().optional().nullable(),
    type: z.enum(['attitude', 'emotion']),
    value: z.string().min(1, 'Debes seleccionar un valor.'),
});

const adCampaignSchema = z.object({
  campaignName: z.string().min(5, 'El nombre debe tener al menos 5 caracteres.'),
  targetingCriteria: z.array(targetingCriterionSchema).min(1, 'Debes añadir al menos un criterio de segmentación.'),
  adTitle: z.string().min(5, 'El título es obligatorio.'),
  adDescription: z.string().max(100, 'Máximo 100 caracteres.'),
  adImageUrl: z.string().url('Debe ser una URL de imagen válida.'),
  adLinkUrl: z.string().url('Debe ser una URL de destino válida.'),
  impressionBudget: z.coerce.number().min(1000, 'El mínimo de impresiones es 1000.'),
});

type AdCampaignFormValues = z.infer<typeof adCampaignSchema>;

const CPM = 5.00; // Costo Por Mil Impresiones en S/

export default function CreateImpressionAdPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();

    const form = useForm<AdCampaignFormValues>({
        resolver: zodResolver(adCampaignSchema),
        defaultValues: {
            campaignName: '',
            targetingCriteria: [],
            adTitle: '',
            adDescription: '',
            adImageUrl: '',
            adLinkUrl: '',
            impressionBudget: 10000,
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "targetingCriteria",
    });
    
    const watchTargetingType = (index: number) => form.watch(`targetingCriteria.${index}.type`);

    const saveCampaign = (status: 'draft' | 'pending_review') => {
        if (!user || !firestore) {
            toast({
                title: 'Error de autenticación',
                description: 'Debes iniciar sesión para crear una campaña.',
                variant: 'destructive',
            });
            return;
        }

        const data = form.getValues();
        const campaignId = uuidv4();
        const campaignRef = doc(firestore, 'users', user.uid, 'adCampaigns', campaignId);
        
        const campaignData = {
            id: campaignId,
            userId: user.uid,
            status,
            type: 'cpm',
            ...data,
            budget: (data.impressionBudget / 1000) * CPM,
            spent: 0,
            results: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        setDocumentNonBlocking(campaignRef, campaignData);

        toast({
            title: status === 'draft' ? 'Borrador Guardado' : 'Campaña Enviada a Revisión',
            description: `La campaña "${data.campaignName || 'sin nombre'}" ha sido guardada.`,
        });
        router.push('/ads');
    }

    const onSubmit = () => saveCampaign('pending_review');
    const handleSaveDraft = () => saveCampaign('draft');
    
    const impressionBudgetValue = form.watch('impressionBudget');
    const totalCost = (impressionBudgetValue / 1000) * CPM;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-4">
        <Button variant="outline" asChild>
            <Link href="/ads">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al panel de campañas
            </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                <Eye className="h-8 w-8 text-primary" />
            </div>
            <div>
                <CardTitle className="text-3xl font-headline">Crear Campaña de Impresiones</CardTitle>
                <CardDescription className="text-muted-foreground">
                    Define tu público, crea tu anuncio y establece un presupuesto por impresiones.
                </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Información de la Campaña</h3>
                        <FormField control={form.control} name="campaignName" render={({ field }) => (
                           <FormItem>
                               <FormLabel>Nombre de la Campaña</FormLabel>
                               <FormControl><Input placeholder="Ej: Reconocimiento de Marca - Verano" {...field} /></FormControl>
                               <FormMessage />
                           </FormItem>
                        )}/>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Segmentación del Público</h3>
                        {fields.map((field, index) => (
                            <Card key={field.id} className="p-4 relative bg-muted/50">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                                <div className="space-y-4">
                                     <FormField control={form.control} name={`targetingCriteria.${index}.figureId`} render={({ field: formField }) => (
                                         <FormItem>
                                            <FormLabel>Figura Pública</FormLabel>
                                             <FigureSearchInput onFigureSelect={(figure) => {
                                                form.setValue(`targetingCriteria.${index}.figureId`, figure.id);
                                                form.setValue(`targetingCriteria.${index}.figureName`, figure.name);
                                                form.setValue(`targetingCriteria.${index}.figureImageUrl`, figure.imageUrl);
                                            }} />
                                            <FormMessage />
                                         </FormItem>
                                     )} />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name={`targetingCriteria.${index}.type`} render={({ field: typeField }) => (
                                            <FormItem>
                                                <FormLabel>Tipo</FormLabel>
                                                <Select onValueChange={typeField.onChange} defaultValue={typeField.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Elige un tipo" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="attitude">Por Actitud</SelectItem>
                                                        <SelectItem value="emotion">Por Emoción</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name={`targetingCriteria.${index}.value`} render={({ field: valueField }) => (
                                            <FormItem>
                                                <FormLabel>Valor</FormLabel>
                                                <Select onValueChange={valueField.onChange} defaultValue={valueField.value} disabled={!watchTargetingType(index)}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Elige un valor" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {watchTargetingType(index) === 'attitude' && (<>
                                                            <SelectItem value="fan">Fan</SelectItem>
                                                            <SelectItem value="hater">Hater</SelectItem>
                                                            <SelectItem value="simp">Simp</SelectItem>
                                                            <SelectItem value="neutral">Neutral</SelectItem>
                                                        </>)}
                                                        {watchTargetingType(index) === 'emotion' && (<>
                                                            <SelectItem value="alegria">Alegría</SelectItem>
                                                            <SelectItem value="furia">Furia</SelectItem>
                                                            <SelectItem value="envidia">Envidia</SelectItem>
                                                            <SelectItem value="tristeza">Tristeza</SelectItem>
                                                            <SelectItem value="miedo">Miedo</SelectItem>
                                                            <SelectItem value="desagrado">Desagrado</SelectItem>
                                                        </>)}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                    </div>
                                </div>
                            </Card>
                        ))}
                        <Button type="button" variant="outline" onClick={() => append({ figureId: '', figureName: '', figureImageUrl: '', type: 'attitude', value: '' })}>
                            Añadir criterio de segmentación
                        </Button>
                        <FormMessage>{form.formState.errors.targetingCriteria?.message}</FormMessage>
                    </div>
                    
                    <Separator />

                    <div className="space-y-4">
                         <h3 className="font-semibold text-lg flex items-center gap-2"><ImageIcon className="h-5 w-5 text-primary" /> Contenido del Anuncio</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField name="adTitle" control={form.control} render={({field}) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} placeholder="¡Nueva Colección!" /></FormControl><FormMessage/></FormItem>)} />
                            <FormField name="adDescription" control={form.control} render={({field}) => (<FormItem><FormLabel>Descripción Corta</FormLabel><FormControl><Input {...field} placeholder="Descubre lo nuevo" /></FormControl><FormMessage/></FormItem>)} />
                            <FormField name="adImageUrl" control={form.control} render={({field}) => (<FormItem><FormLabel>URL de la Imagen</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage/></FormItem>)} />
                            <FormField name="adLinkUrl" control={form.control} render={({field}) => (<FormItem><FormLabel>URL de Destino</FormLabel><FormControl><Input {...field} placeholder="https://mi-tienda.com" /></FormControl><FormMessage/></FormItem>)} />
                         </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                         <h3 className="font-semibold text-lg flex items-center gap-2"><HandCoins className="h-5 w-5 text-primary" /> Presupuesto</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <FormField name="impressionBudget" control={form.control} render={({field}) => (<FormItem><FormLabel>Cantidad de Impresiones</FormLabel><FormControl><Input type="number" min="1000" step="1000" {...field} /></FormControl><FormMessage/></FormItem>)} />
                            <Card className="bg-muted">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                                        <span>Costo por Mil (CPM):</span>
                                        <span className="font-bold text-foreground">S/ {CPM.toFixed(2)}</span>
                                    </div>
                                    <Separator className="my-2" />
                                    <div className="flex justify-between items-center font-bold text-lg">
                                        <span>Costo Total:</span>
                                        <span className="text-primary">S/ {totalCost.toFixed(2)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                         </div>
                    </div>
                    
                    <div className="flex justify-end gap-4 pt-4">
                        <Button type="button" variant="outline" onClick={handleSaveDraft}>
                            <Save className="mr-2 h-4 w-4" />
                            Guardar Borrador
                        </Button>
                        <Button type="submit">
                            <Send className="mr-2 h-4 w-4" />
                            Mandar para Revisión
                        </Button>
                    </div>
                </form>
            </Form>
        </CardContent>
      </Card>
    </div>
  );
}
    