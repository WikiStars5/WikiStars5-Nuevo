'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, getDoc, limit } from 'firebase/firestore';
import type { Comment, StarPostReference } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';
import StarPostCard from '@/components/shared/starpost-card';

interface UserSavedStarPostsProps {
    userId: string;
}

function SavedStarPostWrapper({ refData }: { refData: any }) {
    const firestore = useFirestore();
    const [post, setPost] = useState<Comment | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPost = async () => {
            if (!firestore || !refData.figureId || !refData.commentId) return;
            try {
                const docRef = doc(firestore, 'figures', refData.figureId, 'comments', refData.commentId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setPost({ id: snap.id, ...snap.data() } as Comment);
                }
            } catch (error) {
                console.error("Error fetching saved starpost:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPost();
    }, [firestore, refData]);

    if (isLoading) return <Skeleton className="h-32 w-full rounded-xl mb-4" />;
    if (!post) return null;

    return <StarPostCard post={post} showTimestamp={true} />;
}

export default function UserSavedStarPosts({ userId }: UserSavedStarPostsProps) {
    const firestore = useFirestore();

    const savedQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return query(collection(firestore, 'users', userId, 'saved_starposts'), orderBy('createdAt', 'desc'), limit(50));
    }, [firestore, userId]);

    const { data: references, isLoading } = useCollection(savedQuery);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
            </div>
        );
    }

    if (!references || references.length === 0) {
        return (
            <div className="text-center py-16 border-2 border-dashed rounded-xl">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <h3 className="mt-2 text-md font-semibold">No tienes reseñas guardadas</h3>
                <p className="text-sm text-muted-foreground">¡Guarda las reseñas más interesantes!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {references.map(ref => (
                <SavedStarPostWrapper key={ref.id} refData={ref} />
            ))}
        </div>
    );
}
