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
import { Megaphone, Users, Target, Image as ImageIcon, Link as LinkIcon, HandCoins, Sparkles, XCircle, ArrowLeft, Save, Send, Trash2, X, Plus } from 'lucide-react';
import FigureSearchInput from '@/components/figure/figure-search-input';
import type { Figure } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import AudienceEstimator from '@/components/ads/audience-estimator';


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
  clickBudget: z.coerce.number().min(10, 'El mínimo de clics es 10.'),
});

type AdCampaignFormValues = z.infer<typeof adCampaignSchema>;

const CPC = 0.15; // Costo Por Clic en S/

export default function CreateAdPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();

    const [newCriterion, setNewCriterion] = useState<{figure: Figure | null, type: 'attitude' | 'emotion', value: string}>({
        figure: null,
        type: 'attitude',
        value: ''
    });

    const form = useForm<AdCampaignFormValues>({
        resolver: zodResolver(adCampaignSchema),
        defaultValues: {
            campaignName: '',
            targetingCriteria: [],
            adTitle: '',
            adDescription: '',
            adImageUrl: '',
            adLinkUrl: '',
            clickBudget: 100,
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "targetingCriteria",
    });

     const handleAddCriterion = () => {
        if (!newCriterion.figure || !newCriterion.value) {
            toast({ title: "Criterio incompleto", description: "Por favor, selecciona una figura y un valor.", variant: "destructive" });
            return;
        }
        append({
            figureId: newCriterion.figure.id,
            figureName: newCriterion.figure.name,
            figureImageUrl: newCriterion.figure.imageUrl,
            type: newCriterion.type,
            value: newCriterion.value,
        });
        // Reset the form for the new criterion
        setNewCriterion({ figure: null, type: 'attitude', value: '' });
    };

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
            type: 'cpc',
            ...data,
            budget: data.clickBudget * CPC,
            spent: 0,
            results: data.clickBudget,
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
    
    const clickBudgetValue = form.watch('clickBudget');
    const totalCost = (clickBudgetValue || 0) * CPC;
    const watchedCriteria = form.watch('targetingCriteria');

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
                <Megaphone className="h-8 w-8 text-primary" />
            </div>
            <div>
                <CardTitle className="text-3xl font-headline">Crear Nueva Campaña de Clics</CardTitle>
                <CardDescription className="text-muted-foreground">
                    Define tu público, crea tu anuncio y establece un presupuesto para generar tráfico.
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
                                <FormControl><Input placeholder="Ej: Campaña de Verano para Fans" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>

                    <Separator />

                     <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Segmentación del Público</h3>
                        
                        <div className="p-4 border rounded-lg space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div className="md:col-span-2">
                                    <Label>Figura Pública</Label>
                                     <FigureSearchInput 
                                        onFigureSelect={(figure) => setNewCriterion(prev => ({ ...prev, figure }))} 
                                        initialQuery={newCriterion.figure?.name}
                                    />
                                </div>
                                <div>
                                    <Label>Tipo</Label>
                                    <Select value={newCriterion.type} onValueChange={(v: 'attitude' | 'emotion') => setNewCriterion(prev => ({...prev, type: v, value: ''}))}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="attitude">Por Actitud</SelectItem>
                                            <SelectItem value="emotion">Por Emoción</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                    <div>
                                    <Label>Valor</Label>
                                    <Select value={newCriterion.value} onValueChange={(v) => setNewCriterion(prev => ({...prev, value: v}))} >
                                            <SelectTrigger><SelectValue placeholder="Elige un valor" /></SelectTrigger>
                                        <SelectContent>
                                            {newCriterion.type === 'attitude' && (<>
                                                <SelectItem value="fan">Fan</SelectItem>
                                                <SelectItem value="hater">Hater</SelectItem>
                                                <SelectItem value="simp">Simp</SelectItem>
                                                <SelectItem value="neutral">Neutral</SelectItem>
                                            </>)}
                                            {newCriterion.type === 'emotion' && (<>
                                                <SelectItem value="alegria">Alegría</SelectItem>
                                                <SelectItem value="furia">Furia</SelectItem>
                                                <SelectItem value="envidia">Envidia</SelectItem>
                                                <SelectItem value="tristeza">Tristeza</SelectItem>
                                                <SelectItem value="miedo">Miedo</SelectItem>
                                                <SelectItem value="desagrado">Desagrado</SelectItem>
                                            </>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button type="button" variant="outline" onClick={handleAddCriterion}><Plus className="mr-2 h-4 w-4" /> Añadir Criterio</Button>
                        </div>
                        
                        {fields.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Figura</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Valor</TableHead>
                                            <TableHead className="text-right"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => (
                                            <TableRow key={field.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={field.figureImageUrl || undefined} />
                                                            <AvatarFallback>{field.figureName.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-medium text-sm">{field.figureName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="capitalize">{field.type}</TableCell>
                                                <TableCell className="capitalize">{field.value}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(index)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        <FormMessage>{form.formState.errors.targetingCriteria?.message || form.formState.errors.targetingCriteria?.root?.message}</FormMessage>
                    </div>

                    <AudienceEstimator criteria={watchedCriteria} />
                    
                    <Separator />

                    <div className="space-y-4">
                         <h3 className="font-semibold text-lg flex items-center gap-2"><ImageIcon className="h-5 w-5 text-primary" /> Contenido del Anuncio</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField name="adTitle" control={form.control} render={({field}) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} placeholder="¡Oferta Especial!" /></FormControl><FormMessage/></FormItem>)} />
                            <FormField name="adDescription" control={form.control} render={({field}) => (<FormItem><FormLabel>Descripción Corta</FormLabel><FormControl><Input {...field} placeholder="Solo por tiempo limitado" /></FormControl><FormMessage/></FormItem>)} />
                            <FormField name="adImageUrl" control={form.control} render={({field}) => (<FormItem><FormLabel>URL de la Imagen</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage/></FormItem>)} />
                            <FormField name="adLinkUrl" control={form.control} render={({field}) => (<FormItem><FormLabel>URL de Destino</FormLabel><FormControl><Input {...field} placeholder="https://mi-tienda.com" /></FormControl><FormMessage/></FormItem>)} />
                         </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                         <h3 className="font-semibold text-lg flex items-center gap-2"><HandCoins className="h-5 w-5 text-primary" /> Presupuesto</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <FormField name="clickBudget" control={form.control} render={({field}) => (<FormItem><FormLabel>Cantidad de Clics</FormLabel><FormControl><Input type="number" min="10" {...field} /></FormControl><FormMessage/></FormItem>)} />
                            <Card className="bg-muted">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                                        <span>Costo por Clic (CPC):</span>
                                        <span className="font-bold text-foreground">S/ {CPC.toFixed(2)}</span>
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
    