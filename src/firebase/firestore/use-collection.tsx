
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Query,
  getDocs,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
  refetch: () => void; // Function to manually refetch data
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

interface UseCollectionOptions {
  onNewData?: (snapshot: QuerySnapshot<DocumentData>) => void;
  enabled?: boolean;
}

/**
 * React hook to fetch a Firestore collection or query ONE TIME.
 * Handles nullable references/queries.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemoFirebase to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
    options: UseCollectionOptions = { enabled: true }
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(options.enabled ?? true); 
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  
  const fetchData = useCallback(async () => {
    if (!memoizedTargetRefOrQuery || (options.enabled === false)) {
      setIsLoading(false);
      setData(null);
      setError(null);
      return;
    }

    if (!memoizedTargetRefOrQuery.__memo) {
      console.warn('The query passed to useCollection was not properly memoized using useMemoFirebase. This can cause infinite loops and unexpected behavior.');
    }

    setIsLoading(true);

    try {
      const snapshot = await getDocs(memoizedTargetRefOrQuery);
      const results: ResultItemType[] = snapshot.docs.map(doc => ({ ...(doc.data() as T), id: doc.id }));
      setData(results);
      setError(null);
      options.onNewData?.(snapshot);
    } catch (err: any) {
      let path = 'unknown';
      try {
        path = memoizedTargetRefOrQuery.type === 'collection'
          ? (memoizedTargetRefOrQuery as CollectionReference).path
          : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString();
      } catch (e) {
        console.warn("Could not determine path for useCollection permission error.");
      }

      const contextualError = new FirestorePermissionError({
        operation: 'list',
        path: path,
      });

      setError(contextualError);
      setData(null);
      errorEmitter.emit('permission-error', contextualError);
    } finally {
        setIsLoading(false);
    }
  }, [memoizedTargetRefOrQuery, options.enabled, options.onNewData]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
