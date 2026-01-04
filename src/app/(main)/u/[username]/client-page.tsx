
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { countries } from "@/lib/countries";
import Image from "next/image";
import UserActivity from "@/components/profile/user-activity";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, Activity } from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, where, limit } from "firebase/firestore";
import { useMemoFirebase } from "@/firebase/provider";
import { useEffect, useState } from "react";
import { normalizeText } from "@/lib/keywords";
import { Skeleton } from "@/components/ui/skeleton";
import { notFound } from "next/navigation";


interface PublicUserProfile {
    id: string;
    username: string;
    country: string | null;
    gender: 'Masculino' | 'Femenino' | 'Otro' | 'Prefiero no decirlo' | null;
    description: string | null;
    profilePhotoUrl?: string | null;
    coverPhotoUrl?: string | null;
}

interface PublicProfileClientPageProps {
    username: string;
}

function ProfileSkeleton() {
    return (
        <div className="container mx-auto max-w-4xl px-0 md:px-4 pb-8 md:pb-12">
            <Card className="overflow-hidden shadow-lg dark:bg-black border-0 md:border md:rounded-lg">
                <Skeleton className="h-48 md:h-64 w-full" />
                <div className="relative px-4 sm:px-6 pb-6">
                    <div className=" -mt-16 md:-mt-20 flex flex-col md:flex-row items-center md:items-end gap-4">
                        <Skeleton className="h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-background" />
                        <div className="flex-1 text-center md:text-left md:pb-4 space-y-2">
                           <Skeleton className="h-10 w-48" />
                           <Skeleton className="h-5 w-64" />
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}

export default function PublicProfileClientPage({ username }: PublicProfileClientPageProps) {
    const firestore = useFirestore();
    const [userProfile, setUserProfile] = useState<PublicUserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const fetchUserProfile = async () => {
        if (!firestore) return;
        setIsLoading(true);

        const usernameLower = normalizeText(username);
        const usernameQuery = query(
          collection(firestore, 'usernames'),
          where('__name__', '==', usernameLower),
          limit(1)
        );

        const usernameSnapshot = await getDocs(usernameQuery);

        if (usernameSnapshot.empty) {
          setIsLoading(false);
          notFound(); // Trigger a 404 page
          return;
        }

        const userId = usernameSnapshot.docs[0].data().userId;
        if (!userId) {
          setIsLoading(false);
          notFound();
          return;
        }

        const userDocRef = doc(firestore, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          setIsLoading(false);
          notFound();
          return;
        }
        
        const userData = userDocSnap.data();
        const publicUserData = {
            id: userDocSnap.id,
            username: userData.username || 'Usuario',
            country: userData.country || null,
            gender: userData.gender || null,
            description: userData.description || null,
            profilePhotoUrl: userData.profilePhotoUrl || null,
            coverPhotoUrl: userData.coverPhotoUrl || null,
        };

        setUserProfile(publicUserData);
        setIsLoading(false);
      };

      fetchUserProfile();
    }, [firestore, username]);

    if (isLoading) {
        return <ProfileSkeleton />;
    }
    
    if (!userProfile) {
        // This case is handled by calling notFound() in the effect,
        // but as a fallback, we can show a message.
        return <div>Usuario no encontrado.</div>;
    }
    
    const getAvatarFallback = () => {
        return userProfile.username.charAt(0).toUpperCase() || 'U';
    }

    const country = userProfile.country ? countries.find(c => c.name === userProfile.country) : null;
    
    return (
        <div className="container mx-auto max-w-4xl px-0 md:px-4 pb-8 md:pb-12">
            <Card className="overflow-hidden shadow-lg dark:bg-black border-0 md:border md:rounded-lg">
                <div className="relative h-48 md:h-64 bg-muted">
                    {userProfile.coverPhotoUrl && (
                        <Image
                            src={userProfile.coverPhotoUrl}
                            alt={`Foto de portada de ${userProfile.username}`}
                            fill
                            className="object-cover"
                        />
                    )}
                     <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                </div>

                <div className="relative px-4 sm:px-6 pb-6">
                    <div className=" -mt-16 md:-mt-20 flex flex-col md:flex-row items-center md:items-end gap-4">
                         <div className="relative flex-shrink-0">
                            <Avatar className="h-32 w-32 md:h-40 md:w-40 text-5xl border-4 border-background bg-muted">
                                <AvatarImage src={userProfile.profilePhotoUrl || undefined} />
                                <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                            </Avatar>
                         </div>
                         <div className="flex-1 text-center md:text-left md:pb-4">
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-headline">{userProfile.username}</h1>
                            {userProfile.description && (
                                <p className="mt-1 text-muted-foreground">{userProfile.description}</p>
                            )}
                         </div>
                    </div>
                </div>
            </Card>

            <div className="mt-6 px-4 md:px-0">
                <Tabs defaultValue="activity" className="w-full">
                    <TabsList>
                        <TabsTrigger value="info"><Info className="mr-2 h-4 w-4"/>Información</TabsTrigger>
                        <TabsTrigger value="activity"><Activity className="mr-2 h-4 w-4"/>Actividad</TabsTrigger>
                    </TabsList>
                    <TabsContent value="info" className="mt-4">
                       <Card>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Sexo</p>
                                    <p>{userProfile.gender || 'No especificado'}</p>
                                </div>
                                 <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">País</p>
                                    <p>{userProfile.country || 'No especificado'}</p>
                                </div>
                                  <div className="space-y-1 md:col-span-2">
                                    <p className="text-sm font-medium text-muted-foreground">Descripción</p>
                                    <p>{userProfile.description || 'Sin descripción.'}</p>
                                </div>
                            </div>
                        </CardContent>
                       </Card>
                    </TabsContent>
                    <TabsContent value="activity" className="mt-4">
                        <UserActivity userId={userProfile.id} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

    
