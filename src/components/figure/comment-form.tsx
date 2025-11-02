
'use client';

import { useState, useContext } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, doc, runTransaction, increment, query, where, orderBy, limit, getDocs, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore, useUser, EmailAuthProvider, linkWithCredential, GoogleAuthProvider, signInWithPopup } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Send, LogIn, UserPlus } from 'lucide-react';
import StarInput from './star-input';
import { Comment, Streak } from '@/lib/types';
import { updateStreak } from '@/firebase/streaks';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';

const commentSchema = z.object({
  text: z.string().min(1, 'El comentario no puede estar vacío.').max(500, 'El comentario no puede superar los 500 caracteres.'),
  rating: z.number({ required_error: 'Debes seleccionar una calificación.' }).min(0, 'La calificación es obligatoria.').max(5, 'La calificación debe estar entre 0 y 5.'),
});

type CommentFormValues = z.infer<typeof commentSchema>;

const registerSchema = z.object({
    username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.').max(30, 'El nombre de usuario no puede superar los 30 caracteres.').regex(/^[a-zA-Z0-9_]+$/, 'Solo se permiten letras, números y guiones bajos.'),
    email: z.string().email('Introduce un correo electrónico válido.'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;


interface CommentFormProps {
  figureId: string;
  figureName: string;
}

const ratingSounds: { [key: number]: string } = {
    1: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar1.mp3?alt=media&token=c867fe4c-a39f-49a1-ab99-b6fdac84b2e8',
    2: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar2.mp3?alt=media&token=f0a09d9e-8a99-498b-b9ea-0a61b07e4173',
    3: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar3.mp3?alt=media&token=40943193-e45d-443d-9cc2-40ff8fa98076',
    4: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar4.mp3?alt=media&token=75b19307-5b2c-4c89-a252-b584727469da',
    5: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar5.mp3?alt=media&token=11cd84e2-7377-4972-a9b0-e0e716e2df46',
};

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.565-3.113-11.284-7.481l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.126,44,30.028,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
  </svg>
);


export default function CommentForm({ figureId, figureName }: CommentFormProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showStreakAnimation } = useContext(StreakAnimationContext);

  const isRegisteredUser = user && !user.isAnonymous;

  const commentForm = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { text: '', rating: null as any },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '' },
  });

  const textValue = commentForm.watch('text', '');

  const afterSignIn = async (signedInUser: any) => {
    if (!firestore) return;
    const userRef = doc(firestore, 'users', signedInUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) return; // User already has a profile

    const dataToUpdate: any = {
      email: signedInUser.email,
      username: signedInUser.displayName,
      usernameLower: signedInUser.displayName ? signedInUser.displayName.toLowerCase() : null,
      createdAt: serverTimestamp()
    };
    
    // Create username doc if displayName exists
    if (signedInUser.displayName) {
        const usernameRef = doc(firestore, 'usernames', signedInUser.displayName.toLowerCase());
        const usernameDoc = await getDoc(usernameRef);
        if (!usernameDoc.exists()) {
             await runTransaction(firestore, async (transaction) => {
                transaction.set(usernameRef, { userId: signedInUser.uid });
                transaction.set(userRef, dataToUpdate, { merge: true });
            });
        } else {
             // Handle case where google display name is already taken
            await runTransaction(firestore, async (transaction) => {
                transaction.set(userRef, dataToUpdate, { merge: true });
            });
        }
    } else {
         await runTransaction(firestore, async (transaction) => {
            transaction.set(userRef, dataToUpdate, { merge: true });
        });
    }
  }
  
  const handleRegistration = async (data: RegisterFormValues) => {
    if (!auth || !firestore) return;
    setIsSubmitting(true);

    try {
        if (user && user.isAnonymous) {
            const credential = EmailAuthProvider.credential(data.email, data.password);
            await linkWithCredential(user, credential);
        } else {
            await createUserWithEmailAndPassword(auth, data.email, data.password);
        }

        const permanentUser = auth.currentUser;
        if (!permanentUser) throw new Error("No se pudo obtener el usuario actualizado.");

        await updateProfile(permanentUser, { displayName: data.username });

        const userRef = doc(firestore, 'users', permanentUser.uid);
        const usernameRef = doc(firestore, 'usernames', data.username.toLowerCase());

        await runTransaction(firestore, async (transaction) => {
            const usernameDoc = await transaction.get(usernameRef);
            if (usernameDoc.exists()) throw new Error("El nombre de usuario ya está en uso.");
            transaction.set(usernameRef, { userId: permanentUser.uid });
            transaction.set(userRef, {
                username: data.username,
                usernameLower: data.username.toLowerCase(),
                email: data.email,
                createdAt: serverTimestamp()
            }, { merge: true });
        });

        toast({
            title: "¡Cuenta Creada!",
            description: "Ahora puedes calificar y comentar.",
        });

    } catch (error: any) {
        console.error("Error creating/linking account:", error);
        if (error.code === 'auth/email-already-in-use') {
            registerForm.setError('email', { message: 'Este correo electrónico ya está registrado.' });
        } else if (error.code === 'auth/credential-already-in-use') {
            registerForm.setError('email', { message: 'Este correo ya está vinculado a otra cuenta.' });
        }
        else if (error.message === 'El nombre de usuario ya está en uso.') {
            registerForm.setError('username', { message: error.message });
        } else {
             toast({
                title: "Error al Registrar",
                description: "No se pudo crear la cuenta. Inténtalo de nuevo.",
                variant: "destructive",
            });
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();

    try {
        if (user && user.isAnonymous) {
            const credential = await signInWithPopup(auth, provider).then(result => GoogleAuthProvider.credentialFromResult(result));
            if (credential) {
                await linkWithCredential(user, credential);
                await afterSignIn(user);
            }
        } else {
            const result = await signInWithPopup(auth, provider);
            await afterSignIn(result.user);
        }
        toast({
            title: "¡Sesión Iniciada con Google!",
            description: "Ahora puedes calificar y comentar."
        });

    } catch (error: any) {
        // This is a common error when the user closes the popup.
        // We don't want to show a scary error message for this.
        if (error.code === 'auth/popup-closed-by-user') {
            console.log("Google Sign-In popup closed by user.");
            return; // Exit silently
        }
        
        console.error("Error with Google Sign-In:", error);
        toast({
            title: "Error de Autenticación",
            description: "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: CommentFormValues) => {
    if (!firestore || !user) return;
    setIsSubmitting(true);
    
    try {
      const figureRef = doc(firestore, 'figures', figureId);
      const commentsColRef = collection(firestore, 'figures', figureId, 'comments');
      
      let displayName = user.displayName;

      await runTransaction(firestore, async (transaction) => {
        const userProfileRef = doc(firestore, 'users', user!.uid);
        const [figureDoc, userProfileSnap, previousCommentSnapshot] = await Promise.all([
          transaction.get(figureRef),
          transaction.get(userProfileRef),
          getDocs(query(
            commentsColRef,
            where('userId', '==', user!.uid),
            where('rating', '>=', 0),
            orderBy('rating'),
            orderBy('createdAt', 'desc'),
            limit(1)
          ))
        ]);
        
        if (!figureDoc.exists()) throw new Error("Figure not found.");
        
        const userProfileData = userProfileSnap.exists() ? userProfileSnap.data() : {};
        displayName = displayName || userProfileData.username || 'Usuario';
        
        const previousCommentDoc = previousCommentSnapshot.docs[0];
        const previousComment = previousCommentDoc?.data() as Comment | undefined;

        const updates: { [key: string]: any } = {};
        const newRating = data.rating;

        if (previousComment && typeof previousComment.rating === 'number' && previousComment.rating >= 0) {
          const oldRating = previousComment.rating;
          if (oldRating !== newRating) {
            updates['totalRating'] = increment(newRating - oldRating);
            updates[`ratingsBreakdown.${oldRating}`] = increment(-1);
            updates[`ratingsBreakdown.${newRating}`] = increment(1);
            transaction.update(previousCommentDoc.ref, { rating: -1 });
          }
        } else {
          updates['ratingCount'] = increment(1);
          updates['totalRating'] = increment(newRating);
          updates[`ratingsBreakdown.${newRating}`] = increment(1);
        }

        transaction.update(figureRef, updates);
        
        const newCommentRef = doc(commentsColRef);
        const newCommentPayload: Omit<Comment, 'id' | 'children' | 'createdAt'> & { createdAt: any } = {
            threadId: newCommentRef.id,
            figureId: figureId,
            userId: user!.uid,
            text: data.text,
            rating: newRating,
            createdAt: serverTimestamp(),
            userDisplayName: displayName!,
            userPhotoURL: user!.photoURL,
            userCountry: userProfileData.country || null,
            userGender: userProfileData.gender || null,
            likes: 0,
            dislikes: 0,
            parentId: null,
            depth: 0,
        };
        transaction.set(newCommentRef, newCommentPayload);
      });

      const streakResult = await updateStreak({
        firestore,
        figureId,
        userId: user.uid,
        userDisplayName: displayName!,
        userPhotoURL: user.photoURL,
        userCountry: (await getDoc(doc(firestore, 'users', user.uid))).data()?.country || null,
        userGender: (await getDoc(doc(firestore, 'users', user.uid))).data()?.gender || null,
        isAnonymous: user.isAnonymous,
      });

      if (streakResult?.streakGained) {
        showStreakAnimation(streakResult.newStreakCount);
      }

      if (ratingSounds[data.rating]) {
        const audio = new Audio(ratingSounds[data.rating]);
        audio.play();
      }

      toast({
        title: '¡Opinión Publicada!',
        description: 'Gracias por compartir tu comentario y calificación.',
      });
      commentForm.reset({text: '', rating: null as any});
    } catch (error: any) {
      console.error('Error al publicar comentario:', error);
      toast({
            variant: 'destructive',
            title: 'Error al Publicar',
            description: 'No se pudo enviar tu comentario. Inténtalo de nuevo.',
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-black">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <MessageSquare /> Calificaciones y cometarios
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isUserLoading ? (
            <p>Cargando...</p>
        ) : isRegisteredUser ? (
            <Form {...commentForm}>
            <form onSubmit={commentForm.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                control={commentForm.control}
                name="rating"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Paso 1: Califica este perfil*</FormLabel>
                    <FormControl>
                        <StarInput 
                            value={field.value}
                            onChange={field.onChange}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={commentForm.control}
                name="text"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Paso 2: Escribe tu opinión*</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder={`¿Qué opinas de ${figureName}?`}
                        className="resize-none"
                        rows={4}
                        maxLength={500}
                        {...field}
                        />
                    </FormControl>
                    <div className="flex justify-between items-center pt-1">
                        <FormMessage />
                        <div className="text-xs text-muted-foreground ml-auto">
                        {textValue.length} / 500
                        </div>
                    </div>
                    </FormItem>
                )}
                />
                <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                    <Loader2 className="animate-spin" />
                    ) : (
                    <Send />
                    )}
                    Publicar Opinión
                </Button>
                </div>
            </form>
            </Form>
        ) : (
            <div className="text-center rounded-lg border-2 border-dashed p-8">
                 <h3 className="font-semibold text-lg">Crea una cuenta para comentar</h3>
                 <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                    El registro es rápido y te permite unirte a la conversación y empezar a ganar rachas.
                 </p>
                 <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(handleRegistration)} className="mt-6 space-y-4 max-w-sm mx-auto text-left">
                        <FormField
                            control={registerForm.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre de Usuario</FormLabel>
                                    <FormControl><Input placeholder="Elige un nombre de usuario" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={registerForm.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Correo Electrónico</FormLabel>
                                    <FormControl><Input type="email" placeholder="tu@correo.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={registerForm.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contraseña</FormLabel>
                                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                            Crear Cuenta y Comentar
                        </Button>
                    </form>
                 </Form>
                 <div className="relative my-6">
                    <Separator />
                    <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-card px-2 text-sm text-muted-foreground">O</span>
                 </div>
                 <Button
                    variant="outline"
                    className="w-full max-w-sm mx-auto"
                    onClick={handleGoogleSignIn}
                    disabled={isSubmitting}
                 >
                    <GoogleIcon />
                    Continuar con Google
                 </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
