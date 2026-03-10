'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import type { Comment } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserPlus, ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function FollowingFeedPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [feedPosts, setFeedPosts] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10); 
  const [hasMoreUsers, setHasMoreUsers] = useState(false);

  const followingQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'following');
  }, [user, firestore]);

  const { data: following, isLoading: isLoadingFollowing } = useCollection(followingQuery, { enabled: !!user });

  useEffect(() => {
    const fetchFollowingPosts = async () => {
      // Si aún está cargando la lista de seguidos, no hacemos nada
      if (!firestore || !user || isLoadingFollowing) return;

      // Si la lista de seguidos terminó de cargar y está vacía
      if (!following || following.length === 0) {
        setFeedPosts([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const followedUserIds = following.map(f => f.id).slice(0, visibleCount);
        setHasMoreUsers(following.length > visibleCount);

        const fetchPromises = followedUserIds.map(async (followedId) => {
          const starPostsRef = collection(firestore, 'users', followedId, 'starposts');
          const q = query(starPostsRef, orderBy('createdAt', 'desc'), limit(5));
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
        });

        const results = await Promise.all(fetchPromises);
        const allPosts = results.flat();
        setFeedPosts(shuffleArray(allPosts).slice(0, 20));
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowingPosts();
  }, [firestore, user, following, isLoadingFollowing, visibleCount]);

  // --- PRIORIDAD DE RENDERIZADO ---

  // 1. Cargando sesión o lista inicial
  if (isUserLoading || (isLoadingFollowing && !following)) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold font-headline mb-6 flex items-center gap-2">
            <Users className="text-primary" /> Siguiendo
        </h1>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-xl space-y-3 animate-pulse bg-card/50">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // 2. No hay usuario
  if (!user || user.isAnonymous) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
        <Users className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-bold mb-6">Inicia sesión para ver tu feed</h2>
        <Button asChild><Link href="/login">Iniciar Sesión</Link></Button>
      </div>
    );
  }

  // 3. LOGUEADO PERO NO SIGUE A NADIE (Esta es la que te faltaba)
  if (!isLoadingFollowing && (!following || following.length === 0)) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold font-headline mb-6 flex items-center gap-2">
          <Users className="text-primary" /> Siguiendo
        </h1>
        <div className="text-center py-20 bg-card/40 rounded-3xl border-2 border-dashed border-muted-foreground/20 px-6">
          <UserPlus className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
          <h2 className="text-xl font-bold mb-2">Tu feed está vacío</h2>
          <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
            Sigue a otros usuarios para ver sus publicaciones aquí.
          </p>
          <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/20">
            <Link href="/figures">Explorar Usuarios</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 4. Feed con contenido
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold font-headline mb-6 flex items-center gap-2">
        <Users className="text-primary" /> Siguiendo
      </h1>

      {feedPosts.length > 0 ? (
        <div className="space-y-6">
          {feedPosts.map((post) => (
            <StarPostCard key={post.id} post={post} />
          ))}
          {hasMoreUsers && (
            <div className="flex justify-center pt-4">
              <Button onClick={() => setVisibleCount(v => v + 10)} variant="ghost" className="gap-2">
                Ver más <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-card/40 rounded-2xl border border-dashed">
          <Sparkles className="mx-auto h-12 w-12 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground">Tus amigos aún no han publicado nada.</p>
        </div>
      )}
    </div>
  );
}