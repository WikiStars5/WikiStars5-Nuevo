'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, writeBatch, doc } from 'firebase/firestore';
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


function NotificationItem({ notification }: { notification: Notification }) {
  const Icon = MessageSquare;
  return (
    <Link href={notification.link} className="block">
        <div className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-md">
        {!notification.isRead && <Circle className="h-2 w-2 mt-1.5 fill-primary text-primary flex-shrink-0" />}
        <div className={cn("flex-1 space-y-1", notification.isRead && "pl-5")}>
            <p className="text-sm">{notification.message}</p>
            <p className="text-xs text-muted-foreground">
            {formatDateDistance(notification.createdAt.toDate())}
            </p>
        </div>
        </div>
    </Link>
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

export default function NotificationBell() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);

  const notificationsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [user, firestore]);

  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

  const unreadNotifications = notifications?.filter(n => !n.isRead) || [];
  const hasUnread = unreadNotifications.length > 0;

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && hasUnread && firestore && user) {
        // Mark all visible unread notifications as read
        const batch = writeBatch(firestore);
        unreadNotifications.forEach(notif => {
            const notifRef = doc(firestore, 'users', user.uid, 'notifications', notif.id);
            batch.update(notifRef, { isRead: true });
        });
        await batch.commit();
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
        <div className="p-3 border-b">
            <h3 className="font-semibold text-sm">Notificaciones</h3>
        </div>
        <ScrollArea className="h-96">
          {isLoading && (
            <div className="p-2 space-y-2">
                <NotificationSkeleton />
                <NotificationSkeleton />
                <NotificationSkeleton />
            </div>
          )}
          {!isLoading && (!notifications || notifications.length === 0) && (
            <div className="text-center p-8">
                <p className="text-sm text-muted-foreground">No tienes notificaciones.</p>
            </div>
          )}
          {notifications && notifications.length > 0 && (
             <div className="divide-y">
                {notifications.map(n => (
                    <NotificationItem key={n.id} notification={n} />
                ))}
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
