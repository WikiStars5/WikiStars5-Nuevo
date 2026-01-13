
'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { doc, runTransaction, serverTimestamp, collection, writeBatch, getDocs, query, where, getDoc } from 'firebase/firestore';
import { normalizeText } from '@/lib/keywords';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';


const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.565-3.113-11.284-7.481l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.126,44,30.028,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
  </svg>
);


export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading, reloadUser } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    // Redirect to profile if user is already logged in and not anonymous
    if (!isUserLoading && user && !user.isAnonymous) {
      router.push('/profile');
    }
  }, [user, isUserLoading, router]);

 const afterSignIn = async (signedInUser: User) => {
    if (!firestore) return;

    const newUserRef = doc(firestore, 'users', signedInUser.uid);
    const userDoc = await getDoc(newUserRef);

    // If the user document already exists, it means this user has either
    // registered before or has linked their anonymous account. We do nothing.
    if (userDoc.exists()) {
        toast({ title: t('LoginPage.toast.welcomeBackTitle'), description: t('LoginPage.toast.welcomeBackDescription') });
        router.push('/profile');
        return;
    }
    
    // --- This part only runs for a brand new user who has never registered before ---
    try {
        let finalUsername = signedInUser.displayName || `user${signedInUser.uid.substring(0, 5)}`;
        let finalUsernameLower = normalizeText(finalUsername);
        
        await runTransaction(firestore, async (transaction) => {
            // Ensure username is unique before creating the profile
            const usernameRef = doc(firestore, 'usernames', finalUsernameLower);
            const usernameDoc = await transaction.get(usernameRef);
            
            if (usernameDoc.exists()) {
                finalUsername = `user${signedInUser.uid.substring(0, 8)}`;
                finalUsernameLower = normalizeText(finalUsername);
                toast({
                    title: t('LoginPage.toast.usernameInUseTitle'),
                    description: t('LoginPage.toast.usernameInUseDescription').replace('{displayName}', signedInUser.displayName || 'name'),
                    variant: 'destructive',
                    duration: 7000,
                });
            }
            transaction.set(doc(firestore, 'usernames', finalUsernameLower), { userId: signedInUser.uid });

            // Set new user data
            transaction.set(newUserRef, {
                username: finalUsername,
                usernameLower: finalUsernameLower,
                email: signedInUser.email,
                createdAt: serverTimestamp(),
                referralCount: 0
            }, { merge: true });
        });

        await reloadUser();
        toast({ title: t('LoginPage.toast.welcomeTitle'), description: t('LoginPage.toast.welcomeDescription') });
        router.push('/profile');

    } catch (error) {
        console.error("Error during new user profile creation:", error);
        toast({ title: t('LoginPage.toast.profileErrorTitle'), description: t('LoginPage.toast.profileErrorDescription'), variant: 'destructive' });
    }
};



  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) return;
    
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      await afterSignIn(result.user);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Error with Google Sign-In:", error);
        toast({
          title: t('LoginPage.toast.authErrorTitle'),
          description: t('LoginPage.toast.authErrorDescription'),
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isUserLoading || (user && !user.isAnonymous)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>{t('LoginPage.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
         <div className="flex justify-center mb-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-2xl">
                <Image src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia%20(2).png?alt=media&token=7cdac6ec-4db8-4bda-a104-fa636e201528" alt="WikiStars5 Logo" width={32} height={32} className="h-8 w-8" />
                <span className="font-headline">WikiStars5</span>
            </Link>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t('LoginPage.title')}</CardTitle>
            <CardDescription>{t('LoginPage.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                <GoogleIcon />
                )}
                {t('LoginPage.continueButton')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
