
'use client';

import { useState, useMemo, useContext } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useAdmin } from '@/firebase';
import { collection, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, Trophy, HelpCircle, Heart, ShieldCheck, Shield, Loader2 } from 'lucide-react';
import { Streak, Figure } from '@/lib/types';
import { cn, formatCompactNumber } from '@/lib/utils';
import Image from 'next/image';
import { countries } from '@/lib/countries';
import Link from 'next/link';
import { isDateActive } from '@/lib/streaks';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';

const attitudeStyles: Record<AttitudeOption, { text: string; color: string }> = {
    fan: { text: 'Fan', color: 'text-yellow-400' },
    hater: { text: 'Hater', color: 'text-red-500' },
    simp: { text: 'Simp', color: 'text-pink-400' },
    neutral: { text: 'Espectador', color: 'text-gray-500' },
};


interface TopStreaksProps {
    figure: Figure;
}

const getTrophyColor = (rank: number) => {
    if (rank === 0) return 'text-yellow-400';
    if (rank === 1) return 'text-gray-400';
    if (rank === 2) return 'text-yellow-600';
    return 'text-muted-foreground';
};

const StreakItemSkeleton = () => (
    <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
            </div>
        </div>
        <Skeleton className="h-6 w-12 rounded-md" />
    </div>
);

