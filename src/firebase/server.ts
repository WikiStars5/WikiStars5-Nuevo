// IMPORTANT: This file is used for server-side rendering and should not be imported in client components.
import { initializeApp, getApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// --- Singleton Pattern for Firebase Admin SDK ---

/**
 * Initializes and returns the Firebase Admin App instance.
 * It handles both local development with service account files
 * and cloud environments with default credentials.
 */
function getAdminApp() {
  // If the app is already initialized, return it to avoid errors.
  if (getApps().length > 0) {
    return getApp();
  }

  // Determine credentials based on the environment variable.
  const serviceAccountString = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (serviceAccountString) {
    try {
      // If it looks like a JSON string, parse it and use it as a certificate.
      if (serviceAccountString.startsWith('{')) {
        return initializeApp({
          credential: cert(JSON.parse(serviceAccountString))
        });
      }
    } catch (error) {
      console.error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS as JSON:", error);
    }
  }

  // Fallback: Initialize with default credentials provided by the environment (App Hosting / GCP)
  return initializeApp();
}

// Export singleton instances of the services.
export function getSdks() {
  const app = getAdminApp();
  return {
    auth: getAuth(app),
    firestore: getFirestore(app),
  };
}
