'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import Image from 'next/image';

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
import { Badge } from '@/components/ui/badge';
import { countries } from '@/lib/countries';
import { useLanguage } from '@/context/LanguageContext';

interface MultiCountrySelectorProps {
  selected: string[] | undefined;
  onChange: (value: string[]) => void;
  className?: string;
}

export default function MultiCountrySelector({ selected, onChange, className }: MultiCountrySelectorProps) {
  const [open, setOpen] = React.useState(false);
  const { t } = useLanguage();

  const translatedCountries = React.useMemo(() => {
    return countries.map(country => ({
      ...country,
      name: t(`countries.${country.key}`),
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [t]);

  const handleSelect = (countryName: string) => {
    const currentSelected = selected || [];
    const newSelected = currentSelected.includes(countryName)
      ? currentSelected.filter((name) => name !== countryName)
      : [...currentSelected, countryName];
    onChange(newSelected);
  };
  
  const handleRemove = (countryName: string) => {
    onChange((selected || []).filter((name) => name !== countryName));
  };
  
  const safeSelected = selected || [];

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {safeSelected.length > 0
              ? `${safeSelected.length} países seleccionados`
              : 'Seleccionar países...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar país..." />
            <CommandList>
              <CommandEmpty>No se encontró el país.</CommandEmpty>
              <CommandGroup>
                {translatedCountries.map((country) => (
                  <CommandItem
                    key={country.key}
                    value={country.name}
                    onSelect={() => handleSelect(country.name)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        safeSelected.includes(country.name) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <Image
                        src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                        alt={`${country.name} flag`}
                        width={20}
                        height={15}
                        className="object-contain"
                      />
                      <span>{country.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="flex flex-wrap gap-1">
        {safeSelected.map((countryName) => {
            const country = translatedCountries.find(c => c.name === countryName);
            if (!country) return null;
            return (
                <Badge key={country.key} variant="secondary" className="flex items-center gap-1">
                    <span>{country.name}</span>
                    <button
                        type="button"
                        className="rounded-full hover:bg-muted-foreground/20"
                        onClick={() => handleRemove(country.name)}
                    >
                        <X className="h-3 w-3" />
                    </button>
                </Badge>
            )
        })}
      </div>
    </div>
  );
}
