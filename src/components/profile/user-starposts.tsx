'use client';

import { useEffect, useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, getDoc, Timestamp } from 'firebase/firestore';
import type { Comment, StarPostReference } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessagesSquare } from 'lucide-react';

interface UserStarPostsProps {
    userId: string;
}

export default function UserStarPosts({ userId }: UserStarPostsProps) {
    const firestore = useFirestore();
    const [starposts, setStarposts] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const referencesQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return query(collection(firestore, 'users', userId, 'starposts'), orderBy('createdAt', 'desc'));
    }, [firestore, userId]);

    const { data: references, isLoading: isLoadingReferences } = useCollection<StarPostReference>(referencesQuery);

    useEffect(() => {
        if (isLoadingReferences) {
            setIsLoading(true);
            return;
        }

        if (!references || references.length === 0 || !firestore) {
            setStarposts([]);
            setIsLoading(false);
            return;
        }

        const fetchPosts = async () => {
            setIsLoading(true);
            try {
                const postPromises = references.map(ref => {
                    if (ref.figureId && ref.commentId) {
                        const postDocRef = doc(firestore, 'figures', ref.figureId, 'comments', ref.commentId);
                        return getDoc(postDocRef);
                    }
                    return Promise.resolve(null);
                });

                const postSnapshots = await Promise.all(postPromises);

                const fetchedPosts = postSnapshots
                    .filter((snap): snap is import('firebase/firestore').DocumentSnapshot<import('firebase/firestore').DocumentData> => snap !== null && snap.exists())
                    .map(snap => ({ id: snap.id, ...snap.data() } as Comment));
                
                setStarposts(fetchedPosts);

            } catch (error) {
                console.error("Error fetching starposts from references:", error);
                setStarposts([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPosts();

    }, [references, isLoadingReferences, firestore]);
    
    const handlePostDeleted = (deletedPostId: string) => {
        setStarposts(prevPosts => prevPosts.filter(post => post.id !== deletedPostId));
    };

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
                <StarPostCard key={post.id} post={post} onDeleteSuccess={() => handlePostDeleted(post.id)} />
            ))}
        </div>
    );
}
