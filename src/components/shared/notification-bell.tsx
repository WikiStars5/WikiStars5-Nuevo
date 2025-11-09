
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, writeBatch, doc } from 'firebase/firestore';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, MessageSquare, Circle, Flame } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDateDistance } from '@/lib/utils';
import type { Notification } from '@/lib/types';
import { Dialog, DialogTrigger } from '../ui/dialog';
import NotificationThreadDialog from './notification-thread-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const NOTIFICATION_SOUND_URL = 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/AUDIO--NOTIFICACION%2Flivechat.mp3?alt=media&token=6f7084e4-9bad-4599-9f72-5534ad2464b7';

function NotificationItem({ notification }: { notification: Notification }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getParamsFromLink = (link: string) => {
    const url = new URL(link, window.location.origin);
    const figureId = url.pathname.split('/').pop() || '';
    const parentId = url.searchParams.get('thread') || '';
    const replyId = url.searchParams.get('reply') || '';
    return { figureId, parentId, replyId };
  };

  const getFigureNameFromMessage = (message: string): string => {
      const match = message.match(/en el perfil de (.*?)\.$/);
      return match ? match[1] : '';
  }

  const { figureId, parentId, replyId } = getParamsFromLink(notification.link);
  const figureName = getFigureNameFromMessage(notification.message);

  const icon = notification.type === 'streak_milestone' ? <Flame className="h-4 w-4 text-orange-500" /> : <MessageSquare className="h-4 w-4 text-primary" />;

  const TriggerWrapper = notification.type === 'comment_reply' ? DialogTrigger : 'div';

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <TriggerWrapper asChild={notification.type === 'comment_reply'}>
        <button className={cn(
            "w-full text-left flex items-start gap-3 p-3 hover:bg-muted/50 rounded-md",
            !notification.isRead && "bg-primary/5"
        )}>
          {!notification.isRead && <Circle className="h-2 w-2 mt-1.5 fill-primary text-primary flex-shrink-0" />}
          <div className={cn("flex-shrink-0 mt-1", notification.isRead && "ml-5")}>{icon}</div>
          <div className="flex-1 space-y-1">
              <p className="text-sm">{notification.message}</p>
              <p className="text-xs text-muted-foreground">
              {formatDateDistance(notification.createdAt.toDate())}
              </p>
          </div>
        </button>
      </TriggerWrapper>
      {isDialogOpen && notification.type === 'comment_reply' && (
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


function NotificationSkeleton() {
    return (
        <div className="flex items-start gap-3 p-3">
            <Skeleton className="h-3 w-3 rounded-full mt-1.5" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/3" />
            </div>
        </div>
    )
}

function NotificationList({ notifications, isLoading }: { notifications: Notification[], isLoading: boolean }) {
    if (isLoading) {
        return (
            <div className="p-2 space-y-2">
                <NotificationSkeleton />
                <NotificationSkeleton />
                <NotificationSkeleton />
            </div>
        );
    }
    if (!notifications || notifications.length === 0) {
        return (
            <div className="text-center p-8">
                <p className="text-sm text-muted-foreground">No tienes notificaciones de este tipo.</p>
            </div>
        );
    }
    return (
        <div className="divide-y">
            {notifications.map(n => (
                <NotificationItem key={n.id} notification={n} />
            ))}
        </div>
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
      limit(50) // Fetch more to populate both tabs
    );
  }, [user, firestore]);

  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

  const { commentNotifications, streakNotifications, unreadCount } = useMemo(() => {
    if (!notifications) return { commentNotifications: [], streakNotifications: [], unreadCount: 0 };
    return {
        commentNotifications: notifications.filter(n => n.type === 'comment_reply'),
        streakNotifications: notifications.filter(n => n.type === 'streak_milestone'),
        unreadCount: notifications.filter(n => !n.isRead).length
    }
  }, [notifications]);
  
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


  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && hasUnread && firestore && user) {
        const unreadIds = (notifications || []).filter(n => !n.isRead).map(n => n.id);
        if (unreadIds.length === 0) return;

        const batch = writeBatch(firestore);
        unreadIds.forEach(id => {
            const notifRef = doc(firestore, 'users', user.uid, 'notifications', id);
            batch.update(notifRef, { isRead: true });
        });
        await batch.commit();
        previousUnreadCountRef.current = 0;
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
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
        <Tabs defaultValue="comments" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-b-none">
                <TabsTrigger value="comments">Comentarios</TabsTrigger>
                <TabsTrigger value="streaks">Rachas</TabsTrigger>
            </TabsList>
            <ScrollArea className="h-96">
                <TabsContent value="comments" className="m-0">
                    <NotificationList notifications={commentNotifications} isLoading={isLoading} />
                </TabsContent>
                <TabsContent value="streaks" className="m-0">
                     <NotificationList notifications={streakNotifications} isLoading={isLoading} />
                </TabsContent>
            </ScrollArea>
        </Tabs>
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
