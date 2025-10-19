'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';

import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { searchFigures } from '@/app/actions/search';
import type { Figure } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 300);
  const [results, setResults] = useState<Figure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.trim().length > 0) {
        setIsLoading(true);
        const figures = await searchFigures(debouncedQuery);
        setResults(figures);
        setIsLoading(false);
      } else {
        setResults([]);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      // Potentially navigate to a full search results page
      // For now, we can just clear focus
      e.currentTarget.blur();
      setIsFocused(false);
    }
  };

  const handleResultClick = () => {
    setQuery('');
    setResults([]);
    setIsFocused(false);
  };

  return (
    <div className="relative min-w-80" ref={searchContainerRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Buscar perfiles o #hashtags"
        className="w-full pl-9 pr-4 py-2 h-10 text-sm rounded-full bg-card border-border/60"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onKeyDown={handleKeyDown}
      />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
      )}

      {isFocused && (debouncedQuery.length > 0 || results.length > 0) && (
        <div className="absolute top-full mt-2 w-full rounded-md bg-card border border-border shadow-lg z-50 overflow-hidden">
          {results.length > 0 && (
            <ul>
              {results.map((figure) => (
                <li key={figure.id}>
                  <Link
                    href={`/figures/${figure.id}`}
                    onClick={handleResultClick}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors"
                  >
                    <div className="relative h-10 w-10 flex-shrink-0">
                      <Image
                        src={figure.imageUrl}
                        alt={figure.name}
                        fill
                        className="rounded-full object-cover"
                      />
                    </div>
                    <div className='min-w-0'>
                      <p className="font-semibold truncate">{figure.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{figure.nationality}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {!isLoading && debouncedQuery.length > 0 && results.length === 0 && (
             <div className="p-4 text-sm text-center text-muted-foreground">
              No se encontraron resultados para "{debouncedQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
