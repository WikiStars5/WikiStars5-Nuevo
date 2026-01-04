
import * as admin from 'firebase-admin';
import { firebaseConfig } from './config';

/**
 * Ensures that the Firebase Admin app is initialized only once.
 * @returns The initialized Firebase Admin app instance.
 */
function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }
  
  // In a Google Cloud environment (like App Hosting), the SDK can
  // automatically detect the project credentials.
  return admin.initializeApp();
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
