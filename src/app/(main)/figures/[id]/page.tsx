import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  getFigureById,
  getEmotionVotesByFigureId,
  getRelatedFigures,
} from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Globe, Heart, ThumbsDown, Meh, UserCheck, MessageSquareWarning } from 'lucide-react';
import { Twitter, Instagram } from 'lucide-react';
import { StarRating } from '@/components/shared/star-rating';
import { Separator } from '@/components/ui/separator';
import EmotionChart from '@/components/figure/emotion-chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CommentSection from '@/components/figure/comment-section';
import FigureCard from '@/components/shared/figure-card';
import TopStreaks from '@/components/figure/top-streaks';

export default async function FigureDetailPage({ params }: { params: { id: string } }) {
  const figure = await getFigureById(params.id);
  if (!figure) {
    notFound();
  }

  const emotionVotes = await getEmotionVotesByFigureId(params.id);
  const relatedFigures = await getRelatedFigures(params.id);

  const totalRatings = Object.values(figure.ratings).reduce((a, b) => a + b, 0);
  const averageRating =
    totalRatings > 0
      ? Object.entries(figure.ratings).reduce(
          (acc, [key, value]) => acc + parseInt(key, 10) * value,
          0
        ) / totalRatings
      : 0;

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[400px] md:h-[500px] w-full">
        <Image
          src={figure.imageUrl}
          alt={figure.name}
          fill
          className="object-cover"
          priority
          data-ai-hint={figure.imageHint}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="container mx-auto px-4 absolute bottom-0 left-0 right-0 pb-8">
          <div className="flex flex-col md:flex-row md:items-end md:gap-6">
            <div className="relative -mt-24 md:mt-0 w-40 h-40 md:w-48 md:h-48 rounded-lg overflow-hidden shadow-2xl border-4 border-card shrink-0">
               <Image src={figure.imageUrl} alt={figure.name} fill className="object-cover" data-ai-hint={figure.imageHint}/>
            </div>
            <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-headline mt-4">{figure.name}</h1>
                <div className="flex items-center gap-4 mt-2">
                    <p className="text-lg text-muted-foreground">{figure.nationality}</p>
                    <div className="flex items-center gap-2">
                        {figure.socials.twitter && <a href={`https://twitter.com/${figure.socials.twitter}`} target="_blank" rel="noopener noreferrer"><Twitter className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" /></a>}
                        {figure.socials.instagram && <a href={`https://instagram.com/${figure.socials.instagram}`} target="_blank" rel="noopener noreferrer"><Instagram className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" /></a>}
                        {figure.socials.website && <a href={`https://${figure.socials.website}`} target="_blank" rel="noopener noreferrer"><Globe className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" /></a>}
                    </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="streaks">Streaks</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Bio Card */}
                    <Card>
                        <CardHeader><CardTitle>Biography</CardTitle></CardHeader>
                        <CardContent><p className="text-foreground/90 leading-relaxed">{figure.bio}</p></CardContent>
                    </Card>

                    {/* Attitude Voting - Maintenance */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">Attitude Voting <Badge variant="destructive">Under Maintenance</Badge></CardTitle>
                            <CardDescription>How do you feel about this figure?</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-4">
                            <Button variant="outline" size="lg" className="flex-1" disabled><Heart className="mr-2 h-4 w-4"/> Fan</Button>
                            <Button variant="outline" size="lg" className="flex-1" disabled><Meh className="mr-2 h-4 w-4"/> Neutral</Button>
                            <Button variant="outline" size="lg" className="flex-1" disabled><UserCheck className="mr-2 h-4 w-4"/> Simp</Button>
                            <Button variant="outline" size="lg" className="flex-1" disabled><ThumbsDown className="mr-2 h-4 w-4"/> Hater</Button>
                        </CardContent>
                    </Card>

                     {/* Related Profiles */}
                    <Card>
                        <CardHeader><CardTitle>Related Profiles</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {relatedFigures.map(related => <FigureCard key={related.id} figure={related} />)}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    {/* Ratings Summary */}
                    <Card>
                        <CardHeader><CardTitle>Ratings Summary</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <StarRating rating={averageRating} starClassName="w-6 h-6"/>
                                <span className="font-bold text-2xl">{averageRating.toFixed(1)}</span>
                                <span className="text-muted-foreground">({totalRatings} ratings)</span>
                            </div>
                            <Separator />
                            <div className="space-y-1 text-sm">
                                {Object.entries(figure.ratings).reverse().map(([star, count]) => (
                                    <div key={star} className="flex items-center gap-2">
                                        <span className="w-12 text-muted-foreground">{star} stars</span>
                                        <div className="flex-1 bg-muted rounded-full h-2">
                                            <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${(count / totalRatings) * 100}%` }} />
                                        </div>
                                        <span className="w-10 text-right text-muted-foreground">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* Emotion Chart */}
                    <EmotionChart data={emotionVotes} />
                </div>
            </div>
          </TabsContent>

          <TabsContent value="comments">
             <CommentSection figureId={params.id} />
          </TabsContent>
          <TabsContent value="streaks">
             <TopStreaks figureId={params.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
