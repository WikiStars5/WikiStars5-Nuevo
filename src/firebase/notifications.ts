
'use client';

import { doc, runTransaction, arrayUnion, increment, serverTimestamp, Firestore } from 'firebase/firestore';

/**
 * Saves an FCM token to the user document and updates the global subscriber counter.
 * This is an atomic operation.
 * @param firestore The Firestore instance.
 * @param userId The ID of the current user.
 * @param token The FCM registration token.
 */
export async function saveFcmToken(firestore: Firestore, userId: string, token: string) {
  if (!firestore || !userId || !token) return;

  const userRef = doc(firestore, 'users', userId);
  const statsRef = doc(firestore, 'stats', 'notifications');

  try {
    await runTransaction(firestore, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const statsDoc = await transaction.get(statsRef);

      const userData = userDoc.exists() ? userDoc.data() : {};
      const currentTokens: string[] = userData.fcmTokens || [];
      const wasSubscribed = currentTokens.length > 0;

      // 1. Update user document
      if (!currentTokens.includes(token)) {
        const newTokens = [...currentTokens, token];
        transaction.set(userRef, {
          fcmTokens: newTokens,
          tokenCount: newTokens.length,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // 2. Increment global counter only if this is the user's first token
        if (!wasSubscribed) {
          if (statsDoc.exists()) {
            transaction.update(statsRef, { totalSubscribers: increment(1) });
          } else {
            transaction.set(statsRef, { totalSubscribers: 1 });
          }
        }
      }
    });
    console.log("FCM Token saved and stats updated successfully.");
  } catch (error) {
    console.error("Error saving FCM token in transaction:", error);
  }
}
