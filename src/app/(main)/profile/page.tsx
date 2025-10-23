'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useAuth, EmailAuthProvider, linkWithCredential } from '@/firebase';
import { doc, getDoc, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from 'firebase/auth';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Save, AlertTriangle, KeyRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CountrySelector } from '@/components/figure/country-selector';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import UserActivity from '@/components/profile/user-activity';
import { normalizeText } from '@/lib/keywords';
import { Textarea } from '../ui/textarea';

const profileSchema = z.object({
  username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.').max(30, 'El nombre de usuario no puede superar los 30 caracteres.').regex(/^[a-zA-Z0-9_]+$/, 'Solo se permiten letras, números y guiones bajos.'),
  country: z.string().optional(),
  gender: z.enum(['Masculino', 'Femenino', 'Otro', 'Prefiero no decirlo']).optional(),
  description: z.string().max(160, 'La descripción no puede superar los 160 caracteres.').optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const linkSchema = z.object({
  email: z.string().email({ message: "Introduce un correo válido." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
});
type LinkAccountFormValues = z.infer<typeof linkSchema>;

export default function ProfilePage() {
    const { user, isUserLoading, reloadUser } = useUser();
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [linkError, setLinkError] = useState<string | null>(null);

    const [userData, setUserData] = useState<any>(null);
    const [isUserDataLoading, setIsUserDataLoading] = useState(true);

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            username: '',
            country: '',
            gender: undefined,
            description: '',
        }
    });

     const linkForm = useForm<LinkAccountFormValues>({
        resolver: zodResolver(linkSchema),
        defaultValues: {
            email: '',
            password: '',
        }
    });

    useEffect(() => {
        const fetchUserData = async () => {
            if (firestore && user) {
                setIsUserDataLoading(true);
                const userRef = doc(firestore, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    setUserData(data);
                    profileForm.reset({
                        username: data.username || user.displayName || '',
                        country: data.country || '',
                        gender: data.gender || undefined,
                        description: data.description || '',
                    });
                } else {
                     // Pre-fill from auth if no DB profile exists
                    profileForm.reset({ username: user.displayName || '' });
                }
                setIsUserDataLoading(false);
            }
        };

        if (!isUserLoading) {
            fetchUserData();
        }
    }, [user, firestore, isUserLoading, profileForm]);


    const onProfileSubmit = async (data: ProfileFormValues) => {
        if (!firestore || !user) return;

        setIsSaving(true);
        profileForm.clearErrors('username');
        
        const userRef = doc(firestore, 'users', user.uid);
        const newUsername = data.username;
        const oldUsername = userData?.username;
        const newUsernameLower = normalizeText(newUsername);
        const oldUsernameLower = oldUsername ? normalizeText(oldUsername) : null;
        
        const usernameHasChanged = newUsernameLower !== oldUsernameLower;

        try {
            await runTransaction(firestore, async (transaction) => {
                const newUsernameRef = usernameHasChanged ? doc(firestore, 'usernames', newUsernameLower) : null;
                const oldUsernameRef = (usernameHasChanged && oldUsernameLower) ? doc(firestore, 'usernames', oldUsernameLower) : null;

                // --- 1. All READS must happen first ---
                let usernameDoc;
                if (newUsernameRef) {
                    usernameDoc = await transaction.get(newUsernameRef);
                }

                // --- 2. Validation after reads ---
                if (usernameDoc && usernameDoc.exists() && usernameDoc.data()?.userId !== user.uid) {
                    throw new Error('El nombre de usuario ya está en uso.');
                }
                
                // --- 3. All WRITES happen last ---
                // Delete the old username document if it exists
                if (oldUsernameRef) {
                    transaction.delete(oldUsernameRef);
                }
                
                // Create the new username document
                if (newUsernameRef) {
                    transaction.set(newUsernameRef, { userId: user.uid });
                }
                
                // Finally, update the user's profile
                const dataToUpdate: any = {
                    username: newUsername,
                    usernameLower: newUsernameLower,
                    country: data.country || null,
                    gender: data.gender || null,
                    description: data.description || null,
                };
                
                if (!user.isAnonymous) {
                    dataToUpdate.email = user.email;
                }

                transaction.set(userRef, dataToUpdate, { merge: true });
            });

            // Update auth profile outside the transaction
            if (user.displayName !== newUsername) {
                await updateProfile(user, { displayName: newUsername });
                await reloadUser(); // Reload user state to reflect display name change everywhere
            }

            // Manually update local state after successful transaction
            setUserData((prev: any) => ({...prev, ...data}));

            toast({
                title: "¡Perfil Actualizado!",
                description: "Tu información ha sido guardada correctamente.",
            });

        } catch (error: any) {
            console.error("Error updating profile:", error);
            if (error.message === 'El nombre de usuario ya está en uso.') {
                profileForm.setError('username', { type: 'manual', message: error.message });
            } else {
                 toast({
                    title: "Error al Guardar",
                    description: "No se pudo actualizar tu perfil. Inténtalo de nuevo.",
                    variant: "destructive",
                });
            }
        } finally {
            setIsSaving(false);
        }
    };


    const handleLinkEmailPassword = async (data: LinkAccountFormValues) => {
        if (!auth || !user || !user.isAnonymous) return;
    
        setIsLinking(true);
        setLinkError(null);
    
        try {
            const credential = EmailAuthProvider.credential(data.email, data.password);
            const result = await linkWithCredential(user, credential);
            const permanentUser = result.user;
          
            const userRef = doc(firestore, 'users', permanentUser.uid);
            // Ensure createdAt is set when converting the account
            await setDoc(userRef, { 
                email: permanentUser.email,
                username: permanentUser.displayName || userData?.username, // Keep existing username if any
                createdAt: serverTimestamp(),
            }, { merge: true });
    
            toast({
                title: "¡Cuenta Vinculada!",
                description: "Has convertido tu cuenta de invitado en una cuenta permanente.",
            });
    
            await reloadUser();
    
        } catch (error: any) {
          console.error("Error linking with email/password:", error);
          if (error.code === 'auth/email-already-in-use') {
            setLinkError('Este correo electrónico ya está registrado con otra cuenta.');
          } else if (error.code === 'auth/credential-already-in-use') {
            setLinkError('Esta credencial ya está asociada con otro usuario.');
          } else {
            setLinkError('No se pudo vincular la cuenta. Inténtalo de nuevo.');
          }
        } finally {
          setIsLinking(false);
        }
    };
    
    if (isUserLoading || isUserDataLoading) {
      return (
         <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
             <header className="mb-8">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-5 w-1/2 mt-2" />
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-4">
                    <Skeleton className="h-64 w-full" />
                </div>
                <div className="space-y-8">
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
         </div>
      )
    }

    if (!user) {
        return (
             <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12 text-center">
                <h1 className="text-2xl font-bold">Por favor, inicia sesión</h1>
                <p className="text-muted-foreground">Necesitas haber iniciado sesión para ver tu perfil.</p>
            </div>
        )
    }

    const getAvatarFallback = () => {
        if (user?.isAnonymous) return 'G';
        return profileForm.getValues('username')?.charAt(0) || user?.email?.charAt(0) || 'U';
    }

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
             <header className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight font-headline">Mi Perfil</h1>
                <p className="text-muted-foreground mt-2">Gestiona tu información personal y visualiza tu actividad.</p>
            </header>

            <div className="space-y-6">
                <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                         <Card>
                            <CardHeader>
                                <CardTitle>Información del Perfil</CardTitle>
                                <CardDescription>Aquí puedes editar tus datos personales.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-20 w-20">
                                        <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User Avatar'} />
                                        <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                                    </Avatar>
                                    <Button variant="outline" type="button">Cambiar Avatar</Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                   <FormField
                                        control={profileForm.control}
                                        name="username"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nombre de Usuario</FormLabel>
                                                <FormControl><Input {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="space-y-2">
                                        <FormLabel>Correo Electrónico</FormLabel>
                                        <Input type="email" value={user?.email || (user.isAnonymous ? 'Cuenta de invitado' : '')} disabled />
                                    </div>
                                </div>
                                <div>
                                    <FormField
                                        control={profileForm.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Descripción</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Una breve descripción sobre ti."
                                                        className="resize-none"
                                                        maxLength={160}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField
                                        control={profileForm.control}
                                        name="country"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>País</FormLabel>
                                                <CountrySelector value={field.value} onChange={field.onChange} />
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={profileForm.control}
                                        name="gender"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Sexo</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger><SelectValue placeholder="Selecciona tu sexo" /></SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Masculino">Masculino</SelectItem>
                                                        <SelectItem value="Femenino">Femenino</SelectItem>
                                                        <SelectItem value="Otro">Otro</SelectItem>
                                                        <SelectItem value="Prefiero no decirlo">Prefiero no decirlo</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                 </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Guardar Cambios
                                </Button>
                            </CardFooter>
                        </Card>
                    </form>
                </Form>
                
                <UserActivity />

                {user.isAnonymous && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Vincular Cuenta</CardTitle>
                            <CardDescription>Convierte tu cuenta de invitado en una cuenta permanente para no perder tu progreso. Elige un correo y contraseña.</CardDescription>
                        </CardHeader>
                         <Form {...linkForm}>
                            <form onSubmit={linkForm.handleSubmit(handleLinkEmailPassword)}>
                                <CardContent className="space-y-4">
                                     {linkError && (
                                        <Alert variant="destructive">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertTitle>Error al Vincular</AlertTitle>
                                            <AlertDescription>{linkError}</AlertDescription>
                                        </Alert>
                                    )}
                                    <FormField
                                        control={linkForm.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Correo Electrónico</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="tu@correo.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={linkForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Contraseña</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="••••••••" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                                <CardFooter>
                                     <Button type="submit" disabled={isLinking} className="w-full">
                                        {isLinking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound />}
                                        Crear Cuenta Permanente
                                    </Button>
                                </CardFooter>
                            </form>
                        </Form>
                    </Card>
                )}
            </div>
        </div>
    )
}

    