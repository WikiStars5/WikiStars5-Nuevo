
'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    // This effect runs whenever the user navigates within the main layout.
    // It updates the `lastLogin` field to keep track of active users.
    if (user && firestore) {
      const userRef = doc(firestore, 'users', user.uid);
      // We use setDoc with merge: true to create the document if it doesn't exist,
      // or update it if it does. This is a non-blocking "fire-and-forget" operation.
      setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
    }
  }, [user, firestore]);

  return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
  );
}

    