'use client';

import * as React from 'react';
import type { Figure } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StarRating } from '@/components/shared/star-rating';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList } from 'recharts';
import { Star } from 'lucide-react';


interface CommunityRatingsProps {
    figure: Figure;
}

const RatingRow = ({ stars, count, total }: { stars: number; count: number; total: number; }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    
    return (
        <div className="flex items-center gap-2 text-sm">
            <div className="flex w-10 items-center justify-end gap-1 text-muted-foreground">
                <span>{stars}</span>
                <Star className="h-3 w-3" />
            </div>
            <div className="h-2 flex-1 rounded-full bg-muted">
                <div className="h-full rounded-full bg-yellow-400" style={{ width: `${percentage}%` }} />
            </div>
            <div className="w-8 text-right text-muted-foreground">{count}</div>
        </div>
    );
};


export default function CommunityRatings({ figure }: CommunityRatingsProps) {
    const { ratingsBreakdown } = figure;

    const { totalVotes, averageRating } = React.useMemo(() => {
        if (!ratingsBreakdown) {
            return { totalVotes: 0, averageRating: 0 };
        }

        const total = Object.values(ratingsBreakdown).reduce((sum, count) => sum + count, 0);

        if (total === 0) {
            return { totalVotes: 0, averageRating: 0 };
        }

        const weightedSum = (Object.keys(ratingsBreakdown) as (keyof typeof ratingsBreakdown)[])
            .reduce((sum, ratingKey) => {
                const rating = parseInt(ratingKey.toString(), 10);
                const count = ratingsBreakdown[ratingKey];
                return sum + (rating * count);
            }, 0);
            
        return { totalVotes: total, averageRating: weightedSum / total };
    }, [ratingsBreakdown]);

    const allRatings = [5, 4, 3, 2, 1, 0];
        
    return (
        <Card className="bg-black">
            <CardHeader>
                <CardTitle>Calificaciones de la Comunidad</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col items-center justify-center space-y-1 rounded-lg border p-6">
                        <div className="text-5xl font-bold tracking-tighter">
                            {averageRating.toFixed(1)}
                        </div>
                        <StarRating rating={averageRating} starClassName="h-5 w-5" />
                        <div className="text-sm text-muted-foreground">
                            {totalVotes} {totalVotes === 1 ? 'calificación' : 'calificaciones'}
                        </div>
                    </div>
                    <div className="md:col-span-2 flex flex-col justify-center space-y-2">
                        {allRatings.map(starValue => (
                            <RatingRow
                                key={starValue}
                                stars={starValue}
                                count={ratingsBreakdown?.[starValue as keyof typeof ratingsBreakdown] ?? 0}
                                total={totalVotes}
                            />
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
