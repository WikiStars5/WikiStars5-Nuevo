'use client';

import * as React from 'react';
import { useForm, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { generateKeywords, normalizeText } from '@/lib/keywords';
import { BLOCKED_NAMES } from '@/lib/blocked-names';

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, ArrowRight, Check, CheckCircle2, Loader2, Search } from 'lucide-react';
import {
  verifyWikipediaCharacter,
  type WikipediaVerificationOutput,
} from '@/ai/flows/verify-wikipedia-character';
import {
  verifyFamousBirthdaysCharacter,
  type VerifyFamousBirthdaysOutput,
} from '@/ai/flows/verify-famous-birthdays-character';
import Image from 'next/image';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Label } from '../ui/label';
import { useLanguage } from '@/context/LanguageContext';

const wikipediaSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
});
type WikipediaFormValues = z.infer<typeof wikipediaSchema>;

const famousBirthdaysSchema = z.object({
  url: z.string().url({ message: 'Por favor, introduce una URL válida de Famous Birthdays.' }),
});
type FamousBirthdaysFormValues = z.infer<typeof famousBirthdaysSchema>;

interface CreateProfileFromWikipediaProps {
  onProfileCreated: () => void;
}

export default function CreateProfileFromWikipedia({ onProfileCreated }: CreateProfileFromWikipediaProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useLanguage();

  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [showPlanB, setShowPlanB] = React.useState(false);

  const [verificationResult, setVerificationResult] = React.useState<
    WikipediaVerificationOutput | VerifyFamousBirthdaysOutput | null
  >(null);
  const [verificationError, setVerificationError] = React.useState<string | null>(null);

  const wikipediaForm = useForm<WikipediaFormValues>({
    resolver: zodResolver(wikipediaSchema),
    defaultValues: { name: '' },
  });

  const famousBirthdaysForm = useForm<FamousBirthdaysFormValues>({
    resolver: zodResolver(famousBirthdaysSchema),
    defaultValues: { url: '' },
  });

  const handleVerifyWikipedia = async (data: WikipediaFormValues) => {
    setIsVerifying(true);
    setVerificationError(null);
    setVerificationResult(null);
    setShowPlanB(false);

    try {
      const result = await verifyWikipediaCharacter({ name: data.name });
      if (result.found && result.title) {
        setVerificationResult({ ...result, source: 'Wikipedia' });
      } else {
        setShowPlanB(true);
        setVerificationError(result.verificationError);
        toast({
            title: t('CreateProfile.Wikipedia.toast.notFoundTitle'),
            description: t('CreateProfile.Wikipedia.toast.planBDescription'),
            variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error verifying Wikipedia:', error);
      setShowPlanB(true);
      setVerificationError(t('CreateProfile.Wikipedia.toast.verifyError'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyFamousBirthdays = async (data: FamousBirthdaysFormValues) => {
    setIsVerifying(true);
    setVerificationError(null);
    setVerificationResult(null);

    const wikipediaName = wikipediaForm.getValues('name');
    if (!wikipediaName) {
        setVerificationError(t('CreateProfile.FamousBirthdays.toast.noNameError'));
        setIsVerifying(false);
        return;
    }


    try {
      const result = await verifyFamousBirthdaysCharacter({ url: data.url, name: wikipediaName });
      if (result.found) {
        setVerificationResult(result);
        setShowPlanB(false);
      } else {
        setVerificationError(result.verificationError || t('CreateProfile.FamousBirthdays.toast.invalidUrlError'));
      }
    } catch (error) {
      console.error('Error verifying Famous Birthdays:', error);
      setVerificationError(t('CreateProfile.FamousBirthdays.toast.verifyError'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCreate = async () => {
    if (!firestore || !verificationResult?.title) return;

    const normalizedTitle = normalizeText(verificationResult.title);
    if (BLOCKED_NAMES.includes(normalizedTitle)) {
        toast({
            title: t('CreateProfile.toast.blockedTitle'),
            description: t('CreateProfile.toast.blockedDescription'),
            variant: 'destructive',
        });
        return;
    }
    
    setIsCreating(true);

    const slug = verificationResult.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const figureRef = doc(firestore, 'figures', slug);

    try {
        const docSnap = await getDoc(figureRef);
        if (docSnap.exists()) {
            toast({
                variant: 'destructive',
                title: t('CreateProfile.toast.duplicateTitle'),
                description: t('CreateProfile.toast.duplicateDescription').replace('{name}', verificationResult.title),
            });
            router.push(`/figures/${slug}`);
            onProfileCreated();
            setIsCreating(false);
            return;
        }
        
        await runTransaction(firestore, async (transaction) => {
            const keywords = generateKeywords(verificationResult.title!);

            const figureData = {
                id: slug,
                name: verificationResult.title,
                imageUrl: verificationResult.imageUrl,
                imageHint: `portrait of ${verificationResult.title}`,
                nationality: '',
                tags: [],
                isFeatured: false,
                nameKeywords: keywords,
                createdAt: serverTimestamp(),
                approved: true, // Auto-approved
                attitude: { neutral: 0, fan: 0, simp: 0, hater: 0 },
                emotion: { alegria: 0, envidia: 0, tristeza: 0, miedo: 0, desagrado: 0, furia: 0 },
                ratingCount: 0,
                totalRating: 0,
                ratingsBreakdown: { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
            };
            
            transaction.set(figureRef, figureData);
        });
        
        toast({
            title: t('CreateProfile.toast.createSuccessTitle'),
            description: t('CreateProfile.toast.createSuccessDescription').replace('{name}', verificationResult.title),
        });
        router.push(`/figures/${slug}`);
        onProfileCreated();

    } catch (error: any) {
        console.error('Error creating profile:', error);
        toast({
            variant: 'destructive',
            title: t('CreateProfile.toast.createErrorTitle'),
            description: error.message || t('CreateProfile.toast.createErrorDescription'),
        });
    } finally {
        setIsCreating(false);
    }
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setVerificationError(null);
    setShowPlanB(false);
    wikipediaForm.reset();
    famousBirthdaysForm.reset();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t('CreateProfile.title')}</DialogTitle>
        <DialogDescription>
          {t('CreateProfile.description')}
        </DialogDescription>
      </DialogHeader>

      {!verificationResult && (
        <div className="space-y-4 py-4">
          <Form {...wikipediaForm}>
            <form onSubmit={wikipediaForm.handleSubmit(handleVerifyWikipedia)} className="flex items-start gap-2">
              <FormField
                control={wikipediaForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder={t('CreateProfile.Wikipedia.placeholder')} {...field} disabled={isVerifying} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isVerifying} className="w-[150px]">
                {isVerifying && wikipediaForm.formState.isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Search className="mr-2" /> {t('CreateProfile.Wikipedia.verifyButton')}
                  </>
                )}
              </Button>
            </form>
          </Form>

          {showPlanB && (
             <div className="space-y-4 pt-4">
              <Alert variant="destructive" className="bg-yellow-900/20 border-yellow-700/50 text-yellow-200 [&>svg]:text-yellow-400">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-bold text-yellow-300">{t('CreateProfile.FamousBirthdays.planBTitle')}</AlertTitle>
                <AlertDescription className="text-yellow-300/90">
                  {verificationError || t('CreateProfile.FamousBirthdays.planBDescription')}
                </AlertDescription>
              </Alert>
              
              <Form {...famousBirthdaysForm}>
                <form
                  onSubmit={famousBirthdaysForm.handleSubmit(handleVerifyFamousBirthdays)}
                  className="space-y-3"
                >
                 <div className="space-y-2">
                    <Label htmlFor="url" className="text-sm font-medium">{t('CreateProfile.FamousBirthdays.urlLabel')}</Label>
                    <FormField
                        control={famousBirthdaysForm.control}
                        name="url"
                        render={({ field }) => (
                        <FormItem>
                            <FormControl>
                            <Input
                                id="url"
                                placeholder={t('CreateProfile.FamousBirthdays.placeholder')}
                                {...field}
                                disabled={isVerifying}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                 </div>
                  <Button type="submit" disabled={isVerifying} className="w-full">
                    {isVerifying && famousBirthdaysForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 
                    (
                        <>
                        <Check className="mr-2 h-4 w-4" /> {t('CreateProfile.FamousBirthdays.verifyButton')}
                        </>
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </div>
      )}

      {verificationResult && (
        <div className="py-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="text-green-500" /> {t('CreateProfile.Result.foundTitle')}
              </CardTitle>
              <CardDescription>
                {t('CreateProfile.Result.foundDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              {verificationResult.imageUrl && (
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md">
                  <Image
                    src={verificationResult.imageUrl}
                    alt={verificationResult.title || 'Foto de perfil'}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold">{verificationResult.title}</h3>
                <Badge variant="outline">{verificationResult.source}</Badge>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="ghost" onClick={resetVerification} disabled={isCreating}>
                {t('CreateProfile.Result.cancelButton')}
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    {t('CreateProfile.Result.createButton')} <ArrowRight className="ml-2" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </DialogContent>
  );
}
