
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Lightbulb,
  MessageSquare,
  Share2,
  Users,
} from 'lucide-react';
import SearchBar from '@/components/shared/search-bar';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';


export const dynamic = 'force-dynamic';

export default function HomePage() {
  const { t } = useLanguage();

  const features = [
    {
      icon: Lightbulb,
      title: t('HomePage.features.discover.title'),
      description: t('HomePage.features.discover.description'),
    },
    {
      icon: Users,
      title: t('HomePage.features.express.title'),
      description: t('HomePage.features.express.description'),
    },
    {
      icon: MessageSquare,
      title: t('HomePage.features.discuss.title'),
      description: t('HomePage.features.discuss.description'),
    },
    {
      icon: Share2,
      title: t('HomePage.features.share.title'),
      description: t('HomePage.features.share.description'),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <section className="text-center mb-16 md:mb-24">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 font-headline">
          {t('HomePage.welcome.title.part1')} <span className="text-primary">{t('HomePage.welcome.title.part2')}</span>
        </h1>
        <div className="mt-8">
          <SearchBar className="max-w-lg mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">
            {t('HomePage.welcome.searchHint')}
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-bold tracking-tight mb-8 font-headline text-center">
          {t('HomePage.howItWorks.title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-card/80 border-border/60 text-center">
              <CardHeader>
                <div className="mx-auto bg-card p-3 rounded-full w-fit">
                    <feature.icon className="h-8 w-8 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-start gap-2">
                <CardTitle className='text-lg'>{feature.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      
      <section className="mt-16 md:mt-24">
        <Alert className="border-primary/50 bg-primary/10">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">{t('HomePage.betaAlert.title')}</AlertTitle>
          <AlertDescription className="text-primary/90">
              {t('HomePage.betaAlert.description')}
          </AlertDescription>
        </Alert>
      </section>

    </div>
  );
}
