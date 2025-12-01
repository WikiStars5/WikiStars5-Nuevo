'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { generateKeywords } from '@/lib/keywords';

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, Globe, Loader2, ArrowRight } from 'lucide-react';
import { verifyDomain } from '@/ai/flows/verify-domain';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { useLanguage } from '@/context/LanguageContext';

const domainSchema = z.object({
  domain: z
    .string()
    .min(3, { message: 'El dominio debe tener al menos 3 caracteres.' }),
});
type DomainFormValues = z.infer<typeof domainSchema>;

interface CreateProfileFromWebDialogProps {
  onProfileCreated: () => void;
}

function cleanDomain(input: string): string {
    let domain = input;
    domain = domain.replace(/^(https?:\/\/)?/, '');
    domain = domain.split('/')[0];
    
    const parts = domain.split('.');
    
    if (parts.length > 2 && (parts[parts.length-2] === 'co' || parts[parts.length-2] === 'com')) {
        return parts.slice(-3).join('.');
    }
    
    if (parts.length > 2) {
        return parts.slice(-2).join('.');
    }
    
    return domain;
}


export default function CreateProfileFromWebDialog({ onProfileCreated }: CreateProfileFromWebDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useLanguage();

  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState<'verify' | 'confirm'>('verify');
  const [verifiedDomain, setVerifiedDomain] = React.useState<string | null>(null);
  const [verificationError, setVerificationError] = React.useState<string | null>(null);

  const form = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema),
    defaultValues: { domain: '' },
  });

  const handleVerifyDomain = async (data: DomainFormValues) => {
    setIsVerifying(true);
    setVerificationError(null);
    
    const domainToVerify = cleanDomain(data.domain);

    if (!domainToVerify) {
        setVerificationError(t('CreateProfile.Web.validation.invalidDomain'));
        setIsVerifying(false);
        return;
    }

    try {
      const result = await verifyDomain({ domain: domainToVerify });
      if (result.isValid) {
        toast({
          title: t('CreateProfile.Web.toast.validDomainTitle'),
          description: t('CreateProfile.Web.toast.validDomainDescription').replace('{domain}', domainToVerify),
        });
        setVerifiedDomain(domainToVerify);
        setCurrentStep('confirm');
      } else {
        setVerificationError(result.error || t('CreateProfile.Web.toast.verificationFailed'));
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      setVerificationError(t('CreateProfile.Web.toast.unexpectedError'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!firestore || !verifiedDomain) return;
    setIsCreating(true);

    const slug = verifiedDomain.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const figureRef = doc(firestore, 'figures', slug);

    try {
      const docSnap = await getDoc(figureRef);
      if (docSnap.exists()) {
        toast({
          variant: 'destructive',
          title: t('CreateProfile.toast.duplicateTitle'),
          description: t('CreateProfile.toast.duplicateDescriptionRedirect').replace('{name}', verifiedDomain),
        });
        router.push(`/figures/${slug}`);
        onProfileCreated();
        return;
      }

      const keywords = generateKeywords(verifiedDomain);
      
      const figureData = {
        id: slug,
        name: verifiedDomain,
        imageUrl: `https://www.google.com/s2/favicons?sz=128&domain_url=${verifiedDomain}`,
        imageHint: `favicon for ${verifiedDomain}`,
        nationality: 'Web',
        tags: [verifiedDomain],
        isFeatured: false,
        nameKeywords: keywords,
        createdAt: serverTimestamp(),
        approved: true,
      };

      setDocumentNonBlocking(figureRef, figureData, { merge: false });

      toast({
        title: t('CreateProfile.toast.createSuccessTitle'),
        description: t('CreateProfile.toast.createSuccessDescription').replace('{name}', verifiedDomain),
      });
      
      router.push(`/figures/${slug}`);
      onProfileCreated();

    } catch (error) {
      console.error('Error creating profile:', error);
      toast({
        variant: 'destructive',
        title: t('CreateProfile.toast.createErrorTitle'),
        description: t('CreateProfile.toast.createErrorDescription'),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetFlow = () => {
    setCurrentStep('verify');
    setVerifiedDomain(null);
    setVerificationError(null);
    form.reset();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t('CreateProfile.Web.title')}</DialogTitle>
        <DialogDescription>
          {currentStep === 'verify'
            ? t('CreateProfile.Web.verifyDescription')
            : t('CreateProfile.Web.confirmDescription')}
        </DialogDescription>
      </DialogHeader>

      {currentStep === 'verify' && (
        <div className="space-y-4 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleVerifyDomain)} className="flex items-start gap-2">
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder={t('CreateProfile.Web.placeholder')} {...field} disabled={isVerifying} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isVerifying} className="w-[180px]">
                {isVerifying ? <Loader2 className="animate-spin" /> : <><Globe className="mr-2" /> {t('CreateProfile.Web.verifyButton')}</>}
              </Button>
            </form>
          </Form>

          {verificationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('CreateProfile.Web.verificationFailedTitle')}</AlertTitle>
              <AlertDescription>{verificationError}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {currentStep === 'confirm' && verifiedDomain && (
         <div className="py-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="text-green-500" /> {t('CreateProfile.Web.verifiedTitle')}
              </CardTitle>
              <CardDescription>
                {t('CreateProfile.Web.confirmCreationDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-bold text-center p-4 bg-muted rounded-md">{verifiedDomain}</h3>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="ghost" onClick={resetFlow} disabled={isCreating}>
                {t('CreateProfile.Web.cancelButton')}
              </Button>
              <Button onClick={handleCreateProfile} disabled={isCreating}>
                {isCreating ? <Loader2 className="animate-spin" /> : <>{t('CreateProfile.Web.confirmAndCreateButton')} <ArrowRight className="ml-2" /></>}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </DialogContent>
  );
}
