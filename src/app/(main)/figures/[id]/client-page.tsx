
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { doc, getDoc, collection } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type { Figure, Comment } from '@/lib/types';
import ProfileHeader from '@/components/figure/ProfileHeader';
import AttitudeVoting from '@/components/figure/attitude-voting';
import EmotionVoting from '@/components/figure/emotion-voting';
import EditInformationForm from '@/components/figure/edit-information-form';
import CommentSection from '@/components/figure/comment-section';
import { Button } from '@/components/ui/button';
import { Pencil, User, Users, Briefcase, Globe, Heart, CalendarDays, Ruler, Link as LinkIcon, Flame, Trophy, Lock, ArrowDown, Star, Swords } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import CommunityRatings from '@/components/figure/community-ratings';
import RelatedFigures from '@/components/figure/related-figures';
import TopStreaks from '@/components/streaks/top-streaks';
import GoatBattle from '@/components/figure/goat-battle';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useSearchParams } from 'next/navigation';
import { countries } from '@/lib/countries';
import { useLanguage } from '@/context/LanguageContext';
import FigureVersus from '@/components/figure/figure-versus';

type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';

const SOCIAL_MEDIA_CONFIG: Record<string, { label: string }> = {
    website: { label: 'Página Web' },
    instagram: { label: 'Instagram' },
    twitter: { label: 'X (Twitter)' },
    youtube: { label: 'YouTube' },
    facebook: { label: 'Facebook' },
    tiktok: { label: 'TikTok' },
    linkedin: { label: 'LinkedIn' },
    discord: { label: 'Discord' },
    wikipedia: { label: 'Wikipedia' },
    fandom: { label: 'Fandom' },
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

function FigureDetailContent({ figureId }: { figureId: string }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [isEditing, setIsEditing] = useState(false);
  const [commentSortPreference, setCommentSortPreference] = useState<AttitudeOption | null>(null);
  const { t } = useLanguage();

  const figureDocRef = useMemoFirebase(() => {
    if (!firestore || !figureId) return null;
    return doc(firestore, 'figures', figureId);
  }, [firestore, figureId]);

  const { data: figure, isLoading, error } = useDoc<Figure>(figureDocRef);

  const handleVote = useCallback((attitude: AttitudeOption | null) => {
    setCommentSortPreference(attitude);
  }, []);

  const getDefaultTab = () => {
    const shareType = searchParams.get('shareType');
    if (shareType === 'emotion') return 'emocion';
    if (searchParams.get('tab') === 'goat') return 'goat';
    return 'reseñas';
  }

  const isGoatCandidate = figure?.name === 'Lionel Messi' || figure?.name === 'Cristiano Ronaldo';

  if (isLoading || !figure) {
    return <FigureDetailSkeleton />;
  }
  
  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error.message}</div>
  }

  const getCountryName = (countryKey?: string) => {
    if (!countryKey) return null;
    return t(`countries.${countryKey.toLowerCase().replace(/ /g, '_')}`);
  }

  const infoItems = [
    {
      label: t('FigurePage.detailedInfo.nameLabel'),
      value: figure.name,
      icon: User,
    },
    {
      label: t('FigurePage.detailedInfo.genderLabel'),
      value: figure.gender,
      icon: Users,
    },
    {
        label: t('FigurePage.detailedInfo.birthDateLabel'),
        value: formatDate(figure.birthDate),
        icon: CalendarDays,
    },
    {
        label: t('FigurePage.detailedInfo.deathDateLabel'),
        value: formatDate(figure.deathDate),
        icon: CalendarDays,
    },
    {
      label: t('FigurePage.detailedInfo.occupationLabel'),
      value: figure.occupation,
      icon: Briefcase,
    },
    {
      label: t('FigurePage.detailedInfo.countryLabel'),
      value: getCountryName(figure.nationality),
      icon: Globe,
    },
    {
      label: t('FigurePage.detailedInfo.maritalStatusLabel'),
      value: figure.maritalStatus,
      icon: Heart,
    },
    {
      label: t('FigurePage.detailedInfo.heightLabel'),
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
        <Tabs defaultValue={getDefaultTab()} className="w-full">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex h-auto">
              <TabsTrigger value="wiki">
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 9h.01" /><path d="M11 12h1v4h1" /></svg>
                Wiki
              </TabsTrigger>
               <TabsTrigger value="reseñas">
                <Star className="mr-2 h-4 w-4" />
                Reseñas
              </TabsTrigger>
              <TabsTrigger value="emocion">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 21a9 9 0 1 1 0 -18a9 9 0 0 1 0 18z" /><path d="M9 10h.01" /><path d="M15 10h.01" /><path dM="9.5 15a3.5 3.5 0 0 0 5 0" /></svg>
                {t('FigurePage.tabs.emotion')}
              </TabsTrigger>
              <TabsTrigger value="rachas">
                <Image
                  src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/racha%2Ffire%20(2)%20(1).gif?alt=media&token=032a6759-bcfd-496a-a349-2f0f30a19448"
                  alt={t('FigurePage.tabs.streaks')}
                  width={16}
                  height={16}
                  unoptimized
                  className="mr-2"
                />
                {t('FigurePage.tabs.streaks')}
              </TabsTrigger>
              <TabsTrigger value="versus">
                <Swords className="mr-2 h-4 w-4" />
                Versus
              </TabsTrigger>
              {isGoatCandidate && (
                <TabsTrigger value="goat">
                  <Trophy className="mr-2 h-4 w-4" />
                  GOAT
                </TabsTrigger>
              )}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          <TabsContent value="wiki" className="mt-4">
              {isEditing ? (
                  <EditInformationForm figure={figure} onFormClose={() => setIsEditing(false)} />
              ) : (
                <Card className="dark:bg-black">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>{t('FigurePage.detailedInfo.title')}</CardTitle>
                                <CardDescription className="text-muted-foreground">{t('FigurePage.detailedInfo.description').replace('{name}', figure.name)}</CardDescription>
                            </div>
                            {user && !user.isAnonymous && (
                              <Button variant="outline" onClick={() => setIsEditing(true)}>
                                  <Pencil className="mr-2 h-4 w-4" /> {t('FigurePage.detailedInfo.editButton')}
                              </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {hasInfo ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                {infoItems.map((item) => {
                                    if (!item.value) return null;
                                    
                                    const countryData = item.label === t('FigurePage.detailedInfo.countryLabel') 
                                        ? countries.find(c => t(`countries.${c.key}`) === item.value) 
                                        : null;

                                    return (
                                        <div key={item.label} className="flex items-start gap-3">
                                            <item.icon className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
                                            <div>
                                                <p className="font-semibold text-sm">{item.label}</p>
                                                {item.label === t('FigurePage.detailedInfo.countryLabel') && countryData ? (
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Image
                                                            src={`https://flagcdn.com/w20/${countryData.code.toLowerCase()}.png`}
                                                            alt={item.value}
                                                            width={20}
                                                            height={15}
                                                            className="object-contain"
                                                        />
                                                        <span>{item.value}</span>
                                                    </div>
                                                ) : item.label === t('FigurePage.detailedInfo.genderLabel') ? (
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
                                {t('FigurePage.detailedInfo.noInfo')}
                            </p>
                        )}

                        {hasSocialLinks && (
                            <>
                                <Separator className="my-6" />
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm flex items-center gap-2">
                                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                                        {t('FigurePage.detailedInfo.socialMediaTitle')}
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
          <TabsContent value="reseñas" className="mt-4 space-y-8">
            <CommunityRatings figure={figure} />
            <CommentSection figureId={figure.id} figureName={figure.name} sortPreference={commentSortPreference} />
          </TabsContent>
          <TabsContent value="emocion" className="mt-4">
            <Card className="dark:bg-black">
              <CardContent className="p-6">
                 <EmotionVoting figure={figure} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="rachas" className="mt-4">
            <TopStreaks figure={figure} />
          </TabsContent>
          <TabsContent value="versus" className="mt-4">
            <FigureVersus figure={figure} />
          </TabsContent>
          {isGoatCandidate && (
            <TabsContent value="goat" className="mt-4">
                <GoatBattle />
            </TabsContent>
          )}
        </Tabs>
      </div>
      
       <div className="mt-8">
        <RelatedFigures figure={figure} />
      </div>
    </div>
  );
}

export default function FigureDetailClient({ figureId }: { figureId: string }) {
  return (
    <Suspense fallback={<FigureDetailSkeleton />}>
      <FigureDetailContent figureId={figureId} />
    </Suspense>
  );
}
