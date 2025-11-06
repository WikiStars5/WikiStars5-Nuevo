'use client';

import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';

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

  const adminRoleDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'roles_admin', user.uid);
  }, [firestore, user]);

  const { data: adminDoc, isLoading: isAdminDocLoading } = useDoc(adminRoleDocRef, {
    // This hook is only enabled when we have a user.
    enabled: !!user,
  });
  
  // The overall loading state is true if auth is loading, or if we have a user but are still fetching their admin status.
  const isAdminLoading = isAuthLoading || (!!user && isAdminDocLoading);

  const isAdmin = useMemo(() => {
    // Not an admin if there's no user or if we're still loading.
    if (!user || isAdminLoading) {
      return false;
    }
    
    // The user is an admin if their role document exists.
    return !!adminDoc;
  }, [user, adminDoc, isAdminLoading]);

  return { isAdmin, isAdminLoading };
};
