'use client';

import { useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, UserMinus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { signInAnonymously } from 'firebase/auth';

interface FollowButtonProps {
  targetUserId: string;
  targetUsername: string;
  targetPhotoUrl: string | null;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  unfollowText?: string;
}

export default function FollowButton({
  targetUserId,
  targetUsername,
  targetPhotoUrl,
  className,
  size = 'sm',
  unfollowText,
}: FollowButtonProps) {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const followRef = useMemoFirebase(() => {
    if (!firestore || !user || !targetUserId) return null;
    return doc(firestore, 'users', user.uid, 'following', targetUserId);
  }, [firestore, user, targetUserId]);

  const { data: followDoc, isLoading: isCheckLoading } = useDoc(followRef, { 
    enabled: !!user,
    realtime: true 
  });

  const isFollowing = !!followDoc;

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isProcessing) return;
    setIsProcessing(true);

    let currentUser = user;
    
    // 1. Manejo de autenticación automática (Sesión anónima si no está logueado)
    if (!currentUser && auth) {
      try {
        const userCredential = await signInAnonymously(auth);
        currentUser = userCredential.user;
      } catch (error) {
        console.error("Anonymous sign in failed:", error);
        toast({ 
          title: 'Error de conexión', 
          description: 'No se pudo iniciar una sesión para seguir usuarios.', 
          variant: 'destructive' 
        });
        setIsProcessing(false);
        return;
      }
    }

    if (!currentUser || !firestore) {
      setIsProcessing(false);
      return;
    }

    if (currentUser.uid === targetUserId) {
      toast({
        title: 'Error',
        description: 'No puedes seguirte a ti mismo.',
        variant: 'destructive',
      });
      setIsProcessing(false);
      return;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const followerRef = doc(firestore, 'users', targetUserId, 'followers', currentUser!.uid);
        const followingRef = doc(firestore, 'users', currentUser!.uid, 'following', targetUserId);
        const targetUserRef = doc(firestore, 'users', targetUserId);
        const currentUserRef = doc(firestore, 'users', currentUser!.uid);

        const [followerSnap, targetUserSnap, currentUserSnap] = await Promise.all([
          transaction.get(followerRef),
          transaction.get(targetUserRef),
          transaction.get(currentUserRef),
        ]);

        const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() : {};
        const isCurrentlyFollowing = followerSnap.exists();

        // Asegurar que el documento del usuario objetivo exista
        if (!targetUserSnap.exists()) {
            transaction.set(targetUserRef, { 
                id: targetUserId, 
                username: targetUsername, 
                profilePhotoUrl: targetPhotoUrl,
                createdAt: serverTimestamp() 
            });
        }

        // Asegurar que el documento del usuario actual exista
        if (!currentUserSnap.exists()) {
            transaction.set(currentUserRef, { 
                id: currentUser!.uid, 
                createdAt: serverTimestamp() 
            });
        }

        if (isCurrentlyFollowing) {
          // Dejar de seguir
          transaction.delete(followerRef);
          transaction.delete(followingRef);
          transaction.update(targetUserRef, { followerCount: increment(-1) });
          transaction.update(currentUserRef, { followingCount: increment(-1) });
        } else {
          // Seguir
          const myName = currentUserData.username || currentUser!.displayName || `Invitado_${currentUser!.uid.substring(0, 4)}`;
          transaction.set(followerRef, {
            userId: currentUser!.uid,
            username: myName,
            profilePhotoUrl: currentUserData.profilePhotoUrl || currentUser!.photoURL || null,
            createdAt: serverTimestamp(),
          });
          transaction.set(followingRef, {
            userId: targetUserId,
            username: targetUsername,
            profilePhotoUrl: targetPhotoUrl,
            createdAt: serverTimestamp(),
          });
          transaction.update(targetUserRef, { followerCount: increment(1) });
          transaction.update(currentUserRef, { followingCount: increment(1) });
        }
      });

      toast({
        title: isFollowing ? 'Dejaste de seguir' : '¡Ahora sigues a este usuario!',
        description: isFollowing ? `Ya no sigues a ${targetUsername}` : `Recibirás actualizaciones de ${targetUsername}`,
      });
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: 'Error',
        description: 'No se pudo procesar la solicitud.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (user?.uid === targetUserId || isCheckLoading) return null;

  return (
    <Button
      variant={isFollowing ? 'secondary' : 'outline'}
      size={size}
      className={cn(
        'rounded-full font-bold transition-all h-7 px-4 text-xs',
        !isFollowing && 'border-primary text-primary hover:bg-primary/10',
        className
      )}
      onClick={handleFollowToggle}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="h-3 w-3 mr-1" /> {unfollowText || 'Siguiendo'}
        </>
      ) : (
        <>
          <UserPlus className="h-3 w-3 mr-1" /> Seguir
        </>
      )}
    </Button>
  );
}
