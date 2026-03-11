'use client';

import * as React from 'react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, limit, orderBy, getDoc, doc } from 'firebase/firestore';
import type { Comment } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserPlus, RefreshCw, Sparkles, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// CONFIGURACIÓN DE RENDIMIENTO
const MAX_FOLLOWED_TO_CONSULT = 10; 
const POSTS_PER_USER = 10;          
const MAX_POSTS_TO_SHOW = 10;       

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
  const [isAppending, setIsAppending] = useState(false);

  // Registro de IDs vistos para evitar repeticiones en la sesión actual
  const seenPostIdsRef = useRef<Set<string>>(new Set());

  const followingQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'following');
  }, [user, firestore]);

  const { data: following, isLoading: isLoadingFollowing } = useCollection(followingQuery, { enabled: !!user });

  const fetchFollowingPosts = useCallback(async (followingList: any[], append = false) => {
    if (!firestore || followingList.length === 0) {
      if (!append) setFeedPosts([]);
      setIsLoading(false);
      return;
    }

    if (append) setIsAppending(true);
    else {
      setIsLoading(true);
      seenPostIdsRef.current.clear();
    }

    try {
      // Elegimos hasta 10 usuarios seguidos al azar
      const randomUsers = shuffleArray(followingList).slice(0, MAX_FOLLOWED_TO_CONSULT);

      const fetchPromises = randomUsers.map(async (f) => {
        const followedId = f.userId || f.id;
        const starPostsRef = collection(firestore, 'users', followedId, 'starposts');
        const q = query(starPostsRef, orderBy('createdAt', 'desc'), limit(POSTS_PER_USER));
        const snapshot = await getDocs(q);
        
        // Obtenemos los datos completos del post desde la referencia
        const postPromises = snapshot.docs.map(async (starRefDoc) => {
            const refData = starRefDoc.data();
            const postDocRef = doc(firestore, 'figures', refData.figureId, 'comments', starRefDoc.id);
            const postDoc = await getDoc(postDocRef);
            if (postDoc.exists()) {
                return { id: postDoc.id, ...postDoc.data() } as Comment;
            }
            return null;
        });

        const resolvedPosts = await Promise.all(postPromises);
        return resolvedPosts.filter((p): p is Comment => p !== null);
      });

      const results = await Promise.all(fetchPromises);
      const allPostsPool = results.flat();
      
      // Filtrar por no vistos para evitar repeticiones
      const uniqueNewPosts = allPostsPool.filter(post => !seenPostIdsRef.current.has(post.id));
      
      // Mezclar para que no salgan todos los de un mismo usuario juntos y tomar el lote
      const batchToShow = shuffleArray(uniqueNewPosts).slice(0, MAX_POSTS_TO_SHOW);

      // Registrar los nuevos como vistos
      batchToShow.forEach(post => seenPostIdsRef.current.add(post.id));

      if (append) {
        setFeedPosts(prev => [...prev, ...batchToShow]);
      } else {
        setFeedPosts(batchToShow);
      }
    } catch (error) {
      console.error("Error al cargar feed de seguidos:", error);
    } finally {
      setIsLoading(false);
      setIsAppending(false);
    }
  }, [firestore]);

  useEffect(() => {
    if (!isLoadingFollowing && following) {
      fetchFollowingPosts(following);
    } else if (!isLoadingFollowing && !following && user) {
        setIsLoading(false);
    }
  }, [following, isLoadingFollowing, fetchFollowingPosts, user]);

  if (isUserLoading) {
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

  if (!user) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
        <Users className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-bold mb-2">¡Sigue a tus favoritos!</h2>
        <p className="text-muted-foreground mb-8">Empieza a seguir usuarios para ver sus publicaciones aquí mismo.</p>
        <Button asChild><Link href="/login"><LogIn className="mr-2 h-4 w-4" /> Iniciar Sesión</Link></Button>
      </div>
    );
  }

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
            Sigue a otros usuarios (incluso si eres invitado) para ver sus publicaciones aquí.
          </p>
          <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/20">
            <Link href="/figures">Explorar Usuarios</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold font-headline mb-6 flex items-center gap-2">
        <Users className="text-primary" /> Siguiendo
      </h1>

      {isLoading && feedPosts.length === 0 ? (
         <div className="space-y-6">
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
      ) : feedPosts.length > 0 ? (
        <div className="space-y-6">
          {feedPosts.map((post, index) => (
            <StarPostCard key={`${post.id}-${index}`} post={post} />
          ))}
          
          <div className="mt-8 flex flex-col items-center">
                <Button 
                    variant="outline" 
                    className="w-full py-6 flex gap-2 text-lg font-medium border-primary/20 hover:bg-primary/5"
                    onClick={() => fetchFollowingPosts(following!, true)} 
                    disabled={isAppending}
                >
                    <RefreshCw className={`h-5 w-5 ${isAppending ? 'animate-spin' : ''}`} />
                    {isAppending ? 'Buscando contenido nuevo...' : 'Ver más de mis seguidos'}
                </Button>
                <p className="text-[10px] text-muted-foreground mt-3 uppercase tracking-widest">
                  Mezclando publicaciones de tus amigos sin repeticiones
                </p>
            </div>
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
