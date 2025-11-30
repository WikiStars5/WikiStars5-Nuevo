
'use client';

import { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // `useMemo` ensures `initializeFirebase` is called only once on the client.
  const { firebaseApp, auth, firestore } = useMemo(() => {
    try {
      // Initialize Firebase App and Auth as before
      const { firebaseApp, auth } = initializeFirebase();
      
      // Initialize Firestore with the modern multi-tab persistence settings
      const firestore = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });

      return { firebaseApp, auth, firestore };
    } catch (e) {
      console.error("Failed to initialize Firebase on client", e);
      // Return nulls if initialization fails, the provider will handle it.
      return { firebaseApp: null, auth: null, firestore: null };
    }
  }, []); 

  return (
    <FirebaseProvider
      firebaseApp={firebaseApp}
      auth={auth}
      firestore={firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
