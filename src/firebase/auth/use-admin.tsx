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
 * It checks for the existence of a document in the 'roles_admin' collection
 * with the user's UID.
 * @returns {UseAdminResult} Object with isAdmin flag and loading state.
 */
export const useAdmin = (): UseAdminResult => {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  const adminCheckRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'roles_admin', user.uid);
  }, [firestore, user]);

  const { data: adminDoc, isLoading: isAdminDocLoading } = useDoc(adminCheckRef);

  const isAdmin = !!adminDoc;
  const isAdminLoading = isAuthLoading || (!!user && isAdminDocLoading);

  return { isAdmin, isAdminLoading };
};
