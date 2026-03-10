'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, getDoc } from 'firebase/firestore'; // Añadido doc y getDoc
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from 'next/link';
import { Skeleton } from "@/components/ui/skeleton";
import FollowButton from "./follow-button";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";

interface FollowListDialogProps {
  userId: string;
  type: 'followers' | 'following';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INITIAL_LIMIT = 5;
const LIMIT_INCREMENT = 5;

/**
 * Componente auxiliar para renderizar cada usuario con datos en tiempo real
 */
function UserRow({ item, type, onOpenChange }: { item: any, type: string, onOpenChange: (o: boolean) => void }) {
  const firestore = useFirestore();
  const [liveData, setLiveData] = React.useState({
    username: item.username,
    profilePhotoUrl: item.profilePhotoUrl
  });

  React.useEffect(() => {
    if (!firestore || !item.userId) return;

    const fetchRealTimeData = async () => {
      try {
        const userRef = doc(firestore, 'users', item.userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          // Priorizamos displayName o username actual de la colección principal
          setLiveData({
            username: data.displayName || data.username || item.username,
            profilePhotoUrl: data.photoURL || item.profilePhotoUrl
          });
        }
      } catch (error) {
        console.error("Error actualizando datos de usuario en la lista:", error);
      }
    };

    fetchRealTimeData();
  }, [firestore, item.userId, item.username, item.profilePhotoUrl]);

  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <Link 
        href={`/u/${liveData.username}`} 
        className="flex items-center gap-3 flex-1 min-w-0"
        onClick={() => onOpenChange(false)}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={liveData.profilePhotoUrl || undefined} />
          <AvatarFallback>{liveData.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
        <span className="font-bold text-sm truncate">{liveData.username}</span>
      </Link>
      
      <FollowButton 
        targetUserId={item.userId} 
        targetUsername={liveData.username} 
        targetPhotoUrl={liveData.profilePhotoUrl || null}
        unfollowText={type === 'following' ? "Dejar de seguir" : undefined}
        className="ml-2"
      />
    </div>
  );
}

export default function FollowListDialog({ userId, type, open, onOpenChange }: FollowListDialogProps) {
  const firestore = useFirestore();
  const [displayLimit, setDisplayLimit] = React.useState(INITIAL_LIMIT);
  
  const listQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(
      collection(firestore, 'users', userId, type), 
      orderBy('createdAt', 'desc'),
      limit(displayLimit)
    );
  }, [firestore, userId, type, displayLimit]);

  const { data: users, isLoading } = useCollection(listQuery, { enabled: open });

  const title = type === 'followers' ? 'Seguidores' : 'Siguiendo';
  const hasMore = users && users.length >= displayLimit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden flex flex-col max-h-[80vh]">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-center text-lg font-bold">
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading && displayLimit === INITIAL_LIMIT ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))
            ) : users && users.length > 0 ? (
              <>
                {users.map((item) => (
                  <UserRow 
                    key={item.userId} 
                    item={item} 
                    type={type} 
                    onOpenChange={onOpenChange} 
                  />
                ))}
                
                {hasMore && (
                  <div className="p-2 pt-4 flex justify-center border-t mt-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs text-primary font-bold hover:bg-primary/10"
                      onClick={(e) => {
                        e.preventDefault();
                        setDisplayLimit(prev => prev + LIMIT_INCREMENT);
                      }}
                    >
                      Ver más
                    </Button>
                  </div>
                )}
              </>
            ) : (
              !isLoading && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No hay {title.toLowerCase()} para mostrar.
                </div>
              )
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
