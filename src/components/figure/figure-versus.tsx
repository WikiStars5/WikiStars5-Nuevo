
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Figure } from '@/lib/types';
import { cn } from '@/lib/utils';
import FigureSearchInput from './figure-search-input';
import { Swords } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

type AttitudeMetric = 'fan' | 'hater' | 'simp' | 'neutral';

const METRIC_LABELS: Record<AttitudeMetric, string> = {
    fan: 'Fans',
    hater: 'Haters',
    simp: 'Simps',
    neutral: 'Espectadores',
};

interface FigureVersusProps {
    figure: Figure;
}

export default function FigureVersus({ figure }: FigureVersusProps) {
    const [rival, setRival] = useState<Figure | null>(null);
    const [metric, setMetric] = useState<AttitudeMetric>('fan');

    const handleRivalSelect = (selectedRival: Figure) => {
        if (selectedRival.id === figure.id) return;
        setRival(selectedRival);
    };

    const currentFigureVotes = figure.attitude?.[metric] ?? 0;
    const rivalVotes = rival?.attitude?.[metric] ?? 0;
    const totalVotes = currentFigureVotes + rivalVotes;

    const currentFigurePercentage = totalVotes > 0 ? (currentFigureVotes / totalVotes) * 100 : 50;
    // The balance should rotate between -10 and 10 degrees. (50% is 0deg, 0% is -10deg, 100% is 10deg)
    const balanceRotation = totalVotes > 0 ? (currentFigurePercentage - 50) / 5 : 0;

    return (
        <Card className="dark:bg-black">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Swords /> Versus</CardTitle>
                <CardDescription>Compara las estadísticas de actitud de este perfil contra otro.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h3 className="font-semibold text-sm mb-2">Elige un Rival</h3>
                        <FigureSearchInput onFigureSelect={handleRivalSelect} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm mb-2">Métrica a Comparar</h3>
                         <Select value={metric} onValueChange={(v: AttitudeMetric) => setMetric(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(METRIC_LABELS).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {!rival ? (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground">
                        <p>Busca y selecciona un perfil para iniciar la comparación.</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-8 pt-8">
                         <div className="relative w-full max-w-md h-48">
                            <div
                                className="absolute top-1/2 left-0 w-full h-1.5 bg-muted rounded-full transition-transform duration-500"
                                style={{ transform: `translateY(-50%) rotate(${balanceRotation}deg)` }}
                            >
                                <div className="absolute -left-8 -top-12 flex flex-col items-center text-center">
                                    <div className="relative h-20 w-20 rounded-full border-4 border-primary overflow-hidden shadow-lg">
                                        <Image src={figure.imageUrl} alt={figure.name} layout="fill" objectFit="cover" />
                                    </div>
                                </div>
                                <div className="absolute -right-8 -top-12 flex flex-col items-center text-center">
                                    <div className="relative h-20 w-20 rounded-full border-4 border-secondary overflow-hidden shadow-lg">
                                        <Image src={rival.imageUrl} alt={rival.name} layout="fill" objectFit="cover" />
                                    </div>
                                </div>
                            </div>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[40px] border-l-transparent border-r-[40px] border-r-transparent border-b-[60px] border-b-muted"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 w-full max-w-2xl text-center">
                            <div className="space-y-1">
                                <h4 className="font-bold text-lg truncate">{figure.name}</h4>
                                <p className="text-3xl font-extrabold text-primary">{currentFigureVotes.toLocaleString()}</p>
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-bold text-lg truncate">{rival.name}</h4>
                                <p className="text-3xl font-extrabold text-secondary-foreground">{rivalVotes.toLocaleString()}</p>
                            </div>
                            <p className="col-span-2 text-muted-foreground font-semibold text-lg -mt-2">
                                {METRIC_LABELS[metric]}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
