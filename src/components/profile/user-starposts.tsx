'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Comment } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessagesSquare } from 'lucide-react';

interface UserStarPostsProps {
    userId: string;
}

export default function UserStarPosts({ userId }: UserStarPostsProps) {
    const firestore = useFirestore();

    const starpostsQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return query(collection(firestore, 'users', userId, 'starposts'), orderBy('createdAt', 'desc'));
    }, [firestore, userId]);

    const { data: starposts, isLoading } = useCollection<Comment>(starpostsQuery);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
            </div>
        );
    }

    if (!starposts || starposts.length === 0) {
        return (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <MessagesSquare className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <h3 className="mt-2 text-md font-semibold">Aún no has publicado ningún StarPost</h3>
                <p className="mt-1 text-sm text-muted-foreground">¡Deja tu opinión en el perfil de una figura para empezar!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {starposts.map(post => (
                <StarPostCard key={post.id} post={post} />
            ))}
        </div>
    );
}
