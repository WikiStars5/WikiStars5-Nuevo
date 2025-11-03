'use client';

import * as React from 'react';
import { useAuth, useUser } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { doc, getDoc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { normalizeText } from '@/lib/keywords';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';


const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.565-3.113-11.284-7.481l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.126,44,30.028,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
  </svg>
);

interface LoginPromptDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginPromptDialog({ children, open, onOpenChange }: LoginPromptDialogProps) {
  const { reloadUser } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const afterSignIn = async (signedInUser: User) => {
    if (!firestore) return;
    const userRef = doc(firestore, 'users', signedInUser.uid);

    try {
        await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const dataToSave: any = { email: signedInUser.email };

            if (!userDoc.exists()) {
                // This is a new user
                dataToSave.createdAt = serverTimestamp();
                
                let finalUsername = signedInUser.displayName || `user${signedInUser.uid.substring(0, 5)}`;
                const usernameLower = normalizeText(finalUsername);
                const usernameRef = doc(firestore, 'usernames', usernameLower);
                
                const usernameDoc = await transaction.get(usernameRef);
                
                if (usernameDoc.exists()) {
                    // Username from Google is already taken, generate a unique one.
                    finalUsername = `user${signedInUser.uid.substring(0, 8)}`;
                    const uniqueUsernameLower = normalizeText(finalUsername);
                    const uniqueUsernameRef = doc(firestore, 'usernames', uniqueUsernameLower);
                    transaction.set(uniqueUsernameRef, { userId: signedInUser.uid });
                     toast({
                        title: 'Nombre de usuario en uso',
                        description: `El nombre "${signedInUser.displayName}" ya está en uso. Se te ha asignado uno temporal. Puedes cambiarlo en tu perfil.`,
                        variant: 'destructive',
                    });
                } else {
                    // Username from Google is available.
                    transaction.set(usernameRef, { userId: signedInUser.uid });
                }

                dataToSave.username = finalUsername;
                dataToSave.usernameLower = normalizeText(finalUsername);
            }
            
            // Set user data (create or merge)
            transaction.set(userRef, dataToSave, { merge: true });
        });

      await reloadUser();
      toast({
        title: "¡Sesión Iniciada!",
        description: "Ahora puedes votar y comentar.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error during user profile creation/update:", error);
      toast({
        title: 'Error de Perfil',
        description: 'No se pudo guardar tu información de perfil.',
        variant: 'destructive',
      });
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
          title: "Error de Autenticación",
          description: "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inicia Sesión para Continuar</DialogTitle>
          <DialogDescription>
            Para votar o comentar, necesitas una cuenta. Es rápido y fácil con Google.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
