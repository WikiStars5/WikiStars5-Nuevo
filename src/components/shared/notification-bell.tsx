
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, MessageSquare, Circle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDateDistance } from '@/lib/utils';
import type { Notification } from '@/lib/types';
import { Dialog, DialogTrigger } from '../ui/dialog';
import NotificationThreadDialog from './notification-thread-dialog';


const NOTIFICATION_SOUND_URL = 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/AUDIO--NOTIFICACION%2Flivechat.mp3?alt=media&token=6f7084e4-9bad-4599-9f72-5534ad2464b7';

function NotificationItem({ notification, onNotificationClick }: { notification: Notification, onNotificationClick: (id: string) => void }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getParamsFromLink = (link: string) => {
    try {
        const url = new URL(link, window.location.origin);
        const figureId = url.pathname.split('/').pop() || '';
        const parentId = url.searchParams.get('thread') || '';
        const replyId = url.searchParams.get('reply') || '';
        return { figureId, parentId, replyId };
    } catch (error) {
        console.warn("Invalid notification link:", link);
        return { figureId: '', parentId: '', replyId: '' };
    }
  };

  const getFigureNameFromMessage = (message: string): string => {
      const match = message.match(/en el perfil de (.*?)\.$/);
      return match ? match[1] : '';
  }
  
  const handleOpenDialog = (open: boolean) => {
    if (open && !notification.isRead) {
        onNotificationClick(notification.id);
    }
    setIsDialogOpen(open);
  }

  const { figureId, parentId, replyId } = getParamsFromLink(notification.link);
  const figureName = getFigureNameFromMessage(notification.message);

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
      <DialogTrigger asChild>
        <button className={cn(
            "w-full text-left flex items-start gap-3 p-3 hover:bg-muted/50 rounded-md",
            !notification.isRead && "bg-primary/5"
        )}>
          {!notification.isRead && <Circle className="h-2 w-2 mt-1.5 fill-primary text-primary flex-shrink-0" />}
          <div className={cn("flex-shrink-0 mt-1", notification.isRead && "ml-5")}><MessageSquare className="h-4 w-4 text-primary" /></div>
          <div className="flex-1 space-y-1">
              <p className="text-sm">{notification.message}</p>
              <p className="text-xs text-muted-foreground">
              {formatDateDistance(notification.createdAt.toDate())}
              </p>
          </div>
        </button>
      </DialogTrigger>
      {isDialogOpen && (
        <NotificationThreadDialog
          figureId={figureId}
          parentId={parentId}
          replyId={replyId}
          figureName={figureName}
          onOpenChange={setIsDialogOpen}
        />
      )}
    </Dialog>
  );
}


export default function NotificationBell() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const previousUnreadCountRef = useRef<number>(0);

  const notificationsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [user, firestore]);

  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);
  
  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  const hasUnread = unreadCount > 0;

  useEffect(() => {
    // Play sound only if new unread notifications have arrived.
    if (unreadCount > previousUnreadCountRef.current) {
        const audio = new Audio(NOTIFICATION_SOUND_URL);
        audio.play().catch(e => console.error("Error playing notification sound:", e));
    }
    // Update the ref with the new count for the next check.
    previousUnreadCountRef.current = unreadCount;
  }, [unreadCount]);


 const handleMarkAsRead = async (notificationId: string) => {
    if (!firestore || !user) return;
    const notifRef = doc(firestore, 'users', user.uid, 'notifications', notificationId);
    try {
      await updateDoc(notifRef, { isRead: true });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
          )}
          <span className="sr-only">Ver notificaciones</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 font-semibold text-sm border-b">
            Notificaciones
        </div>
        <ScrollArea className="h-96">
            {isLoading && (
                <div className="p-4 space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            )}
            {!isLoading && notifications && notifications.length > 0 && (
                <div className="divide-y">
                    {notifications.map(n => (
                        <NotificationItem key={n.id} notification={n} onNotificationClick={handleMarkAsRead} />
                    ))}
                </div>
            )}
             {!isLoading && (!notifications || notifications.length === 0) && (
                <div className="text-center p-8">
                    <p className="text-sm text-muted-foreground">No tienes notificaciones.</p>
                </div>
            )}
        </ScrollArea>
        <Separator />
        <div className="p-2 text-center">
            <Button variant="link" size="sm" asChild>
                <Link href="#">Ver todas</Link>
            </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
