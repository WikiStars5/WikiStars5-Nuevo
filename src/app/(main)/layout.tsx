
'use client';

import { useEffect, useRef } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Footer from '@/components/shared/footer';
import Header from '@/components/shared/header';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = useUser();
  const firestore = useFirestore();
  const isUnloading = useRef(false);

  useEffect(() => {
    if (!user || !firestore) return;

    const statusRef = doc(firestore, 'status', user.uid);

    const updateStatus = (isOnline: boolean) => {
      setDoc(statusRef, { isOnline, last_changed: serverTimestamp() }, { merge: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        isUnloading.current = false;
        updateStatus(true);
      } else {
        // This is a "best effort" to set offline status quickly.
        // The `pagehide` and `beforeunload` are more reliable for final-state changes.
        if (!isUnloading.current) {
            updateStatus(false);
        }
      }
    };
    
    const handlePageHide = () => {
      isUnloading.current = true;
      updateStatus(false);
    }
    
    // Set online status initially
    updateStatus(true);

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Use `pagehide` for mobile and modern desktop browsers for better reliability
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      // On component unmount (e.g., logout), set status to offline
      if (user && firestore) {
        updateStatus(false);
      }
    };
  }, [user, firestore]);

  return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
  );
}

    