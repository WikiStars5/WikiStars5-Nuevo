
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { countries } from "@/lib/countries";
import Image from "next/image";
import UserActivity from "@/components/profile/user-activity";
import UserStarPosts from "@/components/profile/user-starposts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, Activity, Users, MessagesSquare } from "lucide-react";
import { useFirestore } from "@/firebase";
import { collection, query, where, limit, getDocs, getDoc, doc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { normalizeText } from "@/lib/keywords";
import { Skeleton } from "@/components/ui/skeleton";
import { notFound } from "next/navigation";
import FollowButton from "@/components/shared/follow-button";
import { formatCompactNumber } from "@/lib/utils";
import FollowListDialog from '@/components/shared/follow-list-dialog';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { trackView } from "@/lib/view-tracker";


interface PublicUserProfile {
    id: string;
    username: string;
    country: string | null;
    gender: 'Masculino' | 'Femenino' | 'Otro' | 'Prefiero no decirlo' | null;
    description: string | null;
    profilePhotoUrl?: string | null;
    coverPhotoUrl?: string | null;
    followerCount?: number;
    followingCount?: number;
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
    const { theme } = useTheme();
    const [userProfile, setUserProfile] = useState<PublicUserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [followList, setFollowList] = useState<{ open: boolean; type: 'followers' | 'following' }>({
        open: false,
        type: 'followers'
    });

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

        try {
            const usernameSnapshot = await getDocs(usernameQuery);

            if (usernameSnapshot.empty) {
              setIsLoading(false);
              notFound();
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
            const publicUserData: PublicUserProfile = {
                id: userDocSnap.id,
                username: userData.username || 'Usuario',
                country: userData.country || null,
                gender: userData.gender || null,
                description: userData.description || null,
                profilePhotoUrl: userData.profilePhotoUrl || null,
                coverPhotoUrl: userData.coverPhotoUrl || null,
                followerCount: userData.followerCount || 0,
                followingCount: userData.followingCount || 0,
            };

            setUserProfile(publicUserData);
            
            // Track view for user profile
            trackView(firestore, 'users', publicUserData.id);

        } catch (error) {
            console.error("Error fetching user profile:", error);
        } finally {
            setIsLoading(false);
        }
      };

      fetchUserProfile();
    }, [firestore, username]);

    if (isLoading) {
        return <ProfileSkeleton />;
    }
    
    if (!userProfile) {
        return <div>Usuario no encontrado.</div>;
    }
    
    const getAvatarFallback = () => {
        return userProfile.username.charAt(0).toUpperCase() || 'U';
    }

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
                            <div className="flex flex-col md:flex-row items-center gap-4">
                              <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-headline">{userProfile.username}</h1>
                              <FollowButton 
                                targetUserId={userProfile.id}
                                targetUsername={userProfile.username}
                                targetPhotoUrl={userProfile.profilePhotoUrl || null}
                                size="default"
                                className="h-9 px-6 text-sm"
                              />
                            </div>
                            
                            <div className="flex items-center justify-center md:justify-start gap-6 mt-4">
                              <button 
                                onClick={() => setFollowList({ open: true, type: 'followers' })}
                                className="text-center hover:opacity-70 transition-opacity"
                              >
                                <p className="text-xl font-bold">{formatCompactNumber(userProfile.followerCount || 0)}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Seguidores</p>
                              </button>
                              <button 
                                onClick={() => setFollowList({ open: true, type: 'following' })}
                                className="text-center hover:opacity-70 transition-opacity"
                              >
                                <p className="text-xl font-bold">{formatCompactNumber(userProfile.followingCount || 0)}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Seguidos</p>
                              </button>
                            </div>

                            {userProfile.description && (
                                <p className="mt-4 text-muted-foreground">{userProfile.description}</p>
                            )}
                         </div>
                    </div>
                </div>
            </Card>

            <div className="mt-6 px-4 md:px-0">
                <Tabs defaultValue="starposts" className="w-full">
                    <ScrollArea className="w-full whitespace-nowrap">
                        <TabsList className={cn("inline-flex h-auto justify-start w-full", (theme === 'dark' || theme === 'army') && 'bg-black')}>
                            <TabsTrigger value="info" className="flex-1"><Info className="mr-2 h-4 w-4"/>Información</TabsTrigger>
                            <TabsTrigger value="activity" className="flex-1"><Activity className="mr-2 h-4 w-4"/>Actividad</TabsTrigger>
                            <TabsTrigger value="starposts" className="flex-1"><MessagesSquare className="mr-2 h-4 w-4" />Starposts</TabsTrigger>
                        </TabsList>
                        <ScrollBar orientation="horizontal" className="h-1.5" />
                    </ScrollArea>
                    <TabsContent value="info" className="mt-4">
                       <Card className={cn((theme === 'dark' || theme === 'army') && 'bg-black')}>
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
                    <TabsContent value="starposts" className="mt-4">
                        <UserStarPosts userId={userProfile.id} />
                    </TabsContent>
                </Tabs>
            </div>

            <FollowListDialog 
                userId={userProfile.id} 
                type={followList.type} 
                open={followList.open} 
                onOpenChange={(open) => setFollowList(prev => ({ ...prev, open }))} 
            />
        </div>
    );
}
