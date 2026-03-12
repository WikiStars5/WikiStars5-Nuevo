
'use client';

import { useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, increment, setDoc } from 'firebase/firestore';

/**
 * Component that detects if the site is being opened from an in-app browser
 * (like Instagram, Facebook, Messenger) and redirects to an external browser on Android.
 * It also tracks the event in Firestore stats.
 */
export default function ExternalBrowserRedirect() {
  const firestore = useFirestore();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isInstagram = userAgent.indexOf('Instagram') > -1;
    const isFacebook = userAgent.indexOf('FBAN') > -1 || userAgent.indexOf('FBAV') > -1;
    const isMessenger = userAgent.indexOf('Messenger') > -1;

    // If we are inside one of these restricted browsers
    if (isInstagram || isFacebook || isMessenger) {
      
      // 1. Track the event in Firestore stats
      if (firestore) {
        const statsRef = doc(firestore, 'stats', 'traffic');
        setDoc(statsRef, {
          instagramJumps: increment(1)
        }, { merge: true }).catch(err => console.error("Error logging jump stat:", err));
      }

      // 2. Log event to Google Analytics if available
      if ((window as any).gtag) {
        (window as any).gtag('event', 'instagram_browser_jump', {
          'event_category': 'Engagement',
          'event_label': isInstagram ? 'Instagram' : 'Facebook'
        });
      }

      // 3. Automated Redirection for Android
      // This uses the "Intent" scheme which is a standard way to open Chrome from other apps.
      const isAndroid = /android/i.test(userAgent);
      if (isAndroid) {
        const currentUrl = window.location.href;
        // Construct the intent URL
        // package=com.android.chrome forces it to open in Chrome
        const intentUrl = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;package=com.android.chrome;end`;
        
        window.location.href = intentUrl;
      }
    }
  }, [firestore]);

  return null;
}
