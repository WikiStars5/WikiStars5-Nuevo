'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from 'next/link';
import { Skeleton } from "@/components/ui/skeleton";
import FollowButton from "./follow-button";
import { ScrollArea } from "../ui/scroll-area";

interface FollowListDialogProps {
  userId: string;
  type: 'followers' | 'following';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog component that displays a list of followers or followed users.
 */
export default function FollowListDialog({ userId, type, open, onOpenChange }: FollowListDialogProps) {
  const firestore = useFirestore();
  
  const listQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, 'users', userId, type), orderBy('createdAt', 'desc'));
  }, [firestore, userId, type]);

  const { data: users, isLoading } = useCollection(listQuery, { realtime: true });

  const title = type === 'followers' ? 'Seguidores' : 'Seguidos';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden dark:bg-black">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-center font-headline">{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px]">
          <div className="p-2 space-y-1">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))
            ) : users && users.length > 0 ? (
              users.map((item) => (
                <div key={item.userId} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Link 
                    href={`/u/${item.username}`} 
                    className="flex items-center gap-3 flex-1 min-w-0"
                    onClick={() => onOpenChange(false)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={item.profilePhotoUrl || undefined} />
                      <AvatarFallback>{item.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-sm truncate">{item.username}</span>
                  </Link>
                  <FollowButton 
                    targetUserId={item.userId} 
                    targetUsername={item.username} 
                    targetPhotoUrl={item.profilePhotoUrl || null}
                    unfollowText="Dejar de seguir"
                    className="ml-2"
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No hay {title.toLowerCase()} para mostrar.
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
