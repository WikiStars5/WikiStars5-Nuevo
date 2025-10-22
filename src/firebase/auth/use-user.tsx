
'use client';

import { User } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';

export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  reloadUser: () => Promise<void>;
}

export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError, reloadUser } = useFirebase();
  return { user, isUserLoading, userError, reloadUser };
};
