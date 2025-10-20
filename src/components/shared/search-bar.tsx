
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Search, Loader2, ImageOff, XCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { Figure } from '@/lib/types';
import { searchFiguresByHashtag } from '@/app/actions/searchHashtagsAction';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { collection, query as firestoreQuery, where, getDocs, limit } from 'firebase/firestore';
import { normalizeText } from '@/lib/keywords';

// Debounce function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
}

/**
 * Corrects a malformed URL, typically by ensuring it has a protocol.
 * This is useful for image sources that might be missing 'https://'.
 * @param url The URL string to correct.
 * @returns A corrected, valid URL string, or an empty string if the input is invalid.
 */
function correctMalformedUrl(url: string | undefined | null): string {
  if (!url) {
    return '';
  }
  // If it already has a protocol, assume it's correct.
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // If it starts with '//', prepend 'https:'
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  // Otherwise, assume it's a domain and prepend 'https://'
  return `https://${url}`;
}

interface SearchBarProps {
  initialQuery?: string;
  className?: string;
  onResultClick?: (figure: Figure) => void;
}


export default function SearchBar({ 
  initialQuery = '', 
  className,
  onResultClick
}: SearchBarProps) {
  const [currentQuery, setCurrentQuery] = useState(initialQuery);
  const [figureResults, setFigureResults] = useState<Figure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const firestore = useFirestore();

  const searchFiguresByName = async (searchTerm: string): Promise<Figure[]> => {
    const normalizedSearchTerm = normalizeText(searchTerm);
    if (normalizedSearchTerm.length < 1 || !firestore) {
      return [];
    }

    try {
      const figuresCollection = collection(firestore, 'figures');
      const q = firestoreQuery(
          figuresCollection,
          where('nameKeywords', 'array-contains', normalizedSearchTerm),
          limit(10)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return [];
      }
      
      const figures = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id,
              name: data.name,
              imageUrl: data.imageUrl,
              imageHint: data.imageHint,
              nationality: data.nationality,
              tags: data.tags,
              isFeatured: data.isFeatured,
              nameKeywords: data.nameKeywords,
              approved: data.approved,
              description: data.description,
              photoUrl: data.photoUrl,
          } as Figure;
      });
      
      figures.sort((a, b) => a.name.localeCompare(b.name));

      return figures;
    } catch (error) {
      console.error('Error searching figures by name:', error);
      return [];
    }
  }


  const handleSearchSubmit = (searchTerm: string) => {
    const trimmedTerm = searchTerm.trim();
    if (trimmedTerm.startsWith('#')) {
      const hashtag = trimmedTerm.substring(1).toLowerCase();
      if (hashtag) {
        router.push(`/figures/hashtagged/${encodeURIComponent(hashtag)}`);
        clearSearch();
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearchSubmit(currentQuery);
    }
  };

  const debouncedSearch = useCallback(
    debounce(async (searchTerm: string) => {
      if (!firestore) {
        setIsLoading(false);
        return;
      };

      const trimmedSearch = searchTerm.trim();
      if (trimmedSearch.length < 1) { // Allow search from 1 character
        setFigureResults([]);
        setIsLoading(false);
        setIsDropdownOpen(trimmedSearch.length > 0);
        return;
      }

      setIsLoading(true);
      setIsDropdownOpen(true);
      
      try {
        let figures: Figure[] = [];
        if (trimmedSearch.startsWith('#')) {
          const hashtagQuery = trimmedSearch.substring(1);
          figures = await searchFiguresByHashtag(hashtagQuery);
        } else {
          figures = await searchFiguresByName(trimmedSearch);
        }
        setFigureResults(figures);
      } catch (error) {
        console.error("Search error:", error);
        setFigureResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300), 
    [firestore]
  );

  useEffect(() => {
    if (initialQuery.trim().length >= 1) {
      debouncedSearch(initialQuery);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  useEffect(() => {
    if (currentQuery.trim() === '') {
      setFigureResults([]);
      setIsLoading(false);
      setIsDropdownOpen(false);
      return;
    }
    debouncedSearch(currentQuery);
  }, [currentQuery, debouncedSearch]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchContainerRef]);

  const handleResultItemClick = () => {
    clearSearch();
  };

  const handleFigureResultClick = (figure: Figure) => {
    handleResultItemClick();
    if (onResultClick) {
      onResultClick(figure);
    }
  };

  const clearSearch = () => {
    setCurrentQuery('');
    setFigureResults([]);
    setIsDropdownOpen(false);
    inputRef.current?.focus(); 
  };

  const hasNoResults = !isLoading && currentQuery.trim().length >= 1 && figureResults.length === 0;

  return (
    <div className={cn("relative w-full max-w-lg mx-auto", className)} ref={searchContainerRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Buscar perfiles o #hashtags"
          value={currentQuery}
          onChange={(e) => setCurrentQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { 
            if (currentQuery.trim().length > 0) setIsDropdownOpen(true);
          }}
          className="text-sm h-10 flex-grow pl-10 pr-10 rounded-full shadow-sm border-border/60 focus:ring-1 focus:ring-primary/50"
        />
        {isLoading && currentQuery.length >= 1 && (
           <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
        )}
        {!isLoading && currentQuery.length > 0 && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>

      {isDropdownOpen && currentQuery.trim().length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-80 overflow-y-auto">
          {isLoading && currentQuery.trim().length >=1 && (
            <div className="p-3 text-xs text-center text-muted-foreground">Buscando...</div>
          )}
          {hasNoResults && (
            <div className="p-3 text-xs text-center text-muted-foreground">No se encontraron resultados para "{currentQuery}".</div>
          )}
          {!isLoading && currentQuery.trim().length < 1 && (
             <div className="p-3 text-xs text-center text-muted-foreground">Escribe al menos 1 caracter.</div>
          )}

          {/* Figure Results */}
          {figureResults.length > 0 && (
            <ul className="divide-y divide-border">
              {figureResults.map((figure) => (
                <li key={figure.id}>
                  {onResultClick ? (
                     <button
                      onClick={() => handleFigureResultClick(figure)}
                      className="w-full flex items-center p-2 hover:bg-muted transition-colors duration-150 ease-in-out text-left"
                    >
                      <div className="flex-shrink-0 mr-2">
                      {figure.imageUrl ? (
                        <Image
                          src={correctMalformedUrl(figure.imageUrl)}
                          alt={figure.name}
                          width={32}
                          height={40}
                          className="rounded-sm object-cover aspect-[4/5]"
                          data-ai-hint="thumbnail person"
                        />
                      ) : (
                        <div className="w-8 h-10 bg-muted rounded-sm flex items-center justify-center" data-ai-hint="placeholder icon">
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-medium text-xs text-foreground truncate">{figure.name}</p>
                      {figure.description && (
                        <p className="text-xs text-muted-foreground truncate">{figure.description}</p>
                      )}
                    </div>
                     </button>
                  ) : (
                  <Link
                    href={`/figures/${figure.id}`}
                    onClick={handleResultItemClick}
                    className="flex items-center p-2 hover:bg-muted transition-colors duration-150 ease-in-out"
                  >
                    <div className="flex-shrink-0 mr-2">
                      {figure.imageUrl ? (
                        <Image
                          src={correctMalformedUrl(figure.imageUrl)}
                          alt={figure.name}
                          width={32}
                          height={40}
                          className="rounded-sm object-cover aspect-[4/5]"
                          data-ai-hint="thumbnail person"
                        />
                      ) : (
                        <div className="w-8 h-10 bg-muted rounded-sm flex items-center justify-center" data-ai-hint="placeholder icon">
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-medium text-xs text-foreground truncate">{figure.name}</p>
                      {currentQuery.startsWith('#') 
                        ? <p className="text-xs text-muted-foreground truncate">Coincidencia por hashtag</p>
                        : figure.description && <p className="text-xs text-muted-foreground truncate">{figure.description}</p>
                      }
                    </div>
                  </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
