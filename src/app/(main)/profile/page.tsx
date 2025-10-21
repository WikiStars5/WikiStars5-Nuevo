
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useAuth, GoogleAuthProvider, linkWithCredential, signInWithPopup } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
import { Flame, Medal, MessageSquare, TrendingUp, Loader2, Save, Link as LinkIcon, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CountrySelector } from '@/components/figure/country-selector';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const profileSchema = z.object({
  username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.').max(30, 'El nombre de usuario no puede superar los 30 caracteres.'),
  country: z.string().optional(),
  gender: z.enum(['Masculino', 'Femenino', 'Otro', 'Prefiero no decirlo']).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
        <path fill="none" d="M0 0h48v48H0z"></path>
    </svg>
);


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
                    });
                } else {
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
        const userRef = doc(firestore, 'users', user.uid);
        
        try {
            const dataToUpdate = {
                ...data,
                email: user.email,
                username: data.username,
            };
            
            await setDoc(userRef, dataToUpdate, { merge: true });

            if (user.displayName !== data.username) {
                await updateProfile(user, { displayName: data.username });
            }
            
            toast({
                title: "¡Perfil Actualizado!",
                description: "Tu información ha sido guardada correctamente.",
            });
        } catch (error) {
            console.error("Error updating profile:", error);
            toast({
                title: "Error al Guardar",
                description: "No se pudo actualizar tu perfil. Inténtalo de nuevo.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleLinkWithGoogle = async () => {
        if (!auth || !user || !user.isAnonymous) return;
    
        setIsLinking(true);
        setLinkError(null);
    
        try {
          const provider = new GoogleAuthProvider();
          // Link the anonymous user with the Google provider
          const result = await linkWithCredential(user, provider);
          
          // Optionally, update Firestore with the new user details from Google
          const googleUser = result.user;
          const userRef = doc(firestore, 'users', googleUser.uid);
          await setDoc(userRef, { 
            email: googleUser.email,
            username: googleUser.displayName,
            photoURL: googleUser.photoURL
          }, { merge: true });
    
          toast({
            title: "¡Cuenta Vinculada con Google!",
            description: "Has convertido tu cuenta de invitado en una cuenta permanente.",
          });
    
          // Reload user state to reflect the change from anonymous to permanent
          await reloadUser();
    
        } catch (error: any) {
          console.error("Error linking with Google:", error);
          if (error.code === 'auth/credential-already-in-use') {
            setLinkError('Esta cuenta de Google ya está asociada con otro usuario.');
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
                    <Skeleton className="h-32 w-full" />
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
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
                    
                    {user.isAnonymous && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Vincular Cuenta</CardTitle>
                                <CardDescription>Convierte tu cuenta de invitado en una cuenta permanente para no perder tu progreso. ¡Es más fácil con Google!</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {linkError && (
                                    <Alert variant="destructive" className="mb-4">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Error al Vincular</AlertTitle>
                                        <AlertDescription>{linkError}</AlertDescription>
                                    </Alert>
                                )}
                                <Button onClick={handleLinkWithGoogle} disabled={isLinking} className="w-full">
                                    {isLinking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
                                    Vincular con Google
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                </div>

                <div className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Estadísticas de Actividad</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Flame className="h-6 w-6 text-orange-500" />
                                    <span className="font-medium">Racha más larga</span>
                                </div>
                                <span className="font-bold text-lg">0 Días</span>
                            </div>
                           
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="h-6 w-6 text-primary" />
                                    <span className="font-medium">Comentarios totales</span>
                                </div>
                               
                                <span className="font-bold text-lg">0</span>
                               
                            </div>
                           
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="h-6 w-6 text-green-500" />
                                    <span className="font-medium">Votos totales</span>
                                </div>
                                <span className="font-bold text-lg">0</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Logros</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-4">
                            <div className="flex flex-col items-center text-center gap-2 p-2 rounded-md bg-muted opacity-50" title="Primer Comentario (Bloqueado)">
                                <Medal className="h-8 w-8 text-muted-foreground"/>
                                <span className="text-xs font-medium">Primer Comentario</span>
                            </div>
                            <div className="flex flex-col items-center text-center gap-2 p-2 rounded-md bg-muted opacity-50" title="Primer Voto (Bloqueado)">
                                <Medal className="h-8 w-8 text-muted-foreground"/>
                                <span className="text-xs font-medium">Primer Voto</span>
                            </div>
                            <div className="flex flex-col items-center text-center gap-2 p-2 rounded-md bg-muted opacity-50" title="Racha de 10 días (Bloqueado)">
                                <Medal className="h-8 w-8 text-muted-foreground"/>
                                <span className="text-xs font-medium">Racha de 10 días</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

    