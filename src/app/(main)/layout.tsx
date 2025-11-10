
'use client';

import { useEffect, useRef } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Footer from '@/components/shared/footer';
import Header from '@/components/shared/header';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const isUnloading = useRef(false);

  useEffect(() => {
    const referrerId = searchParams.get('ref');
    if (referrerId) {
      localStorage.setItem('referrerId', referrerId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user || !firestore) return;

    const uid = user.uid;
    const statusRef = doc(firestore, 'status', uid);

    const updateStatus = (isOnline: boolean) => {
      setDoc(doc(firestore, 'status', uid), { isOnline, lastChanged: serverTimestamp() }, { merge: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        isUnloading.current = false;
        updateStatus(true);
      } else {
        if (!isUnloading.current) {
            updateStatus(false);
        }
      }
    };
    
    const handlePageHide = () => {
      isUnloading.current = true;
      updateStatus(false);
    }
    
    updateStatus(true);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      if (uid && firestore) {
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
