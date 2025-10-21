
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useAuth, sendVerificationEmail, GoogleAuthProvider, linkWithCredential, signInWithPopup } from '@/firebase';
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
import { Flame, Medal, MessageSquare, TrendingUp, Loader2, Save, Link as LinkIcon, AlertTriangle, MailCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CountrySelector } from '@/components/figure/country-selector';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const profileSchema = z.object({
  username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.').max(30, 'El nombre de usuario no puede superar los 30 caracteres.'),
  country: z.string().optional(),
  gender: z.enum(['Masculino', 'Femenino', 'Otro', 'Prefiero no decirlo']).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;


export default function ProfilePage() {
    const { user, isUserLoading, reloadUser } = useUser();
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [linkError, setLinkError] = useState<string | null>(null);
    const [isSendingVerification, setIsSendingVerification] = useState(false);

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
            const result = await signInWithPopup(auth, provider);
            const credential = GoogleAuthProvider.credentialFromResult(result);

            if (!credential) {
                throw new Error("No se pudo obtener la credencial de Google.");
            }

            const userCredential = await linkWithCredential(user, credential);
            const linkedUser = userCredential.user;
            
            const userRef = doc(firestore, 'users', linkedUser.uid);
            await setDoc(userRef, { email: linkedUser.email, username: linkedUser.displayName, photoURL: linkedUser.photoURL }, { merge: true });
            
            toast({
                title: "¡Cuenta Vinculada!",
                description: "Tu cuenta ha sido vinculada con Google exitosamente.",
            });
            
            await reloadUser();
            
        } catch (error: any) {
            console.error("Error linking account with Google:", error);
            if (error.code === 'auth/credential-already-in-use') {
                setLinkError('Esta cuenta de Google ya está asociada con otro usuario.');
            } else {
                setLinkError('No se pudo vincular la cuenta. Inténtalo de nuevo.');
            }
        } finally {
            setIsLinking(false);
        }
    };

    const handleResendVerification = async () => {
        if (!user || user.emailVerified) return;
        
        setIsSendingVerification(true);
        try {
            await sendVerificationEmail(user);
            toast({
                title: "Correo de Verificación Enviado",
                description: "Se ha enviado un nuevo enlace de verificación a tu correo.",
            });
        } catch (error) {
            console.error("Error resending verification email:", error);
            toast({
                title: "Error al Enviar",
                description: "No se pudo enviar el correo. Inténtalo de nuevo más tarde.",
                variant: "destructive",
            });
        } finally {
            setIsSendingVerification(false);
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

            {user && !user.isAnonymous && !user.emailVerified && (
                <Alert variant="destructive" className="mb-6 bg-yellow-900/20 border-yellow-700/50 text-yellow-200 [&>svg]:text-yellow-400">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="font-bold text-yellow-300">Verifica tu Correo Electrónico</AlertTitle>
                    <AlertDescription className="text-yellow-300/90 flex justify-between items-center">
                       <span> Para asegurar tu cuenta, por favor, verifica tu dirección de correo electrónico.</span>
                        <Button 
                            variant="link"
                            className="p-0 h-auto text-yellow-300 hover:text-yellow-100"
                            onClick={handleResendVerification}
                            disabled={isSendingVerification}
                        >
                             {isSendingVerification ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MailCheck className="mr-2 h-4 w-4"/>}
                            Reenviar correo
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

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
                                <CardDescription>Convierte tu cuenta de invitado en una cuenta permanente para no perder tu progreso. ¡Es fácil y rápido con Google!</CardDescription>
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
                                    {isLinking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg className="mr-2 h-4 w-4" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.86 2.25-5.8 2.25-4.54 0-8.28-3.74-8.28-8.28s3.74-8.28 8.28-8.28c2.48 0 4.28.94 5.24 1.88l2.5-2.5c-1.58-1.48-3.6-2.38-6.04-2.38-5.38 0-9.68 4.3-9.68 9.68s4.3 9.68 9.68 9.68c3.34 0 5.74-1.14 7.54-2.92 1.84-1.84 2.38-4.4 2.38-6.88 0-.64-.06-1.28-.18-1.92H12.48z" fill="currentColor"/></svg>}
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

    