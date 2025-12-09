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
import { Eye, Target, Image as ImageIcon, HandCoins, Sparkles, XCircle, ArrowLeft, Save, Send, Trash2, X, Plus, Users, MapPin, PersonStanding, Flame, SquareArrowOutUpRight } from 'lucide-react';
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
import MultiCountrySelector from '@/components/shared/country-combobox';
import { Checkbox } from '@/components/ui/checkbox';
import AdPreview from '@/components/ads/ad-preview';


const targetingCriterionSchema = z.object({
    figureId: z.string().min(1, 'Debes seleccionar una figura.'),
    figureName: z.string(),
    figureImageUrl: z.string().url().optional().nullable(),
    type: z.enum(['attitude', 'emotion', 'rating', 'streak']),
    value: z.string().optional(),
    minValue: z.coerce.number().optional(),
    maxValue: z.coerce.number().optional(),
}).refine(data => {
    if (data.type === 'streak') {
        return data.minValue !== undefined && data.minValue > 0;
    }
    return !!data.value;
}, {
    message: 'Debes seleccionar un valor.',
    path: ['value'], // Keep error on a consistent path
});

const adCampaignSchema = z.object({
  campaignName: z.string().min(5, 'El nombre debe tener al menos 5 caracteres.'),
  locations: z.array(z.string()).optional(),
  genders: z.array(z.string()).optional(),
  targetingCriteria: z.array(targetingCriterionSchema).min(1, 'Debes añadir al menos un criterio de segmentación.'),
  adTitle: z.string().min(5, 'El título es obligatorio.'),
  adDescription: z.string().max(100, 'Máximo 100 caracteres.'),
  callToAction: z.string().min(3, 'Mínimo 3 caracteres.').max(20, 'Máximo 20 caracteres.'),
  adImageUrl: z.string().url('Debe ser una URL de imagen válida.').optional().or(z.literal('')),
  adLinkUrl: z.string().url('Debe ser una URL de destino válida.'),
  impressionBudget: z.coerce.number().min(1000, 'El mínimo de impresiones es 1000.'),
});

type AdCampaignFormValues = z.infer<typeof adCampaignSchema>;

const CPM = 5.00; // Costo Por Mil Impresiones en S/

const GENDER_OPTIONS = [
  { id: 'Masculino', label: 'Masculino' },
  { id: 'Femenino', label: 'Femenino' },
]

