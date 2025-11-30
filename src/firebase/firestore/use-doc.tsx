
'use client';
    
import { useState, useEffect, useCallback } from 'react';
import {
  DocumentReference,
  getDoc,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
  refetch: () => void; // Function to manually refetch data.
}

/** Hook options. */
interface UseDocOptions {
  enabled?: boolean; // If false, the query will not be executed.
}

/**
 * React hook to fetch a single Firestore document once.
 * Handles nullable references.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {DocumentReference<DocumentData> | null | undefined} docRef -
 * The Firestore DocumentReference. Waits if null/undefined.
 * @returns {UseDocResult<T>} Object with data, isLoading, error.
 */
export function useDoc<T = any>(
  memoizedDocRef: (DocumentReference<DocumentData> & {__memo?: boolean}) | null | undefined,
  options: UseDocOptions = { enabled: true },
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(options.enabled);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!options.enabled) {
      setIsLoading(false);
      setData(null);
      setError(null);
      return;
    }

    if (!memoizedDocRef) {
      setIsLoading(true);
      setData(null);
      setError(null);
      return;
    }
    
    if (!memoizedDocRef.__memo) {
      console.warn('The query passed to useDoc was not properly memoized using useMemoFirebase. This can cause infinite loops and unexpected behavior.');
    }

    setIsLoading(true);
    setError(null);

    try {
      const snapshot = await getDoc(memoizedDocRef);
      if (snapshot.exists()) {
        setData({ ...(snapshot.data() as T), id: snapshot.id });
      } else {
        setData(null);
      }
    } catch (err: any) {
        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: memoizedDocRef.path,
        });

        setError(contextualError);
        setData(null);
        errorEmitter.emit('permission-error', contextualError);
    } finally {
        setIsLoading(false);
    }
  }, [memoizedDocRef, options.enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
