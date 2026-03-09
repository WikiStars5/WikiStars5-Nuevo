'use client';

import { useState, Suspense, useCallback, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type { Figure, Achievement } from '@/lib/types';
import ProfileHeader from '@/components/figure/ProfileHeader';
import EmotionVoting from '@/components/figure/emotion-voting';
import EditInformationForm from '@/components/figure/edit-information-form';
import CommentSection from '@/components/figure/comment-section';
import { Button } from '@/components/ui/button';
import { Pencil, User, Users, Briefcase, Globe, Heart, CalendarDays, Ruler, Link as LinkIcon, Trophy, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import CommunityRatings from '@/components/figure/community-ratings';
import RelatedFigures from '@/components/figure/related-figures';
import TopStreaks from '@/components/streaks/top-streaks';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import BtsBiasVoting from '@/components/figure/bts-bias-voting';
import BlackpinkBiasVoting from '@/components/figure/blackpink-bias-voting';

type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';

const SOCIAL_MEDIA_CONFIG: Record<string, { label: string }> = {
    website: { label: 'Web' },
    instagram: { label: 'Instagram' },
    twitter: { label: 'X' },
    youtube: { label: 'YouTube' },
    facebook: { label: 'Facebook' },
    tiktok: { label: 'TikTok' },
    linkedin: { label: 'LinkedIn' },
    wikipedia: { label: 'Wikipedia' },
};

const SocialLink = ({ platform, url }: { platform: string; url: string }) => {
    try {
        const domain = new URL(url).hostname;
        const config = SOCIAL_MEDIA_CONFIG[platform] || { label: platform };
        return (
            <Link href={url} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-2">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border bg-muted transition-all group-hover:border-primary group-hover:bg-primary/10">
                    <Image
                        src={`https://www.google.com/s2/favicons?sz=64&domain_url=${domain}`}
                        alt={config.label}
                        width={24} height={24}
                        className="h-6 w-6 object-contain"
                    />
                </div>
                <span className="text-[10px] font-medium">{config.label}</span>
            </Link>
        );
    } catch (e) { return null; }
};

function FigureDetailSkeleton() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Skeleton className="h-[250px] md:h-[320px] w-full rounded-lg mb-6" />
      <Skeleton className="h-10 w-full mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

const formatDate = (dateString?: string): string | null => {
    if (!dateString) return null;
    if (dateString.startsWith('-')) return `Año ${dateString.substring(1)} a. C.`;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
};

function FigureDetailContent({ figureId, initialFigure }: { figureId: string, initialFigure: Figure | null }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const { t } = useLanguage();
  const { theme } = useTheme();

  const figureDocRef = useMemoFirebase(() => (!firestore || !figureId) ? null : doc(firestore, 'figures', figureId), [firestore, figureId]);
  
  const { data: fetchedFigure } = useDoc<Figure>(figureDocRef);
  const figure = fetchedFigure || initialFigure;

  const achievementRef = useMemoFirebase(() => (!firestore || !user) ? null : doc(firestore, `users/${user.uid}/achievements`, figureId), [firestore, user, figureId]);
  const { data: userAchievements } = useDoc<Achievement>(achievementRef);

  const btsMemberIds = ["rm", "kim-seok-jin", "suga-agust-d", "j-hope", "jimin", "v-cantante", "jungkook"];
  const blackpinkMemberIds = ["jennie", "lalisa-manobal", "rose", "jisoo"];
  const isBtsMember = figureId && btsMemberIds.includes(figureId.toLowerCase());
  const isBlackpinkMember = figureId && blackpinkMemberIds.includes(figureId.toLowerCase());

  const activeTab = useMemo(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) return tabParam;
    const shareType = searchParams.get('shareType');
    if (shareType === 'emotion') return 'emocion';
    if (shareType === 'bias-bts') return 'bias-bts';
    if (shareType === 'bias-blackpink') return 'bias-blackpink';
    return isBtsMember ? 'reseñas' : 'wiki';
  }, [searchParams, isBtsMember]);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  if (!figure) return <FigureDetailSkeleton />;

  const getCountryName = (countryKey?: string) => countryKey ? t(`countries.${countryKey.toLowerCase().replace(/ /g, '_')}`) : null;

  const infoItems = [
    { label: t('FigurePage.detailedInfo.nameLabel'), value: figure.name, icon: User },
    { label: t('FigurePage.detailedInfo.genderLabel'), value: figure.gender, icon: Users },
    { label: t('FigurePage.detailedInfo.birthDateLabel'), value: formatDate(figure.birthDate), icon: CalendarDays },
    { label: t('FigurePage.detailedInfo.deathDateLabel'), value: formatDate(figure.deathDate), icon: CalendarDays },
    { label: t('FigurePage.detailedInfo.occupationLabel'), value: figure.occupation, icon: Briefcase },
    { label: t('FigurePage.detailedInfo.countryLabel'), value: getCountryName(figure.nationality), icon: Globe },
    { label: t('FigurePage.detailedInfo.maritalStatusLabel'), value: figure.maritalStatus, icon: Heart },
    { label: t('FigurePage.detailedInfo.heightLabel'), value: figure.height ? `${(figure.height / 100).toFixed(2)} m` : null, icon: Ruler },
  ];

  const hasInfo = infoItems.some(item => !!item.value);
  const hasSocialLinks = figure.socialLinks && Object.values(figure.socialLinks).some(link => !!link);

  return (
    <div className="container mx-auto max-w-4xl px-4 pb-8 md:pb-16">
      <ProfileHeader figure={figure} figureId={figure.id} />

      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className={cn("inline-flex h-auto", (theme === 'dark' || theme === 'army') && 'bg-black')}>
              {isBtsMember ? (
                <>
                  <TabsTrigger value="reseñas"><Star className="mr-2 h-4 w-4" />Reseñas</TabsTrigger>
                  <TabsTrigger value="bias-bts"><Heart className="mr-2 h-4 w-4" />Bias BTS</TabsTrigger>
                  <TabsTrigger value="emocion"><SmileIcon className="mr-2 h-4 w-4" />{t('FigurePage.tabs.emotion')}</TabsTrigger>
                  <TabsTrigger value="rachas"><FlameGifIcon />{t('FigurePage.tabs.streaks')}</TabsTrigger>
                  <TabsTrigger value="logros"><Trophy className="mr-2 h-4 w-4" />Logros</TabsTrigger>
                  <TabsTrigger value="wiki"><InfoIcon className="mr-2 h-4 w-4" />Wiki</TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="wiki"><InfoIcon className="mr-2 h-4 w-4" />Wiki</TabsTrigger>
                  <TabsTrigger value="reseñas"><Star className="mr-2 h-4 w-4" />Reseñas</TabsTrigger>
                  <TabsTrigger value="emocion"><SmileIcon className="mr-2 h-4 w-4" />{t('FigurePage.tabs.emotion')}</TabsTrigger>
                  {isBlackpinkMember && <TabsTrigger value="bias-blackpink"><Heart className="mr-2 h-4 w-4" />Bias Blackpink</TabsTrigger>}
                  <TabsTrigger value="rachas"><FlameGifIcon />{t('FigurePage.tabs.streaks')}</TabsTrigger>
                  <TabsTrigger value="logros"><Trophy className="mr-2 h-4 w-4" />Logros</TabsTrigger>
                </>
              )}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          
          <TabsContent value="wiki" className="mt-4">
              {isEditing ? <EditInformationForm figure={figure} onFormClose={() => setIsEditing(false)} /> : (
                <Card className={cn((theme === 'dark' || theme === 'army') && 'bg-black')}>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>{t('FigurePage.detailedInfo.title')}</CardTitle>
                            <CardDescription className="text-muted-foreground">{t('FigurePage.detailedInfo.description').replace('{name}', figure.name)}</CardDescription>
                        </div>
                        {user && !user.isAnonymous && <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}><Pencil className="mr-2 h-4 w-4" />{t('FigurePage.detailedInfo.editButton')}</Button>}
                    </CardHeader>
                    <CardContent className="p-6">
                        {hasInfo ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                {infoItems.map((item) => item.value && (
                                    <div key={item.label} className="flex items-start gap-3">
                                        <item.icon className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold text-sm">{item.label}</p>
                                            <p className="text-muted-foreground">{item.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-muted-foreground text-center py-4">{t('FigurePage.detailedInfo.noInfo')}</p>}
                        {hasSocialLinks && (
                            <>
                                <Separator className="my-6" />
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm flex items-center gap-2"><LinkIcon className="h-4 w-4 text-muted-foreground" />{t('FigurePage.detailedInfo.socialMediaTitle')}</h3>
                                    <div className="flex flex-wrap gap-4">
                                        {Object.entries(figure.socialLinks || {}).map(([p, u]) => u && <SocialLink key={p} platform={p} url={u} />)}
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
              )}
          </TabsContent>
          <TabsContent value="reseñas" className="mt-4 space-y-8">
            {activeTab === 'reseñas' && (
              <>
                <CommunityRatings figure={figure} />
                <CommentSection figureId={figure.id} figureName={figure.name} sortPreference={null} />
              </>
            )}
          </TabsContent>
          <TabsContent value="emocion" className="mt-4">
            <Card className={cn((theme === 'dark' || theme === 'army') && 'bg-black')}>
              <CardContent className="p-6">
                 {activeTab === 'emocion' && <EmotionVoting figure={figure} />}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="rachas" className="mt-4">
            {activeTab === 'rachas' && <TopStreaks figure={figure} />}
          </TabsContent>
          <TabsContent value="logros" className="mt-4">
            <Card className={cn((theme === 'dark' || theme === 'army') && 'bg-black')}>
              <CardHeader><CardTitle>Logros Desbloqueados</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <div className={cn("flex flex-col items-center text-center gap-2 p-4 border-2 rounded-lg", userAchievements?.achievements?.includes('pioneer_1000') ? "border-primary bg-primary/5" : "border-dashed opacity-40")}>
                        <Image src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/LOGROS%2Fpionero%20(1).png?alt=media&token=6a233ccb-21f7-4b09-a45f-be38e171999d" alt="Pionero" width={64} height={64} />
                        <p className="text-xs font-bold uppercase tracking-tighter">Pionero</p>
                    </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {isBtsMember && <TabsContent value="bias-bts" className="mt-4">{activeTab === 'bias-bts' && <BtsBiasVoting />}</TabsContent>}
          {isBlackpinkMember && <TabsContent value="bias-blackpink" className="mt-4">{activeTab === 'bias-blackpink' && <BlackpinkBiasVoting />}</TabsContent>}
        </Tabs>
      </div>
      <div className="mt-8"><RelatedFigures figure={figure} /></div>
    </div>
  );
}

function SmileIcon({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z" /><path d="M9 10h.01" /><path d="M15 10h.01" /><path d="M9.5 15a3.5 3.5 0 0 0 5 0" /></svg>;
}

function InfoIcon({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0" /><path d="M12 9h.01" /><path d="M11 12h1v4h1" /></svg>;
}

function FlameGifIcon() {
    return <Image src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/racha%2Ffire%20(2)%20(1).gif?alt=media&token=032a6759-bcfd-496a-a349-2f0f30a19448" alt="Streak" width={16} height={16} unoptimized className="mr-2" />;
}

export default function FigureDetailClient({ figureId, initialFigure }: { figureId: string, initialFigure: Figure | null }) {
  return (
    <Suspense fallback={<FigureDetailSkeleton />}>
      <FigureDetailContent figureId={figureId} initialFigure={initialFigure} />
    </Suspense>
  );
}