export default function CreateImpressionAdPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();

    const [newCriterion, setNewCriterion] = useState<{figure: Figure | null, type: 'attitude' | 'emotion' | 'rating' | 'streak', value: string, minValue?: number, maxValue?: number}>({
        figure: null,
        type: 'attitude',
        value: '',
        minValue: 1
    });
    const [searchInputQuery, setSearchInputQuery] = useState('');

    const form = useForm<AdCampaignFormValues>({
        resolver: zodResolver(adCampaignSchema),
        defaultValues: {
            campaignName: '',
            locations: [],
            genders: [],
            targetingCriteria: [],
            adTitle: '',
            adDescription: '',
            callToAction: 'Saber más',
            adImageUrl: '',
            adLinkUrl: '',
            impressionBudget: 10000,
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "targetingCriteria",
    });
    
    const handleAddCriterion = () => {
        if (!newCriterion.figure) {
            toast({ title: "Criterio incompleto", description: "Por favor, selecciona una figura.", variant: "destructive" });
            return;
        }

        const dataToAdd: any = {
            figureId: newCriterion.figure.id,
            figureName: newCriterion.figure.name,
            figureImageUrl: newCriterion.figure.imageUrl,
            type: newCriterion.type,
        };

        if (newCriterion.type === 'streak') {
            if (!newCriterion.minValue || newCriterion.minValue < 1) {
                toast({ title: "Criterio de racha incompleto", description: "El valor mínimo de racha debe ser al menos 1.", variant: "destructive" });
                return;
            }
            dataToAdd.minValue = newCriterion.minValue;
            dataToAdd.maxValue = newCriterion.maxValue;
        } else {
            if (!newCriterion.value) {
                toast({ title: "Criterio incompleto", description: "Por favor, selecciona un valor.", variant: "destructive" });
                return;
            }
            dataToAdd.value = newCriterion.value;
        }
        
        append(dataToAdd);

        // Reset the form for the new criterion
        setNewCriterion({ figure: null, type: 'attitude', value: '', minValue: 1, maxValue: undefined });
        setSearchInputQuery('');
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
            type: 'cpm',
            ...data,
            budget: (data.impressionBudget / 1000) * CPM,
            spent: 0,
            results: data.impressionBudget,
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
    const watchedForm = form.watch();

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
                        <h3 className="font-semibold text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Segmentación Demográfica</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="locations"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2"><MapPin className="h-4 w-4"/> Ubicaciones</FormLabel>
                                        <MultiCountrySelector
                                            selected={field.value || []}
                                            onChange={field.onChange}
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="genders"
                                render={() => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2"><PersonStanding className="h-4 w-4"/> Sexo</FormLabel>
                                        <div className="flex items-center space-x-4 pt-2">
                                            {GENDER_OPTIONS.map((item) => (
                                                <FormField
                                                    key={item.id}
                                                    control={form.control}
                                                    name="genders"
                                                    render={({ field }) => {
                                                        return (
                                                        <FormItem
                                                            key={item.id}
                                                            className="flex flex-row items-start space-x-3 space-y-0"
                                                        >
                                                            <FormControl>
                                                            <Checkbox
                                                                checked={field.value?.includes(item.id)}
                                                                onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? field.onChange([...(field.value || []), item.id])
                                                                    : field.onChange(
                                                                        field.value?.filter(
                                                                        (value) => value !== item.id
                                                                        )
                                                                    )
                                                                }}
                                                            />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">
                                                            {item.label}
                                                            </FormLabel>
                                                        </FormItem>
                                                        )
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>


                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Segmentación por Intereses</h3>
                         <div className="p-4 border rounded-lg space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Figura Pública</Label>
                                    <FigureSearchInput 
                                        onFigureSelect={(figure) => {
                                            setNewCriterion(prev => ({ ...prev, figure }));
                                            setSearchInputQuery(figure.name);
                                        }}
                                        initialQuery={searchInputQuery}
                                    />
                                    {newCriterion.figure && (
                                        <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={newCriterion.figure.imageUrl || undefined} />
                                                <AvatarFallback>{newCriterion.figure.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium">{newCriterion.figure.name}</span>
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="ml-auto h-6 w-6"
                                                onClick={() => {
                                                    setNewCriterion(prev => ({ ...prev, figure: null }));
                                                    setSearchInputQuery('');
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                 <div className="space-y-2">
                                    <Label>Tipo</Label>
                                    <Select value={newCriterion.type} onValueChange={(v: 'attitude' | 'emotion' | 'rating' | 'streak') => setNewCriterion(prev => ({...prev, type: v, value: ''}))}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="attitude">Por Actitud</SelectItem>
                                            <SelectItem value="emotion">Por Emoción</SelectItem>
                                            <SelectItem value="rating">Por Calificación</SelectItem>
                                            <SelectItem value="streak">Por Racha</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                             <div>
                                <Label>Valor</Label>
                                {newCriterion.type === 'streak' ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            type="number"
                                            min="1"
                                            placeholder="Desde"
                                            value={newCriterion.minValue}
                                            onChange={(e) => setNewCriterion(prev => ({...prev, minValue: Number(e.target.value)}))}
                                        />
                                        <Input
                                            type="number"
                                            min={newCriterion.minValue || 1}
                                            placeholder="Hasta"
                                            value={newCriterion.maxValue}
                                            onChange={(e) => setNewCriterion(prev => ({...prev, maxValue: Number(e.target.value) || undefined}))}
                                        />
                                    </div>
                                ) : (
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
                                            {newCriterion.type === 'rating' && (<>
                                                <SelectItem value="5">5 Estrellas</SelectItem>
                                                <SelectItem value="4">4 Estrellas</SelectItem>
                                                <SelectItem value="3">3 Estrellas</SelectItem>
                                                <SelectItem value="2">2 Estrellas</SelectItem>
                                                <SelectItem value="1">1 Estrella</SelectItem>
                                                <SelectItem value="0">0 Estrellas</SelectItem>
                                            </>)}
                                        </SelectContent>
                                    </Select>
                                )}
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
                                                <TableCell className="capitalize">
                                                  {field.type === 'streak' 
                                                    ? `${field.minValue}${field.maxValue ? ` - ${field.maxValue}` : '+'} días` 
                                                    : field.value}
                                                </TableCell>
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

                    <AudienceEstimator criteria={watchedForm.targetingCriteria} locations={watchedForm.locations} genders={watchedForm.genders}/>
                    
                    <Separator />

                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2"><ImageIcon className="h-5 w-5 text-primary" /> Contenido del Anuncio</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField name="adTitle" control={form.control} render={({field}) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} placeholder="¡Nueva Colección!" /></FormControl><FormMessage/></FormItem>)} />
                                <FormField name="adDescription" control={form.control} render={({field}) => (<FormItem><FormLabel>Descripción Corta</FormLabel><FormControl><Input {...field} placeholder="Descubre lo nuevo" /></FormControl><FormMessage/></FormItem>)} />
                                <FormField name="callToAction" control={form.control} render={({field}) => (<FormItem><FormLabel>Llamado a la Acción</FormLabel><FormControl><Input {...field} placeholder="Comprar ahora" /></FormControl><FormMessage/></FormItem>)} />
                                <FormField name="adLinkUrl" control={form.control} render={({field}) => (<FormItem><FormLabel>URL de Destino</FormLabel><FormControl><Input {...field} placeholder="https://mi-tienda.com" /></FormControl><FormMessage/></FormItem>)} />
                                <FormField name="adImageUrl" control={form.control} render={({field}) => (<FormItem className="sm:col-span-2"><FormLabel>URL de la Imagen</FormLabel><FormControl><Input {...field} placeholder="https://..." value={field.value || ''}/></FormControl><FormMessage/></FormItem>)} />
                            </div>
                             <div className="md:col-span-2">
                                <AdPreview {...watchedForm} />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                         <h3 className="font-semibold text-lg flex items-center gap-2"><HandCoins className="h-5 w-5 text-primary" /> Presupuesto</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <FormField
                                name="impressionBudget"
                                control={form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cantidad de Impresiones</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="text"
                                                value={field.value ? Number(field.value).toLocaleString('en-US') : ''}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/,/g, '');
                                                    if (!isNaN(Number(value))) {
                                                        field.onChange(Number(value));
                                                    }
                                                }}
                                                min="1000"
                                                step="1000"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
