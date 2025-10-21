
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Flame, Medal, MessageSquare, TrendingUp, Loader2, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CountrySelector } from '@/components/figure/country-selector';

const profileSchema = z.object({
  username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.').max(30, 'El nombre de usuario no puede superar los 30 caracteres.'),
  country: z.string().optional(),
  gender: z.enum(['Masculino', 'Femenino', 'Otro', 'Prefiero no decirlo']).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    // This state will hold the user data fetched from Firestore
    const [userData, setUserData] = useState<any>(null);
    const [isUserDataLoading, setIsUserDataLoading] = useState(true);

    const form = useForm<ProfileFormValues>({
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
                const userSnap = await (await import('firebase/firestore')).getDoc(userRef);
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    setUserData(data);
                    // Set form values once data is fetched
                    form.reset({
                        username: data.username || user.displayName || '',
                        country: data.country || '',
                        gender: data.gender || undefined,
                    });
                } else {
                     // If no doc exists, use displayName from auth
                    form.reset({ username: user.displayName || '' });
                }
                setIsUserDataLoading(false);
            }
        };

        if (!isUserLoading) {
            fetchUserData();
        }
    }, [user, firestore, isUserLoading, form]);


    const onSubmit = async (data: ProfileFormValues) => {
        if (!firestore || !user) return;
        
        setIsSaving(true);
        const userRef = doc(firestore, 'users', user.uid);
        
        try {
            const { setDoc } = await import('firebase/firestore');
            const dataToUpdate = {
                ...data,
                email: user.email, // ensure email is always present
                username: data.username,
            };
            
            await setDoc(userRef, dataToUpdate, { merge: true });

            // Also update the auth profile display name
            const { updateProfile } = await import('firebase/auth');
            await updateProfile(user, { displayName: data.username });
            
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
        return form.getValues('username')?.charAt(0) || user?.email?.charAt(0) || 'U';
    }

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
             <header className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight font-headline">Mi Perfil</h1>
                <p className="text-muted-foreground mt-2">Gestiona tu información personal y visualiza tu actividad.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
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
                                            control={form.control}
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
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
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
                                            control={form.control}
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
                                <CardContent>
                                    <Button type="submit" disabled={isSaving}>
                                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Guardar Cambios
                                    </Button>
                                </CardContent>
                            </Card>
                        </form>
                    </Form>
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

    