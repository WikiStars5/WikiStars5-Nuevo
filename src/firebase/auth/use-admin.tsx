
'use client';

import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { ADMIN_UIDS } from '@/lib/admins';

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

  // Client-side check: Is the user's UID in our hardcoded admin list?
  const isPotentialAdmin = useMemo(() => {
    if (!user) return false;
    return ADMIN_UIDS.includes(user.uid);
  }, [user]);

  const adminRoleDocRef = useMemoFirebase(() => {
    // Only prepare the reference if the user is a potential admin.
    if (!firestore || !user || !isPotentialAdmin) return null;
    return doc(firestore, 'roles_admin', user.uid);
  }, [firestore, user, isPotentialAdmin]);

  const { data: adminDoc, isLoading: isAdminDocLoading } = useDoc(adminRoleDocRef, {
    // IMPORTANT: The hook is only enabled if the user is in the client-side admin list.
    enabled: isPotentialAdmin,
  });
  
  // The overall loading state is true if auth is loading, or if the user is a potential admin
  // and we are still fetching their specific admin doc.
  const isAdminLoading = isAuthLoading || (isPotentialAdmin && isAdminDocLoading);

  const isAdmin = useMemo(() => {
    // Not an admin if there's no user, we are still loading, or they are not even a potential admin.
    if (!user || isAdminLoading || !isPotentialAdmin) {
      return false;
    }
    
    // For a potential admin, their final status depends on the existence of the role document.
    return !!adminDoc;
  }, [user, adminDoc, isAdminLoading, isPotentialAdmin]);

  return { isAdmin, isAdminLoading };
};

    