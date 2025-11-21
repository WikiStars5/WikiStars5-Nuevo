
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

  useEffect(() => {
    // Redirect to profile if user is already logged in and not anonymous
    if (!isUserLoading && user && !user.isAnonymous) {
      router.push('/profile');
    }
  }, [user, isUserLoading, router]);

 const afterSignIn = async (signedInUser: User, anonymousUid: string | null) => {
    if (!firestore) return;

    try {
        const batch = writeBatch(firestore);
        const newUserRef = doc(firestore, 'users', signedInUser.uid);
        let finalUsername = signedInUser.displayName || `user${signedInUser.uid.substring(0, 5)}`;
        let finalUsernameLower = normalizeText(finalUsername);
        
        // Ensure username is unique
        const usernameRef = doc(firestore, 'usernames', finalUsernameLower);
        const usernameDoc = await getDoc(usernameRef);
        if (usernameDoc.exists() && usernameDoc.data()?.userId !== signedInUser.uid) {
            finalUsername = `user${signedInUser.uid.substring(0, 8)}`;
            finalUsernameLower = normalizeText(finalUsername);
            toast({
                title: 'Nombre de usuario en uso',
                description: `El nombre "${signedInUser.displayName}" ya está en uso. Se te ha asignado uno temporal. Puedes cambiarlo en tu perfil.`,
                variant: 'destructive',
            });
        }
        batch.set(doc(firestore, 'usernames', finalUsernameLower), { userId: signedInUser.uid });

        // Set new user data
        batch.set(newUserRef, {
            username: finalUsername,
            usernameLower: finalUsernameLower,
            email: signedInUser.email,
            createdAt: serverTimestamp(),
            referralCount: 0
        }, { merge: true });

        // --- Handle Anonymous Data Migration ---
        if (anonymousUid) {
            // Here you would migrate data like comments, votes, etc. from anonymousUid to signedInUser.uid
            // This is a complex operation and depends heavily on your data structure.
            // For example, to migrate comment votes:
            // const votesQuery = query(collectionGroup(firestore, 'votes'), where('userId', '==', anonymousUid));
            // const votesSnapshot = await getDocs(votesQuery);
            // votesSnapshot.forEach(voteDoc => {
            //     batch.update(voteDoc.ref, { userId: signedInUser.uid });
            // });
            // After migration, delete the anonymous user's data record
            batch.delete(doc(firestore, 'users', anonymousUid));
        }

        await batch.commit();
        await reloadUser();

        toast({ title: "¡Sesión Iniciada!", description: "Bienvenido a WikiStars5." });
        router.push('/profile');

    } catch (error) {
        console.error("Error during user profile creation/update:", error);
        toast({ title: 'Error de Perfil', description: 'No se pudo guardar tu información de perfil.', variant: 'destructive' });
    }
};



  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) return;
    
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    const anonymousUid = user?.isAnonymous ? user.uid : null;

    try {
      const result = await signInWithPopup(auth, provider);
      await afterSignIn(result.user, anonymousUid);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Error with Google Sign-In:", error);
        toast({
          title: "Error de Autenticación",
          description: "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",
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
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
         <div className="flex justify-center mb-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-2xl">
                <Image src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia.png?alt=media&token=fb7367da-8db6-4f1d-a1f0-d03f57e6b9f6" alt="WikiStars5 Logo" width={32} height={32} className="h-8 w-8" />
                <span className="font-headline">WikiStars5</span>
            </Link>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
            <CardDescription>Si ya tienes una cuenta, inicia sesión para acceder a tu perfil.</CardDescription>
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
                Continuar con Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
