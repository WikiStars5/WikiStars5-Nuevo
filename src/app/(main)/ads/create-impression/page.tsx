'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Target, Image as ImageIcon, HandCoins, Sparkles, XCircle, ArrowLeft, Eye, Save, Send } from 'lucide-react';
import FigureSearchInput from '@/components/figure/figure-search-input';
import type { Figure } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';

const adCampaignSchema = z.object({
  campaignName: z.string().min(5, 'El nombre debe tener al menos 5 caracteres.'),
  targetFigureId: z.string(),
  targetFigureName: z.string(),
  targetType: z.enum(['attitude', 'emotion']),
  targetValue: z.string().min(1, 'Debes seleccionar un valor de segmentación.'),
  adTitle: z.string().min(5, 'El título es obligatorio.'),
  adDescription: z.string().max(100, 'Máximo 100 caracteres.'),
  adImageUrl: z.string().url('Debe ser una URL de imagen válida.'),
  adLinkUrl: z.string().url('Debe ser una URL de destino válida.'),
  impressionBudget: z.coerce.number().min(1000, 'El mínimo de impresiones es 1000.'),
});

type AdCampaignFormValues = z.infer<typeof adCampaignSchema>;

const CPM = 5.00; // Costo Por Mil Impresiones en S/
const CAMPAIGNS_STORAGE_KEY = 'wikistars5-ad-campaigns';

export default function CreateImpressionAdPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [selectedFigure, setSelectedFigure] = useState<Figure | null>(null);

    const form = useForm<AdCampaignFormValues>({
        resolver: zodResolver(adCampaignSchema),
        defaultValues: {
            campaignName: '',
            targetFigureId: '',
            targetFigureName: '',
            adTitle: '',
            adDescription: '',
            adImageUrl: '',
            adLinkUrl: '',
            impressionBudget: 10000,
        },
    });

    const handleFigureSelect = (figure: Figure) => {
        setSelectedFigure(figure);
        form.setValue('targetFigureId', figure.id);
        form.setValue('targetFigureName', figure.name);
    };
    
    const handleClearFigure = () => {
        setSelectedFigure(null);
        form.resetField('targetFigureId');
        form.resetField('targetFigureName');
        form.resetField('targetValue');
    };

    const onSubmit = (data: AdCampaignFormValues) => {
        console.log('Datos de la campaña de impresiones:', data);
        toast({
            title: 'Formulario Enviado (Simulación)',
            description: 'Los datos de la campaña se han registrado en la consola.',
        });
    };

    const handleSaveDraft = () => {
        const data = form.getValues();
        try {
            const savedCampaigns = JSON.parse(localStorage.getItem(CAMPAIGNS_STORAGE_KEY) || '[]');
            const newCampaign = {
                id: uuidv4(),
                name: data.campaignName || 'Campaña sin nombre',
                status: 'draft',
                delivery: 'Borrador',
                results: 'N/A',
                costPerResult: `S/ ${CPM.toFixed(2)} (CPM)`,
                budget: `S/ ${((data.impressionBudget / 1000) * CPM).toFixed(2)}`,
                spent: 'S/0.00',
                ...data
            };
            const updatedCampaigns = [...savedCampaigns, newCampaign];
            localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(updatedCampaigns));

            toast({
                title: 'Borrador Guardado',
                description: `La campaña "${data.campaignName || 'sin nombre'}" ha sido guardada.`,
            });
            router.push('/ads');
        } catch (error) {
            console.error("Failed to save draft to localStorage", error);
            toast({
                title: 'Error al Guardar',
                description: 'No se pudo guardar el borrador en el almacenamiento local.',
                variant: 'destructive'
            });
        }
    };
    
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
                    
                    {/* SECCIÓN 1: INFORMACIÓN DE LA CAMPAÑA */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Información de la Campaña</h3>
                        <FormField
                            control={form.control}
                            name="campaignName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre de la Campaña</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Reconocimiento de Marca - Verano" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Separator />

                    {/* SECCIÓN 2: SEGMENTACIÓN */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Segmentación del Público</h3>
                        <FormItem>
                            <FormLabel>Figura Pública Objetivo</FormLabel>
                            {selectedFigure ? (
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="flex items-center gap-3">
                                        <Image src={selectedFigure.imageUrl} alt={selectedFigure.name} width={40} height={50} className="rounded-md object-cover aspect-[4/5]" />
                                        <p className="font-semibold">{selectedFigure.name}</p>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={handleClearFigure}>
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <FigureSearchInput onFigureSelect={handleFigureSelect} />
                            )}
                        </FormItem>

                        {selectedFigure && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="targetType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo de Segmentación</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Elige un tipo" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="attitude">Por Actitud</SelectItem>
                                                    <SelectItem value="emotion">Por Emoción</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="targetValue"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valor a Segmentar</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!form.watch('targetType')}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Elige un valor" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {form.watch('targetType') === 'attitude' && (
                                                        <>
                                                            <SelectItem value="fan">Fan</SelectItem>
                                                            <SelectItem value="hater">Hater</SelectItem>
                                                            <SelectItem value="simp">Simp</SelectItem>
                                                            <SelectItem value="neutral">Neutral</SelectItem>
                                                        </>
                                                    )}
                                                     {form.watch('targetType') === 'emotion' && (
                                                        <>
                                                            <SelectItem value="alegria">Alegría</SelectItem>
                                                            <SelectItem value="furia">Furia</SelectItem>
                                                            <SelectItem value="envidia">Envidia</SelectItem>
                                                            <SelectItem value="tristeza">Tristeza</SelectItem>
                                                            <SelectItem value="miedo">Miedo</SelectItem>
                                                            <SelectItem value="desagrado">Desagrado</SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}
                    </div>
                    
                    <Separator />

                    {/* SECCIÓN 3: CONTENIDO DEL ANUNCIO */}
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

                    {/* SECCIÓN 4: PRESUPUESTO */}
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
