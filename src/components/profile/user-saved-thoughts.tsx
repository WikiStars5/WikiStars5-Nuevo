
'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, getDoc, limit, onSnapshot } from 'firebase/firestore';
import type { Thought, ThoughtReference } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Bookmark } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { ThoughtDisplay } from '@/components/figure/thoughts-section';
import { cn } from '@/lib/utils';
import ReplyForm from '@/components/figure/reply-form';

interface UserSavedThoughtsProps {
    userId: string;
}

function SavedThoughtCardWrapper({ refData, onDeleteSuccess }: { refData: ThoughtReference, onDeleteSuccess: () => void }) {
    const firestore = useFirestore();
    const { theme } = useTheme();
    const [thought, setThought] = useState<Thought | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Reply states
    const [isReplying, setIsReplying] = useState(false);
    const [replyTo, setReplyTo] = useState<Thought | null>(null);
    const [replies, setReplies] = useState<Thought[]>([]);
    const [showReplies, setShowReplies] = useState(false);
    const [isLoadingReplies, setIsLoadingReplies] = useState(false);
    const [visibleRepliesCount, setVisibleRepliesCount] = useState(5);

    useEffect(() => {
        const fetchThought = async () => {
            if (!firestore || !refData.figureId || !refData.thoughtId) return;
            try {
                const thoughtDocRef = doc(firestore, 'figures', refData.figureId, 'thoughts', refData.thoughtId);
                const snap = await getDoc(thoughtDocRef);
                if (snap.exists()) {
                    setThought({ id: snap.id, ...snap.data() } as Thought);
                } else {
                    // Si el pensamiento original fue borrado, la referencia debería limpiarse o ignorarse
                    setThought(null);
                }
            } catch (error) {
                console.error("Error fetching saved thought:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchThought();
    }, [firestore, refData]);

    useEffect(() => {
        if (!showReplies || !firestore || !thought) return;
        setIsLoadingReplies(true);
        const q = query(
            collection(firestore, 'figures', thought.figureId, 'thoughts', thought.id, 'replies'),
            orderBy('createdAt', 'asc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setReplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Thought)));
            setIsLoadingReplies(false);
        }, (error) => {
            console.error(error);
            setIsLoadingReplies(false);
        });
        return () => unsubscribe();
    }, [showReplies, firestore, thought]);

    if (isLoading) return <Skeleton className="h-32 w-full rounded-xl mb-4" />;
    if (!thought) return null;

    const handleReplyClick = (target: Thought) => {
        setReplyTo(target);
        setIsReplying(true);
    };

    return (
        <Card className={cn("hover:border-primary/50 transition-all group mb-4 overflow-hidden", (theme === 'dark' || theme === 'army') && "bg-black")}>
            <CardContent className="p-4 space-y-4">
                <ThoughtDisplay 
                    thought={thought} 
                    figureId={thought.figureId} 
                    figureName={thought.figureName} 
                    onDeleteSuccess={onDeleteSuccess}
                    onReplyClick={handleReplyClick}
                />

                <div className="mt-2 pt-2 border-t flex flex-wrap gap-4 justify-between items-center">
                    <p className="text-[10px] text-muted-foreground">
                        Guardado de <Link href={`/figures/${thought.figureId}`} className="text-primary hover:underline font-black uppercase tracking-widest">{thought.figureName}</Link>
                    </p>
                    
                    {Number(thought.replyCount) > 0 && (
                        <Button 
                            variant="link" 
                            size="sm" 
                            className="text-[10px] p-0 h-auto font-black uppercase tracking-widest text-primary" 
                            onClick={() => {
                                setShowReplies(!showReplies);
                                if (!showReplies) setVisibleRepliesCount(5);
                            }}
                        >
                            {showReplies 
                                ? 'Ocultar respuestas' 
                                : `Ver ${thought.replyCount} ${thought.replyCount === 1 ? 'respuesta' : 'respuestas'}`}
                        </Button>
                    )}
                </div>

                {isReplying && (
                    <div className="mt-4 pt-4 border-t">
                        <ReplyForm 
                            figureId={thought.figureId} 
                            figureName={thought.figureName} 
                            parentComment={{ id: thought.id, ...thought } as any} 
                            replyToComment={{ id: replyTo?.id || thought.id, userDisplayName: replyTo?.userDisplayName || thought.userDisplayName } as any} 
                            onReplySuccess={() => {
                                setIsReplying(false);
                                setShowReplies(true);
                            }}
                            parentCollection="thoughts"
                        />
                    </div>
                )}

                {showReplies && (
                    <div className="mt-4 space-y-6 pl-4 border-l-2">
                        {isLoadingReplies ? <Skeleton className="h-10 w-full" /> : 
                            replies.slice(0, visibleRepliesCount).map(reply => (
                                <ThoughtDisplay 
                                    key={reply.id}
                                    thought={{ ...reply, parentId: thought.id }}
                                    figureId={thought.figureId}
                                    figureName={thought.figureName}
                                    isReply={true}
                                    onDeleteSuccess={(id) => setReplies(prev => prev.filter(r => r.id !== id))}
                                    onReplyClick={handleReplyClick}
                                />
                            ))
                        }
                        
                        {!isLoadingReplies && replies.length > visibleRepliesCount && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-xs text-primary font-bold hover:bg-primary/5 h-8 w-full justify-start"
                                onClick={() => setVisibleRepliesCount(prev => prev + 5)}
                            >
                                Ver más respuestas...
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function UserSavedThoughts({ userId }: UserSavedThoughtsProps) {
    const firestore = useFirestore();

    const savedQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return query(collection(firestore, 'users', userId, 'saved_thoughts'), orderBy('createdAt', 'desc'), limit(50));
    }, [firestore, userId]);

    const { data: references, isLoading: isLoadingReferences } = useCollection<ThoughtReference>(savedQuery);

    if (isLoadingReferences) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
            </div>
        );
    }

    if (!references || references.length === 0) {
        return (
            <div className="text-center py-16 border-2 border-dashed rounded-xl">
                <Bookmark className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <h3 className="mt-2 text-md font-semibold">No tienes pensamientos guardados</h3>
                <p className="text-sm text-muted-foreground">¡Guarda pensamientos interesantes para leerlos después!</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {references.map(ref => (
                <SavedThoughtCardWrapper 
                    key={ref.thoughtId} 
                    refData={ref} 
                    onDeleteSuccess={() => { /* Handled by realtime listeners */ }} 
                />
            ))}
        </div>
    );
}
