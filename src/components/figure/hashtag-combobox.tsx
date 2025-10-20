'use client';

import * as React from 'react';
import { useDebounce } from 'use-debounce';
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { searchHashtags } from '@/app/actions/searchHashtagsAction';
import { Input } from '@/components/ui/input';

interface HashtagComboboxProps {
    inputValue: string;
    onInputChange: (value: string) => void;
    onTagSelect: (tag: string) => void;
}

export default function HashtagCombobox({ inputValue, onInputChange, onTagSelect }: HashtagComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [debouncedSearchTerm] = useDebounce(inputValue, 300);

  React.useEffect(() => {
    const fetchOptions = async () => {
      if (debouncedSearchTerm.length < 1) {
        setOptions([]);
        return;
      }
      setIsLoading(true);
      const results = await searchHashtags(debouncedSearchTerm);
      setOptions(results);
      setIsLoading(false);
    };

    fetchOptions();
  }, [debouncedSearchTerm]);

  const handleSelect = (currentValue: string) => {
    onTagSelect(currentValue);
    onInputChange(''); // Clear input after selection
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder="Buscar o crear hashtag..."
                className="pl-9"
                onFocus={() => setOpen(true)}
            />
             {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
            <CommandList>
                {options.length === 0 && !isLoading && inputValue.length > 0 && (
                     <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                )}
                {options.length > 0 && (
                    <CommandGroup heading="Sugerencias">
                        {options.map((tag) => (
                            <CommandItem
                            key={tag}
                            value={tag}
                            onSelect={handleSelect}
                            >
                            #{tag}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
            </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
