'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { countries } from "@/lib/countries";
import Image from "next/image";
import UserActivity from "@/components/profile/user-activity";

interface PublicUserProfile {
    id: string;
    username: string;
    country: string | null;
    gender: 'Masculino' | 'Femenino' | 'Otro' | 'Prefiero no decirlo' | null;
    description: string | null;
}

interface PublicProfileClientPageProps {
    userProfile: PublicUserProfile;
}

export default function PublicProfileClientPage({ userProfile }: PublicProfileClientPageProps) {
    
    const getAvatarFallback = () => {
        return userProfile.username.charAt(0).toUpperCase() || 'U';
    }

    const country = userProfile.country ? countries.find(c => c.name === userProfile.country) : null;
    
    return (
        <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
            <Card>
                <CardContent className="p-6 md:p-8">
                     <div className="flex flex-col md:flex-row items-center gap-6">
                        <Avatar className="h-24 w-24 md:h-32 md:w-32 text-4xl">
                            <AvatarImage src={undefined} />
                            <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-headline">{userProfile.username}</h1>
                            {userProfile.description && (
                                <p className="mt-2 text-muted-foreground">{userProfile.description}</p>
                            )}
                            <div className="flex items-center justify-center md:justify-start gap-3 mt-3 text-muted-foreground">
                                {userProfile.gender && (
                                    <>
                                        {userProfile.gender === 'Masculino' && <span className="flex items-center gap-1"><span className="text-blue-400 font-bold">♂</span> Masculino</span>}
                                        {userProfile.gender === 'Femenino' && <span className="flex items-center gap-1"><span className="text-pink-400 font-bold">♀</span> Femenino</span>}
                                    </>
                                )}
                                {userProfile.gender && country && <span className="text-sm">·</span>}
                                {country && (
                                    <div className="flex items-center gap-2">
                                        <Image
                                            src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                                            alt={country.name}
                                            width={20}
                                            height={15}
                                            className="object-contain"
                                        />
                                        <span>{country.name}</span>
                                    </div>
                                )}
                                 {(!userProfile.gender && !country && !userProfile.description) && (
                                    <span className="text-sm">Aún sin información pública.</span>
                                )}
                            </div>
                        </div>
                     </div>
                </CardContent>
            </Card>

            <div className="mt-6">
                <UserActivity userId={userProfile.id} />
            </div>
        </div>
    );
}

    