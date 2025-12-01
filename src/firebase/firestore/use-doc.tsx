
'use client';
    
import { useState, useEffect, useCallback } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
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
 * React hook to fetch a single Firestore document in real-time.
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

  const fetchData = useCallback(() => {
    if (!options.enabled || !memoizedDocRef) {
      setIsLoading(!options.enabled);
      setData(null);
      setError(null);
      return () => {}; // Return an empty unsubscribe function
    }

    if (!memoizedDocRef.__memo) {
      console.warn('The query passed to useDoc was not properly memoized using useMemoFirebase. This can cause infinite loops and unexpected behavior.');
    }

    setIsLoading(true);

    const unsubscribe = onSnapshot(
      memoizedDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ ...(snapshot.data() as T), id: snapshot.id });
        } else {
          setData(null);
        }
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: memoizedDocRef.path,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false);
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return unsubscribe;
  }, [memoizedDocRef, options.enabled]);

  useEffect(() => {
    const unsubscribe = fetchData();
    return () => unsubscribe();
  }, [fetchData]);
  
  // The refetch function for onSnapshot is essentially just re-running the effect.
  // This is handled by making the component that uses the hook re-render.
  // For simplicity, we'll just re-trigger the internal fetchData.
  const refetch = useCallback(() => {
    // This will trigger the useEffect to re-subscribe
    fetchData();
  }, [fetchData]);


  return { data, isLoading, error, refetch };
}

