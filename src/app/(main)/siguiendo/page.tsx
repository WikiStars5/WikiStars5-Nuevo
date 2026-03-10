'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import type { Comment } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserPlus, ChevronDown } from 'lucide-react'; // Icono para el botón
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
  
  // CONTROL DE PAGINACIÓN
  const [visibleCount, setVisibleCount] = useState(10); // Cuántos IDs de amigos procesar
  const [hasMore, setHasMore] = useState(false);

  const followingQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'following');
  }, [user, firestore]);

  const { data: following, isLoading: isLoadingFollowing } = useCollection(followingQuery, { enabled: !!user });

  useEffect(() => {
    const fetchFollowingPosts = async () => {
      if (!firestore || !user || isLoadingFollowing) return;

      if (!following || following.length === 0) {
        setFeedPosts([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // 1. Tomamos solo los IDs según el límite actual (visibleCount)
        const followedUserIds = following.map(f => f.id).slice(0, visibleCount);
        
        // Verificamos si hay más amigos para cargar después
        setHasMore(following.length > visibleCount);

        // 2. Traemos Starposts de esos usuarios
        const fetchPromises = followedUserIds.map(async (followedId) => {
          const starPostsRef = collection(firestore, 'users', followedId, 'starposts');
          const q = query(starPostsRef, orderBy('createdAt', 'desc'), limit(3)); // 3 de cada uno para variedad
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
        });

        const results = await Promise.all(fetchPromises);
        const allPosts = results.flat();

        // 3. Mezclamos y limitamos el feed final a 10 resultados exactos
        // Si quieres ver más de 10 totales, sube este número
        setFeedPosts(shuffleArray(allPosts).slice(0, 10)); 

      } catch (error) {
        console.error("Error fetching feed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowingPosts();
  }, [firestore, user, following, isLoadingFollowing, visibleCount]); // Se dispara cuando cambia visibleCount

  // Función para el botón "Mostrar más"
  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 10); // Aumenta de 10 en 10
  };

  // Renderizado de carga y estados vacíos (Igual que antes...)
  if (isUserLoading || isLoadingFollowing || (isLoading && feedPosts.length === 0)) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold font-headline mb-6 flex items-center gap-2">
            <Users className="text-primary" /> Siguiendo
        </h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-lg space-y-3 animate-pulse">
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

          {/* BOTÓN MOSTRAR MÁS */}
          {hasMore && (
            <div className="pt-4 flex justify-center">
              <Button 
                onClick={handleLoadMore} 
                variant="ghost" 
                className="gap-2 text-muted-foreground hover:text-primary"
                disabled={isLoading}
              >
                {isLoading ? 'Cargando...' : 'Ver más StarPosts'}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 dark:bg-card/50 rounded-2xl border-2 border-dashed">
          <UserPlus className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Tu feed de amigos está vacío</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/figures">Explorar Personajes</Link>
          </Button>
        </div>
      )}
    </div>
  );
}