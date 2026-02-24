// IMPORTANT: This file is used for server-side rendering and should not be imported in client components.
import { initializeApp, getApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// --- Singleton Pattern for Firebase Admin SDK ---

function getAdminApp() {
  // If the app is already initialized, return it.
  if (getApps().length > 0) {
    return getApp();
  }

  // Determine credentials based on the environment.
  const serviceAccountString = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  const appOptions = serviceAccountString
    ? { credential: cert(JSON.parse(serviceAccountString)) }
    : undefined;

  // Initialize the app. If appOptions is 'undefined', the SDK will try to find credentials automatically.
  return initializeApp(appOptions);
}

// Export singleton instances of the services.
export function getSdks() {
  const app = getAdminApp();
  return {
    auth: getAuth(app),
    firestore: getFirestore(app),
  };
}
