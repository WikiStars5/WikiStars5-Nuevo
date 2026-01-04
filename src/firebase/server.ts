'use server';

import * as admin from 'firebase-admin';

/**
 * Ensures that the Firebase Admin SDK is initialized only once.
 * @returns The initialized Firebase Admin App instance.
 */
function getAdminApp(): admin.app.App {
  // If the default app is already initialized, return it.
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  // If not initialized, initialize it.
  // In a Google Cloud environment (like App Hosting), the SDK automatically
  // finds the service account credentials. No need to specify them.
  admin.initializeApp();
  return admin.apps[0]!;
}

/**
 * Provides singleton instances of the Firebase Admin SDK services.
 * @returns An object containing the admin app and Firestore instances.
 */
export function getSdks() {
  const app = getAdminApp();
  const firestore = admin.firestore(app);

  return { app, firestore };
}
