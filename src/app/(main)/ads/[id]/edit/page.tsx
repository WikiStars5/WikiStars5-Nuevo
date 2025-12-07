'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, XCircle, Megaphone, Eye, Target, Image as ImageIcon, Sparkles, Trash2, X, Plus, Send } from 'lucide-react';
import type { Figure } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import FigureSearchInput from '@/components/figure/figure-search-input';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
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
  clickBudget: z.coerce.number().min(10).optional(),
  impressionBudget: z.coerce.number().min(1000).optional(),
});

type AdCampaignFormValues = z.infer<typeof adCampaignSchema>;

interface AdCampaignData extends AdCampaignFormValues {
    id: string;
    type: 'cpc' | 'cpm';
    status: 'draft' | 'pending_review' | 'active' | 'paused' | 'rejected' | 'completed';
    budget: number;
    spent: number;
    results: number;
}


const CPC = 0.15;
const CPM = 5.00;

function EditAdCampaignPageContent({ campaignId }: { campaignId: string }) {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();
    
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // State for the new criterion form
    const [newCriterion, setNewCriterion] = React.useState<{figure: Figure | null, type: 'attitude' | 'emotion', value: string}>({
        figure: null,
        type: 'attitude',
        value: ''
    });
    const [searchInputQuery, setSearchInputQuery] = React.useState('');


    const campaignDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid, 'adCampaigns', campaignId);
    }, [user, firestore, campaignId]);

    const { data: campaign, isLoading } = useDoc<AdCampaignData>(campaignDocRef);

    const form = useForm<AdCampaignFormValues>({
        resolver: zodResolver(adCampaignSchema),
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "targetingCriteria",
    });

    React.useEffect(() => {
        if (campaign) {
            form.reset({
                ...campaign,
                clickBudget: campaign.type === 'cpc' ? campaign.results : undefined,
                impressionBudget: campaign.type === 'cpm' ? campaign.results : undefined,
            });
        }
    }, [campaign, form]);
    
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
        setSearchInputQuery('');
    };

    const processAndSave = (data: AdCampaignFormValues, status: AdCampaignData['status']) => {
        if (!campaignDocRef || !campaign) return;
        setIsSubmitting(true);
        
        const isCpc = campaign.type === 'cpc';
        const newBudget = isCpc 
            ? (data.clickBudget || 0) * CPC 
            : ((data.impressionBudget || 0) / 1000) * CPM;

        const updatedData: Partial<AdCampaignData> = {
            ...data,
            status,
            budget: newBudget,
            updatedAt: serverTimestamp() as any,
        };
        
        if (isCpc) {
            updatedData.results = data.clickBudget || 0;
            delete (updatedData as any).impressionBudget;
        } else {
            updatedData.results = data.impressionBudget || 0;
            delete (updatedData as any).clickBudget;
        }

        setDocumentNonBlocking(campaignDocRef, updatedData, { merge: true });
        
        toast({
            title: status === 'pending_review' ? 'Campaña Enviada a Revisión' : 'Borrador de Campaña Actualizado',
            description: 'Los cambios en tu campaña han sido guardados.',
        });
        
        router.push('/ads');
    }

    const handleSaveDraft = () => {
        const data = form.getValues();
        processAndSave(data, 'draft');
    }
    
    const handleSendForReview = (data: AdCampaignFormValues) => {
        processAndSave(data, 'pending_review');
    };
    
    if (isLoading) {
        return (
            <div className="container mx-auto max-w-4xl px-4 py-12">
                 <Skeleton className="h-[600px] w-full" />
            </div>
        )
    }

    if (!campaign) {
         return (
            <div className="container mx-auto max-w-4xl px-4 py-12 text-center">
                <h1 className="text-2xl font-bold">Campaña no encontrada</h1>
                <p className="text-muted-foreground">No se pudo encontrar la campaña que intentas editar.</p>
                <Button asChild className="mt-4"><Link href="/ads">Volver al panel</Link></Button>
            </div>
        )
    }
    
    const isCpc = campaign.type === 'cpc';
    const budgetValue = isCpc ? form.watch('clickBudget') : form.watch('impressionBudget');
    const totalCost = isCpc ? (budgetValue || 0) * CPC : ((budgetValue || 0) / 1000) * CPM;
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
                            {isCpc ? <Megaphone className="h-8 w-8 text-primary" /> : <Eye className="h-8 w-8 text-primary" />}
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-headline">Editar Campaña: {campaign.campaignName}</CardTitle>
                            <CardDescription className="text-muted-foreground">
                                Realiza ajustes a tu campaña y guarda los cambios.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSendForReview)} className="space-y-8">

                             <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Información de la Campaña</h3>
                                <FormField name="campaignName" control={form.control} render={({ field }) => (
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
                                        <div className="md:col-span-2 space-y-2">
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
                                 <h3 className="font-semibold text-lg">Presupuesto</h3>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                     {isCpc ? (
                                        <FormField name="clickBudget" control={form.control} render={({field}) => (<FormItem><FormLabel>Cantidad de Clics</FormLabel><FormControl><Input type="number" min="10" {...field} /></FormControl><FormMessage/></FormItem>)} />
                                     ) : (
                                        <FormField name="impressionBudget" control={form.control} render={({field}) => (<FormItem><FormLabel>Cantidad de Impresiones</FormLabel><FormControl><Input type="number" min="1000" step="1000" {...field} /></FormControl><FormMessage/></FormItem>)} />
                                     )}
                                     <Card className="bg-muted">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                                                <span>{isCpc ? 'Costo por Clic (CPC):' : 'Costo por Mil (CPM):'}</span>
                                                <span className="font-bold text-foreground">S/ {isCpc ? CPC.toFixed(2) : CPM.toFixed(2)}</span>
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
                                <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Guardar Borrador
                                </Button>
                                {campaign.status === 'draft' && (
                                    <Button type="submit" disabled={isSubmitting}>
                                        <Send className="mr-2 h-4 w-4" />
                                        Enviar para Revisión
                                    </Button>
                                )}
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function EditCampaignPage() {
    const params = useParams();
    const campaignId = Array.isArray(params.id) ? params.id[0] : params.id;
  
    if (!campaignId) {
      return (
        <div className="container mx-auto max-w-4xl px-4 py-12 text-center">
          <h1 className="text-2xl font-bold">ID de Campaña no válido</h1>
          <p className="text-muted-foreground">No se proporcionó un ID de campaña para editar.</p>
        </div>
      );
    }
  
    return <EditAdCampaignPageContent campaignId={campaignId} />;
  }
  