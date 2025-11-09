'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebase } from '@/firebase/provider';
import { useUser } from '@/firebase/auth/use-user';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function usePushNotifications() {
  const { firebaseApp, firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'loading'>('loading');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  // Effect to check current permission status on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('denied'); // Not supported
    }
  }, []);

  // Effect to sync subscription status with Firestore
  useEffect(() => {
    const checkSubscription = async () => {
      if (user && firestore && fcmToken) {
        const userRef = doc(firestore, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const tokens = userSnap.data()?.fcmTokens || [];
          setIsSubscribed(tokens.includes(fcmToken));
        }
      } else {
        setIsSubscribed(false);
      }
    };
    checkSubscription();
  }, [user, firestore, fcmToken]);

  // Function to initialize FCM and get token
  const initializeFCM = useCallback(async () => {
    if (!firebaseApp || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return null;
    }

    try {
      const messaging = getMessaging(firebaseApp);
      const currentToken = await getToken(messaging, {
        vapidKey: 'BJEZNPKbi-4-a3sZWQz0D98H5-Xy6pEkaIqF4M10C-1i3sZpYl3iI9o2xY_ZgCgJ_CgJ_XwX1Z1zQ4E6G3Y4Q8E', // Replace with your VAPID key
      });
      
      if (currentToken) {
        setFcmToken(currentToken);
        return currentToken;
      } else {
        toast({
          title: 'Permiso de notificación necesario',
          description: 'Necesitas permitir las notificaciones en la configuración de tu navegador.',
          variant: 'destructive',
        });
        return null;
      }
    } catch (error) {
      console.error('Error al obtener el token de FCM:', error);
      toast({
        title: 'Error de Notificación',
        description: 'No se pudo obtener el token para las notificaciones push.',
        variant: 'destructive',
      });
      return null;
    }
  }, [firebaseApp, toast]);


  // Effect to get token once permission is granted
  useEffect(() => {
    if (notificationPermission === 'granted') {
      initializeFCM();
    }
  }, [notificationPermission, initializeFCM]);


  const requestPermissionAndSubscribe = async (subscribe: boolean) => {
    if (notificationPermission === 'denied') {
      toast({
        title: 'Permisos Bloqueados',
        description: 'Debes habilitar las notificaciones para este sitio en la configuración de tu navegador.',
        variant: 'destructive',
      });
      return;
    }

    if (notificationPermission === 'default') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== 'granted') {
        return; // User did not grant permission
      }
    }
    
    // Now that we have permission, get the token (it might be cached)
    const token = await initializeFCM();

    if (token && user && firestore) {
      const userRef = doc(firestore, 'users', user.uid);
      try {
        if (subscribe) {
          await updateDoc(userRef, { fcmTokens: arrayUnion(token) });
          setIsSubscribed(true);
          toast({ title: '¡Suscrito!', description: 'Recibirás notificaciones push.' });
        } else {
          await updateDoc(userRef, { fcmTokens: arrayRemove(token) });
          setIsSubscribed(false);
          toast({ title: 'Suscripción cancelada', description: 'Ya no recibirás notificaciones push.' });
        }
      } catch (error) {
        console.error('Error al actualizar la suscripción:', error);
        toast({ title: 'Error', description: 'No se pudo actualizar tu suscripción.', variant: 'destructive' });
      }
    }
  };
  
  // Listen for foreground messages
  useEffect(() => {
    if (firebaseApp && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const messaging = getMessaging(firebaseApp);
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Mensaje recibido en primer plano: ', payload);
        toast({
          title: payload.notification?.title,
          description: payload.notification?.body,
        });
      });
      return () => unsubscribe();
    }
  }, [firebaseApp, toast]);


  return {
    requestPermissionAndSubscribe,
    isSubscribed,
    permissionStatus: notificationPermission,
  };
}
