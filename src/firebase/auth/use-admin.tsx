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
 * It checks for the existence of a document in the 'roles_admin' collection.
 * @returns {UseAdminResult} Object with isAdmin flag and a definitive loading state.
 */
export const useAdmin = (): UseAdminResult => {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  const adminRoleDocRef = useMemoFirebase(() => {
    // If there is no user, there is no admin role to check.
    if (!firestore || !user) return null;
    return doc(firestore, 'roles_admin', user.uid);
  }, [firestore, user]);

  const { data: adminDoc, isLoading: isAdminDocLoading } = useDoc(adminRoleDocRef, {
    // Only enable the hook if there is a user.
    enabled: !!user,
  });
  
  // The overall loading state is true if auth is loading, or if we have a user
  // and we are still fetching their admin role document.
  const isAdminLoading = isAuthLoading || (!!user && isAdminDocLoading);

  const isAdmin = useMemo(() => {
    // Not an admin if there's no user or if we are still loading.
    if (!user || isAdminLoading) {
      return false;
    }
    
    // The user is an admin if their corresponding document in 'roles_admin' exists.
    return !!adminDoc;
  }, [user, adminDoc, isAdminLoading]);

  return { isAdmin, isAdminLoading };
};
