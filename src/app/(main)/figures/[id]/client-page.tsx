'use client';

import { useState } from 'react';
import { doc, collection } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type { Figure } from '@/lib/types';
import ProfileHeader from '@/components/figure/ProfileHeader';
import AttitudeVoting from '@/components/figure/attitude-voting';
import EmotionVoting from '@/components/figure/emotion-voting';
import EditInformationForm from '@/components/figure/edit-information-form';
import CommentSection from '@/components/figure/comment-section';
import { Button } from '@/components/ui/button';
import { Pencil, User, Users, Briefcase, Globe, Heart, CalendarDays, Ruler, Link as LinkIcon, Flame } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import CommunityRatings from '@/components/figure/community-ratings';
import RelatedFigures from '@/components/figure/related-figures';
import TopStreaks from '@/components/streaks/top-streaks';


const SOCIAL_MEDIA_CONFIG: Record<string, { label: string }> = {
    website: { label: 'Página Web' },
    instagram: { label: 'Instagram' },
    twitter: { label: 'X (Twitter)' },
    youtube: { label: 'YouTube' },
    facebook: { label: 'Facebook' },
    tiktok: { label: 'TikTok' },
    linkedin: { label: 'LinkedIn' },
    discord: { label: 'Discord' },
};

const SocialLink = ({ platform, url }: { platform: string; url: string }) => {
    try {
        const domain = new URL(url).hostname;
        const config = SOCIAL_MEDIA_CONFIG[platform] || { label: platform.charAt(0).toUpperCase() + platform.slice(1) };

        return (
            <Link href={url} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-2 text-center transition-colors hover:text-primary">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border bg-muted transition-all group-hover:border-primary group-hover:bg-primary/10">
                    <Image
                        src={`https://www.google.com/s2/favicons?sz=64&domain_url=${domain}`}
                        alt={`${config.label} icon`}
                        width={32}
                        height={32}
                        className="h-8 w-8 object-contain"
                    />
                </div>
                <span className="text-xs font-medium">{config.label}</span>
            </Link>
        );
    } catch (e) {
        return null;
    }
};

