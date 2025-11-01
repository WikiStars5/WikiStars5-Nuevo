
'use client';

import { useState, useContext } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, doc, runTransaction, increment, query, where, orderBy, limit, getDocs, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore, useUser, EmailAuthProvider, linkWithCredential } from '@/firebase';
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

export default function CommentForm({ figureId, figureName }: CommentFormProps) {
  const { user } = useUser();
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
  
  const handleRegistration = async (data: RegisterFormValues) => {
    if (!auth || !firestore) return;
    setIsSubmitting(true);

    try {
        // This is the key change: if the user is anonymous, link the account.
        if (user && user.isAnonymous) {
            const credential = EmailAuthProvider.credential(data.email, data.password);
            await linkWithCredential(user, credential);
            // Now the anonymous user is a permanent user with the same UID.
        } else {
            // This case should ideally not be hit if the UI only shows this form to guests,
            // but it's a safe fallback.
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        }

        // The onAuthStateChanged listener in useUser will give us the updated user object.
        // We just need to wait a moment for the state to propagate.
        await new Promise(resolve => setTimeout(resolve, 500)); 
        const permanentUser = auth.currentUser;

        if (!permanentUser) {
            throw new Error("No se pudo obtener el usuario actualizado después del registro.");
        }

        await updateProfile(permanentUser, { displayName: data.username });

        const userRef = doc(firestore, 'users', permanentUser.uid);
        const usernameRef = doc(firestore, 'usernames', data.username.toLowerCase());

        await runTransaction(firestore, async (transaction) => {
            const usernameDoc = await transaction.get(usernameRef);
            if (usernameDoc.exists()) {
                throw new Error("El nombre de usuario ya está en uso.");
            }
            transaction.set(usernameRef, { userId: permanentUser.uid });
            // Use set with merge to update the existing user doc (from anonymous) or create a new one
            transaction.set(userRef, {
                username: data.username,
                usernameLower: data.username.toLowerCase(),
                email: data.email,
                createdAt: serverTimestamp() // Will only be set on creation
            }, { merge: true });
        });

        toast({
            title: "¡Cuenta Creada!",
            description: "Ahora puedes calificar y comentar.",
        });
        // The useUser hook will automatically re-render the component with the registered user UI.

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

  const onSubmit = async (data: CommentFormValues) => {
    if (!firestore || !user) return; // This check is for safety, user should exist at this point.
    setIsSubmitting(true);
    
    try {
      const figureRef = doc(firestore, 'figures', figureId);
      const commentsColRef = collection(firestore, 'figures', figureId, 'comments');
      
      let displayName = user.displayName;

      await runTransaction(firestore, async (transaction) => {
        const userProfileRef = doc(firestore, 'users', user!.uid);

        // --- 1. READS ---
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
        
        // --- 2. Validation ---
        if (!figureDoc.exists()) {
            throw new Error("Figure not found.");
        }
        
        // --- 3. WRITES ---
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

      // --- Streak Update ---
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
        {isRegisteredUser ? (
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
            </div>
        )}
      </CardContent>
    </Card>
  );
}

    