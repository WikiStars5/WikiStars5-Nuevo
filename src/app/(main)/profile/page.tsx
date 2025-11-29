
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, getDoc, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { updateProfile, linkWithPopup, GoogleAuthProvider } from 'firebase/auth';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Save, User as UserIcon, Image as ImageIcon, Info, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CountrySelector } from '@/components/figure/country-selector';
import UserActivity from '@/components/profile/user-activity';
import { normalizeText } from '@/lib/keywords';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';


export const dynamic = 'force-dynamic';

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.565-3.113-11.284-7.481l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.126,44,30.028,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
  </svg>
);


const profileSchema = z.object({
  username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.').max(10, 'El nombre de usuario no puede superar los 10 caracteres.').regex(/^[a-zA-Z0-9_]+$/, 'Solo se permiten letras, números y guiones bajos.'),
  profilePhotoUrl: z.string().url('Por favor, introduce una URL válida.').optional().or(z.literal('')),
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
    const [isLinking, setIsLinking] = useState(false);

    const [userData, setUserData] = useState<any>(null);
    const [isUserDataLoading, setIsUserDataLoading] = useState(true);

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            username: '',
            profilePhotoUrl: '',
            country: '',
            gender: undefined,
            description: '',
        }
    });

    const descriptionValue = profileForm.watch('description') || '';
    const profilePhotoUrlValue = profileForm.watch('profilePhotoUrl');

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
                        username: data.username || (user.isAnonymous ? `Invitado_${user.uid.substring(0,4)}` : user.displayName) || '',
                        profilePhotoUrl: data.profilePhotoUrl || user.photoURL || '',
                        country: data.country || '',
                        gender: data.gender || undefined,
                        description: data.description || '',
                    });
                } else {
                    profileForm.reset({ username: user.isAnonymous ? `Invitado_${user.uid.substring(0,4)}` : user.displayName || '' });
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

                    if (oldUsernameLower && oldUsernameLower !== newUsernameLower) {
                        const oldUsernameRef = doc(firestore, 'usernames', oldUsernameLower);
                        transaction.delete(oldUsernameRef);
                    }
                    transaction.set(newUsernameRef, { userId: user.uid });
                }
                
                const dataToUpdate: any = {
                    username: newUsername,
                    usernameLower: newUsernameLower,
                    profilePhotoUrl: data.profilePhotoUrl || null,
                    country: data.country || null,
                    gender: data.gender || null,
                    description: data.description || null,
                };
                
                if (!user.isAnonymous) {
                  dataToUpdate.email = user.email;
                }

                transaction.set(userRef, dataToUpdate, { merge: true });
            });

            if (auth?.currentUser && (auth.currentUser.displayName !== newUsername || auth.currentUser.photoURL !== data.profilePhotoUrl) && !user.isAnonymous) {
                await updateProfile(auth.currentUser, { displayName: newUsername, photoURL: data.profilePhotoUrl });
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
    
    const handleLinkAccount = async () => {
        if (!auth?.currentUser || !auth.currentUser.isAnonymous) return;
        setIsLinking(true);
        const provider = new GoogleAuthProvider();
        try {
            const result = await linkWithPopup(auth.currentUser, provider);
            
            if (firestore && result.user) {
                const userRef = doc(firestore, 'users', result.user.uid);
                await setDoc(userRef, { 
                  email: result.user.email,
                  profilePhotoUrl: result.user.photoURL 
                }, { merge: true });
            }
            
            await reloadUser();
            toast({
                title: "¡Cuenta Vinculada!",
                description: "Has conectado tu cuenta de Google. Tu actividad se ha guardado.",
            });
        } catch (error: any) {
            console.error("Error linking account:", error);
            let description = "No se pudo vincular la cuenta. Inténtalo de nuevo.";
            if (error.code === 'auth/credential-already-in-use') {
                description = "Esta cuenta de Google ya está asociada con otro usuario de WikiStars5.";
            }
             toast({
                title: "Error de Vinculación",
                description,
                variant: "destructive",
            });
        } finally {
            setIsLinking(false);
        }
    }
    
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
                <Button asChild className="mt-4"><Link href="/login">Ir a Iniciar Sesión</Link></Button>
            </div>
        )
    }

    const getAvatarFallback = () => {
        if (user.isAnonymous) return <UserIcon />;
        return profileForm.getValues('username')?.charAt(0) || user?.email?.charAt(0) || 'U';
    }
    
    const displayName = userData?.username || user.displayName || 'Invitado';

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
             <div className="flex flex-col items-center text-center">
                <Dialog>
                  <DialogTrigger asChild>
                    <Avatar className="h-32 w-32 text-5xl mb-4 border-4 border-primary/50 shadow-lg cursor-pointer">
                        <AvatarImage src={profilePhotoUrlValue || undefined} />
                        <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                    </Avatar>
                  </DialogTrigger>
                  <DialogContent className="p-2 bg-transparent border-0 max-w-4xl h-screen flex items-center justify-center">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Imagen de perfil de {displayName}</DialogTitle>
                        <DialogDescription>Una vista ampliada de la imagen de perfil.</DialogDescription>
                    </DialogHeader>
                    <div className="relative w-full h-full max-h-[90vh]">
                        <Image
                            src={profilePhotoUrlValue || `https://placehold.co/800x800?text=${encodeURIComponent(displayName.charAt(0))}`}
                            alt={displayName}
                            fill
                            className="rounded-lg object-contain"
                        />
                    </div>
                  </DialogContent>
                </Dialog>

                <h1 className="text-4xl font-bold tracking-tight font-headline">{displayName}</h1>
                <p className="text-muted-foreground mt-2">{userData?.description || (user.isAnonymous ? 'Usuario invitado' : user.email)}</p>
            </div>
            
            <div className="mt-8">
                 <Tabs defaultValue="info" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="info"><Info className="mr-2 h-4 w-4"/>Información</TabsTrigger>
                        <TabsTrigger value="activity"><Activity className="mr-2 h-4 w-4"/>Actividad</TabsTrigger>
                    </TabsList>
                    <TabsContent value="info" className="mt-4">
                      <Card>
                        <CardHeader>
                            <CardTitle>Editar Perfil</CardTitle>
                            <CardDescription>Aquí puedes editar tus datos públicos.</CardDescription>
                        </CardHeader>
                        <Form {...profileForm}>
                            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                                <CardContent className="space-y-6">
                                    <FormField
                                        control={profileForm.control}
                                        name="profilePhotoUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>URL de Foto de Perfil</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="https://..." value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
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
                                    {!user.isAnonymous && (
                                        <div className="space-y-2">
                                            <FormLabel>Correo Electrónico</FormLabel>
                                            <Input type="email" value={user?.email || ''} disabled />
                                        </div>
                                    )}
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
                            </form>
                        </Form>
                      </Card>
                       {user.isAnonymous && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>¿Listo para Guardar tu Progreso?</CardTitle>
                                <CardDescription>Tu actividad es anónima. Para guardar tus rachas y logros de forma permanente, vincula tu cuenta con Google.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={handleLinkAccount} disabled={isLinking} className="w-full">
                                    {isLinking ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
                                    Vincular con Google y Guardar Progreso
                                </Button>
                            </CardContent>
                        </Card>
                       )}
                    </TabsContent>
                    <TabsContent value="activity" className="mt-4">
                        <UserActivity userId={user.uid} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

export default function ProfilePage() {
    return (
        <ProfilePageContent />
    )
}

    