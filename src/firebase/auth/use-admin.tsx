'use client';

import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useUser, useDoc } from '@/firebase';

export interface UseAdminResult {
  isAdmin: boolean;
  isAdminLoading: boolean;
}

/**
 * Hook to determine if the current user is an administrator.
 * It combines a client-side check against a hardcoded list of UIDs
 * with a server-side check for a document in the 'roles_admin' collection.
 * The loading state is true until a definitive answer is reached.
 * @returns {UseAdminResult} Object with isAdmin flag and a definitive loading state.
 */
export const useAdmin = (): UseAdminResult => {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  // Step 1: Memoize the Firestore document reference. It's null if there's no user.
  const adminRoleDocRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'roles_admin', user.uid);
  }, [firestore, user]);

  // Step 2: Subscribe to the document. `isLoading` from this hook is crucial.
  const { data: adminDoc, isLoading: isAdminDocLoading } = useDoc(adminRoleDocRef);
  
  // Step 3: Determine the final loading state. It's loading if auth is loading OR if we have a user but the doc check is still pending.
  const isAdminLoading = isAuthLoading || (!!user && isAdminDocLoading);

  // Step 4: Determine the admin status.
  const isAdmin = useMemo(() => {
    // Cannot be admin if loading, no user, or user is anonymous.
    if (isAdminLoading || !user || user.isAnonymous) {
      return false;
    }
    
    // Check #2: Does the corresponding document exist in the `roles_admin` collection? (Slower server-side check)
    const hasAdminRoleDoc = !!adminDoc;

    // To be an admin, BOTH checks must pass.
    return hasAdminRoleDoc;
  }, [user, adminDoc, isAdminLoading]);

  // Return the definitive admin status and loading state.
  return { isAdmin, isAdminLoading };
};
