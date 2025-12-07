
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Megaphone, Users, Target, Image as ImageIcon, Link as LinkIcon, DollarSign, HandCoins, Pointer, Sparkles, XCircle } from 'lucide-react';
import FigureSearchInput from '@/components/figure/figure-search-input';
import type { Figure } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

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
  clickBudget: z.coerce.number().min(10, 'El mínimo de clics es 10.'),
});

type AdCampaignFormValues = z.infer<typeof adCampaignSchema>;

const CPC = 0.15; // Costo Por Clic en S/

export default function AdsPage() {
    const { toast } = useToast();
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
            clickBudget: 100,
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
        // Por ahora, solo mostraremos los datos en la consola.
        // El siguiente paso será guardar esto en Firestore.
        console.log('Datos de la campaña:', data);
        toast({
            title: 'Formulario Enviado (Simulación)',
            description: 'Los datos de la campaña se han registrado en la consola.',
        });
    };
    
    const clickBudgetValue = form.watch('clickBudget');
    const totalCost = (clickBudgetValue || 0) * CPC;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                <Megaphone className="h-8 w-8 text-primary" />
            </div>
            <div>
                <CardTitle className="text-3xl font-headline">Crear Nueva Campaña</CardTitle>
                <CardDescription className="text-muted-foreground">
                    Define tu público, crea tu anuncio y establece un presupuesto.
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
                                        <Input placeholder="Ej: Campaña de Verano para Fans" {...field} />
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
                            <FormField name="adTitle" control={form.control} render={({field}) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} placeholder="¡Oferta Especial!" /></FormControl><FormMessage/></FormItem>)} />
                            <FormField name="adDescription" control={form.control} render={({field}) => (<FormItem><FormLabel>Descripción Corta</FormLabel><FormControl><Input {...field} placeholder="Solo por tiempo limitado" /></FormControl><FormMessage/></FormItem>)} />
                            <FormField name="adImageUrl" control={form.control} render={({field}) => (<FormItem><FormLabel>URL de la Imagen</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage/></FormItem>)} />
                            <FormField name="adLinkUrl" control={form.control} render={({field}) => (<FormItem><FormLabel>URL de Destino</FormLabel><FormControl><Input {...field} placeholder="https://mi-tienda.com" /></FormControl><FormMessage/></FormItem>)} />
                         </div>
                    </div>

                    <Separator />

                    {/* SECCIÓN 4: PRESUPUESTO */}
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
                    
                    <div className="flex justify-end pt-4">
                        <Button type="submit">
                            <DollarSign className="mr-2 h-4 w-4" />
                            Proceder al Pago y Activar Campaña
                        </Button>
                    </div>
                </form>
            </Form>
        </CardContent>
      </Card>
    </div>
  );
}
