'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
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
import { Loader2, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CountrySelector } from '@/components/figure/country-selector';
import UserActivity from '@/components/profile/user-activity';
import { normalizeText } from '@/lib/keywords';
import { Textarea } from '@/components/ui/textarea';

export const dynamic = 'force-dynamic';


const profileSchema = z.object({
  username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.').max(30, 'El nombre de usuario no puede superar los 30 caracteres.').regex(/^[a-zA-Z0-9_]+$/, 'Solo se permiten letras, números y guiones bajos.'),
  country: z.string().optional(),
  gender: z.enum(['Masculino', 'Femenino', 'Otro', 'Prefiero no decirlo']).optional(),
  description: z.string().max(160, 'La descripción no puede superar los 160 caracteres.').optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function ProfilePageContent() {
    const { user, isUserLoading, reloadUser } = useUser();
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

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

    const descriptionValue = profileForm.watch('description') || '';

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
                if (usernameHasChanged) {
                    const newUsernameRef = doc(firestore, 'usernames', newUsernameLower);
                    const usernameDoc = await transaction.get(newUsernameRef);
                    if (usernameDoc.exists() && usernameDoc.data()?.userId !== user.uid) {
                        throw new Error('El nombre de usuario ya está en uso.');
                    }

                    // Delete the old username document if it exists and is different
                    if (oldUsernameLower && oldUsernameLower !== newUsernameLower) {
                        const oldUsernameRef = doc(firestore, 'usernames', oldUsernameLower);
                        transaction.delete(oldUsernameRef);
                    }
                    // Set the new username document
                    transaction.set(newUsernameRef, { userId: user.uid });
                }
                
                const dataToUpdate: any = {
                    username: newUsername,
                    usernameLower: newUsernameLower,
                    country: data.country || null,
                    gender: data.gender || null,
                    description: data.description || null,
                    email: user.email,
                };

                transaction.set(userRef, dataToUpdate, { merge: true });
            });

            // Update auth profile outside the transaction
            if (auth.currentUser && auth.currentUser.displayName !== newUsername) {
                await updateProfile(auth.currentUser, { displayName: newUsername });
                await reloadUser();
            }

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
                                        <Input type="email" value={user?.email || ''} disabled />
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
                                                <div className="flex justify-between items-center pt-1">
                                                    <FormMessage />
                                                    <div className="text-xs text-muted-foreground ml-auto">
                                                        {descriptionValue.length} / 160
                                                    </div>
                                                </div>
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
                                                <CountrySelector value={field.value || ''} onChange={field.onChange} />
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
                                                <Select onValueChange={field.onChange} value={field.value || undefined}>
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

                <UserActivity userId={user.uid} />
            </div>
        </div>
    )
}

export default function ProfilePage() {
    return (
        <ProfilePageContent />
    )
}
