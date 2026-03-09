'use client';

import { useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, UserMinus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  targetUserId: string;
  targetUsername: string;
  targetPhotoUrl: string | null;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export default function FollowButton({
  targetUserId,
  targetUsername,
  targetPhotoUrl,
  className,
  size = 'sm',
}: FollowButtonProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const followRef = useMemoFirebase(() => {
    if (!firestore || !user || !targetUserId) return null;
    return doc(firestore, 'users', user.uid, 'following', targetUserId);
  }, [firestore, user, targetUserId]);

  const { data: followDoc, isLoading: isCheckLoading } = useDoc(followRef, { 
    enabled: true,
    realtime: true 
  });

  const isFollowing = !!followDoc;

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || user.isAnonymous) {
      toast({
        title: 'Inicia sesión',
        description: 'Debes tener una cuenta registrada para seguir a otros usuarios.',
        variant: 'destructive',
      });
      return;
    }

    if (user.uid === targetUserId) {
      toast({
        title: 'Error',
        description: 'No puedes seguirte a ti mismo.',
        variant: 'destructive',
      });
      return;
    }

    if (!firestore || isProcessing) return;

    setIsProcessing(true);

    try {
      await runTransaction(firestore, async (transaction) => {
        const followerRef = doc(firestore, 'users', targetUserId, 'followers', user.uid);
        const followingRef = doc(firestore, 'users', user.uid, 'following', targetUserId);
        const targetUserRef = doc(firestore, 'users', targetUserId);
        const currentUserRef = doc(firestore, 'users', user.uid);

        const [followerSnap, targetUserSnap, currentUserSnap] = await Promise.all([
          transaction.get(followerRef),
          transaction.get(targetUserRef),
          transaction.get(currentUserRef),
        ]);

        const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() : {};
        const isCurrentlyFollowing = followerSnap.exists();

        if (isCurrentlyFollowing) {
          // Unfollow
          transaction.delete(followerRef);
          transaction.delete(followingRef);
          transaction.update(targetUserRef, { followerCount: increment(-1) });
          transaction.update(currentUserRef, { followingCount: increment(-1) });
        } else {
          // Follow
          transaction.set(followerRef, {
            userId: user.uid,
            username: currentUserData.username || user.displayName || 'Usuario',
            profilePhotoUrl: currentUserData.profilePhotoUrl || user.photoURL || null,
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
          <UserMinus className="h-3 w-3 mr-1" /> Siguiendo
        </>
      ) : (
        <>
          <UserPlus className="h-3 w-3 mr-1" /> Seguir
        </>
      )}
    </Button>
  );
}