function FigureDetailSkeleton() {
  return (
    <div className="container mx-auto max-w-4xl px-4 pb-8 pt-0 md:pb-16 md:pt-0">
      <Card className="overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col items-center gap-4 md:flex-row md:gap-8">
            <Skeleton className="h-28 w-28 flex-shrink-0 rounded-full md:h-36 md:w-36" />
            <div className="flex-1 space-y-3 text-center md:text-left">
              <Skeleton className="h-8 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="mt-6">
        <Skeleton className="h-10 w-full" />
        <Card className="mt-4">
          <CardContent className="p-6">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const formatDate = (dateString?: string): string | null => {
    if (!dateString) return null;

    if (dateString.startsWith('-')) {
        const year = dateString.substring(1).replace(/[^0-9]/g, '');
        if (!year) return null;
        return `Año ${year} a. C.`;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const adjustedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);

    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    };
    return adjustedDate.toLocaleDateString('es-ES', options);
};

const formatHeight = (cm?: number): string | null => {
    if (!cm) return null;
    return `${(cm / 100).toFixed(2)} m`;
};


export default function FigureDetailClient({ figureId }: { figureId: string }) {
  const firestore = useFirestore();
  const [isEditing, setIsEditing] = useState(false);

  const figureDocRef = useMemoFirebase(() => {
    if (!firestore || !figureId) return null;
    return doc(firestore, 'figures', figureId);
  }, [firestore, figureId]);

  const { data: figure, isLoading, error } = useDoc<Figure>(figureDocRef);

  if (isLoading || !figure) {
    return <FigureDetailSkeleton />;
  }
  
  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error.message}</div>
  }

  const infoItems = [
    {
      label: 'Nombre Completo',
      value: figure.name,
      icon: User,
    },
    {
      label: 'Sexo',
      value: figure.gender,
      icon: Users,
    },
    {
        label: 'Nacimiento',
        value: formatDate(figure.birthDate),
        icon: CalendarDays,
    },
    {
        label: 'Fallecimiento',
        value: formatDate(figure.deathDate),
        icon: CalendarDays,
    },
    {
      label: 'Ocupación',
      value: figure.occupation,
      icon: Briefcase,
    },
    {
      label: 'País de origen',
      value: figure.nationality,
      icon: Globe,
    },
    {
      label: 'Estado civil',
      value: figure.maritalStatus,
      icon: Heart,
    },
    {
      label: 'Altura',
      value: formatHeight(figure.height),
      icon: Ruler,
    },
  ];

  const hasInfo = infoItems.some(item => !!item.value);
  const hasSocialLinks = figure.socialLinks && Object.values(figure.socialLinks).some(link => !!link);


  return (
    <div className="container mx-auto max-w-4xl px-4 pb-8 pt-0 md:pb-16 md:pt-0">
      <ProfileHeader figure={figure} figureId={figure.id} />

      <div className="mt-6">
        <Tabs defaultValue="actitud" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="informacion">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 9h.01" /><path d="M11 12h1v4h1" /></svg>
              Información
            </TabsTrigger>
            <TabsTrigger value="actitud">
               <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="2" />
              </svg>
              Actitud
            </TabsTrigger>
            <TabsTrigger value="emocion">
             <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 21a9 9 0 1 1 0 -18a9 9 0 0 1 0 18z" /><path d="M9 10h.01" /><path d="M15 10h.01" /><path d="M9.5 15a3.5 3.5 0 0 0 5 0" /></svg>
              Emoción
            </TabsTrigger>
            <TabsTrigger value="rachas">
              <Flame className="mr-2 h-4 w-4" />
              Rachas
            </TabsTrigger>
          </TabsList>
          <TabsContent value="informacion" className="mt-4">
              {isEditing ? (
                  <EditInformationForm figure={figure} onFormClose={() => setIsEditing(false)} />
              ) : (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Información Detallada</CardTitle>
                                <CardDescription>Datos biográficos y descriptivos de {figure.name}.</CardDescription>
                            </div>
                            <Button variant="outline" onClick={() => setIsEditing(true)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {hasInfo ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                {infoItems.map((item) => {
                                    if (!item.value) return null;

                                    return (
                                        <div key={item.label} className="flex items-start gap-3">
                                            <item.icon className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
                                            <div>
                                                <p className="font-semibold text-sm">{item.label}</p>
                                                {item.label === 'Sexo' ? (
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <span>{item.value}</span>
                                                        {item.value === 'Masculino' && <span className="text-blue-400 font-bold">♂</span>}
                                                        {item.value === 'Femenino' && <span className="text-pink-400 font-bold">♀</span>}
                                                    </div>
                                                ) : (
                                                    <p className="text-muted-foreground">{item.value}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                             <p className="text-muted-foreground text-center py-4">
                                No hay información detallada disponible. ¡Haz clic en "Editar" para añadirla!
                            </p>
                        )}

                        {hasSocialLinks && (
                            <>
                                <Separator className="my-6" />
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm flex items-center gap-2">
                                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                                        Redes Sociales
                                    </h3>
                                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
                                        {Object.entries(figure.socialLinks || {}).map(([platform, url]) => (
                                            url ? <SocialLink key={platform} platform={platform} url={url} /> : null
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                        
                    </CardContent>
                </Card>
              )}
          </TabsContent>
          <TabsContent value="actitud" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <AttitudeVoting figure={figure} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="emocion" className="mt-4">
            <Card>
              <CardContent className="p-6">
                 <EmotionVoting figure={figure} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="rachas" className="mt-4">
            <TopStreaks figureId={figureId} />
          </TabsContent>
        </Tabs>
      </div>

       <div className="mt-8 space-y-8">
        <CommunityRatings figure={figure} />
        <CommentSection figureId={figure.id} figureName={figure.name} />
        <RelatedFigures figure={figure} />
      </div>
    </div>
  );
}
