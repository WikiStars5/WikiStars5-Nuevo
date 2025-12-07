'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, XCircle, Megaphone, Eye } from 'lucide-react';
import type { Figure } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import FigureSearchInput from '@/components/figure/figure-search-input';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';


const adCampaignSchema = z.object({
  campaignName: z.string().min(5, 'El nombre debe tener al menos 5 caracteres.'),
  targetFigureId: z.string().min(1, 'Debes seleccionar una figura pública.'),
  targetFigureName: z.string(),
  targetType: z.enum(['attitude', 'emotion']),
  targetValue: z.string().min(1, 'Debes seleccionar un valor de segmentación.'),
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
}


const CPC = 0.15;
const CPM = 5.00;

function EditAdCampaignPageContent({ campaignId }: { campaignId: string }) {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();
    
    const [selectedFigure, setSelectedFigure] = React.useState<Figure | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const campaignDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid, 'adCampaigns', campaignId);
    }, [user, firestore, campaignId]);

    const { data: campaign, isLoading } = useDoc<AdCampaignData>(campaignDocRef);

    const form = useForm<AdCampaignFormValues>({
        resolver: zodResolver(adCampaignSchema),
    });

    React.useEffect(() => {
        if (campaign) {
            form.reset(campaign);
            if (campaign.targetFigureId && campaign.targetFigureName) {
                setSelectedFigure({
                    id: campaign.targetFigureId,
                    name: campaign.targetFigureName,
                    imageUrl: campaign.adImageUrl, // We don't have the real figure image here, but this is ok for display
                } as Figure);
            }
        }
    }, [campaign, form]);
    
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
        if (!campaignDocRef) return;
        setIsSubmitting(true);
        
        const updatedData = {
            ...campaign,
            ...data,
            updatedAt: serverTimestamp(),
        };

        setDocumentNonBlocking(campaignDocRef, updatedData, { merge: true });
        
        toast({
            title: 'Campaña Actualizada',
            description: 'Los cambios en tu campaña han sido guardados.',
        });
        
        router.push('/ads');
    }
    
    if (isLoading) {
        return (
            <div className="container mx-auto max-w-4xl px-4 py-12">
                 <Skeleton className="h-96 w-full" />
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
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                             {/* Other sections like campaign info, targeting, ad content would go here */}
                             {/* For brevity, showing only the budget section which differs */}

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
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Guardar Cambios
                                </Button>
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
  