export default function TopStreaks({ figure }: TopStreaksProps) {
    const firestore = useFirestore();
    const { t } = useLanguage();
    const { isAdmin } = useAdmin();
    const { toast } = useToast();
    const { theme } = useTheme();
    const [visibleCount, setVisibleCount] = useState(10);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const streaksQuery = useMemoFirebase(() => {
        if (!firestore || !figure.id) return null;
        return query(
            collection(firestore, `figures/${figure.id}/streaks`),
            orderBy('currentStreak', 'desc')
        );
    }, [firestore, figure.id]);

    const { data: allStreaks, isLoading } = useCollection<Streak>(streaksQuery, { realtime: true });

    const activeStreaks = useMemo(() => {
        if (!allStreaks) return [];
        return allStreaks.filter(streak => streak.isProtected || isDateActive(streak.lastCommentDate));
    }, [allStreaks]);

    const visibleStreaks = useMemo(() => activeStreaks.slice(0, visibleCount), [activeStreaks, visibleCount]);

    const handleToggleProtection = async (streak: Streak) => {
        if (!firestore || !isAdmin) return;
        
        // Identificar el ID del usuario correctamente (ya sea de la propiedad o del ID del doc)
        const targetUserId = streak.userId || streak.id;
        setIsUpdating(targetUserId);
        
        const newStatus = !streak.isProtected;
        const updateData = { isProtected: newStatus };

        const privateRef = doc(firestore, `users/${targetUserId}/streaks`, figure.id);
        const publicRef = doc(firestore, `figures/${figure.id}/streaks`, targetUserId);

        try {
            // Usamos setDoc con merge en lugar de update para evitar errores si el documento no existe
            // y seguimos el patrón de capturar errores para el emisor global.
            
            const p1 = setDoc(privateRef, updateData, { merge: true }).catch(async (err) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: privateRef.path,
                    operation: 'update',
                    requestResourceData: updateData,
                }));
                throw err;
            });

            const p2 = setDoc(publicRef, updateData, { merge: true }).catch(async (err) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: publicRef.path,
                    operation: 'update',
                    requestResourceData: updateData,
                }));
                throw err;
            });

            await Promise.all([p1, p2]);

            toast({ 
                title: newStatus ? "Racha protegida" : "Protección removida",
                description: `El usuario ${streak.userDisplayName} ahora ${newStatus ? 'tiene' : 'ya no tiene'} racha inmortal.`
            });
        } catch (err) {
            console.error("Error al actualizar protección:", err);
            // El emisor de errores ya se encargó de lanzar la pantalla de debug si fue un error de permisos
        } finally {
            setIsUpdating(null);
        }
    };

    return (
        <Card className={cn((theme === 'dark' || theme === 'army') && 'bg-black')}>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            {t('TopStreaks.title')}
                            <span className="text-sm font-normal text-muted-foreground">({formatCompactNumber(activeStreaks.length)})</span>
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">{t('TopStreaks.description')}</CardDescription>
                    </div>
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Flame className="text-orange-500" />
                                    ¿Cómo se Gana una Racha de Lealtad?
                                </DialogTitle>
                                <DialogDescription className="pt-2 text-left">
                                   Para ganar y mantener tu racha, realiza cualquiera de las siguientes acciones en días consecutivos. Si dejas pasar un día completo, tu racha se reinicia.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-2 text-sm">
                                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                                    <li><strong>Comentar o Responder:</strong> Tu opinión escrita es clave para iniciar o continuar una racha.</li>
                                    <li><strong>Votar en Comentarios:</strong> Dar "Me gusta" o "No me gusta" también cuenta para mantener tu racha activa.</li>
                                    <li><strong>Compartir Perfiles:</strong> Difunde la conversación y mantén tu racha.</li>
                                </ul>
                                <p className="pt-4 font-semibold text-foreground">
                                    ¡Mantén viva la conversación y demuestra tu lealtad (o tu crítica constante)!
                                </p>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => <StreakItemSkeleton key={i} />)}
                    </div>
                ) : activeStreaks.length > 0 ? (
                    <div className="space-y-1">
                        {visibleStreaks.map((streak, index) => {
                             const countryData = streak.userCountry ? countries.find(c => c.key === streak.userCountry.toLowerCase().replace(/ /g, '_')) : null;
                             const attitudeStyle = streak.attitude ? attitudeStyles[streak.attitude as AttitudeOption] : null;
                            return (
                                <div key={streak.userId || streak.id} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <Trophy className={cn("h-5 w-5", getTrophyColor(index))} />
                                        <Link href={`/u/${streak.userDisplayName}`} className="flex items-center gap-3 group">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={streak.userPhotoURL ?? undefined} alt={streak.userDisplayName} />
                                                <AvatarFallback>{streak.userDisplayName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-sm group-hover:underline flex items-center gap-1.5">
                                                        {streak.userDisplayName}
                                                        {streak.isProtected && <ShieldCheck className="h-3 w-3 text-yellow-500 fill-yellow-500/20" />}
                                                    </p>
                                                    {streak.userGender === 'Masculino' && <span className="text-blue-400 font-bold" title="Masculino">♂</span>}
                                                    {streak.userGender === 'Femenino' && <span className="text-pink-400 font-bold" title="Femenino">♀</span>}
                                                    {countryData && (
                                                        <Image
                                                            src={`https://flagcdn.com/w20/${countryData.code.toLowerCase()}.png`}
                                                            alt={countryData ? t(`countries.${countryData.key}`) : `Bandera de ${countryData?.code}`}
                                                            width={20}
                                                            height={15}
                                                            className="object-contain"
                                                            title={countryData ? t(`countries.${countryData.key}`) : countryData?.code}
                                                        />
                                                    )}
                                                </div>
                                                {attitudeStyle && (
                                                    <p className={cn("text-xs font-bold", attitudeStyle.color)}>{attitudeStyle.text}</p>
                                                )}
                                            </div>
                                        </Link>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 font-bold text-lg">
                                            <div className="flex items-center gap-1 text-orange-500">
                                                <span>{streak.currentStreak}</span>
                                                <Image
                                                    src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/racha%2Ffire.gif?alt=media&token=c6eefbb1-b51c-48a4-ae20-7ca8bef2cf63"
                                                    alt="Streak flame"
                                                    width={24}
                                                    height={24}
                                                    unoptimized
                                                />
                                            </div>
                                            {typeof streak.lives === 'number' && streak.lives > 0 && (
                                                <div className="flex items-center gap-1 text-red-500" title={`${streak.lives} vidas restantes`}>
                                                    <Heart className="h-4 w-4 fill-current" />
                                                    <span className="text-base">{streak.lives}</span>
                                                </div>
                                            )}
                                        </div>
                                        {isAdmin && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className={cn("h-8 w-8", streak.isProtected ? "text-yellow-500" : "text-muted-foreground")}
                                                onClick={() => handleToggleProtection(streak)}
                                                disabled={isUpdating === (streak.userId || streak.id)}
                                            >
                                                {isUpdating === (streak.userId || streak.id) ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : streak.isProtected ? (
                                                    <ShieldCheck className="h-4 w-4 fill-yellow-500/10" />
                                                ) : (
                                                    <Shield className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {activeStreaks.length > visibleCount && (
                            <div className="pt-4 flex justify-center">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setVisibleCount(prev => prev + 10)}
                                    className="w-full sm:w-auto"
                                >
                                    Ver más rachas
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-6">
                        {t('TopStreaks.noStreaks')}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
