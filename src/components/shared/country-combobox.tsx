
'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
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
import { countries } from '@/lib/countries';

interface CountryComboboxProps {
  value?: string;
  onChange: (value: string) => void;
}

export default function CountryCombobox({ value, onChange }: CountryComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedCountry = value !== 'all' ? countries.find(
    (country) => country.name === value
  ) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCountry ? (
            <div className="flex items-center gap-2">
              <Image
                src={`https://flagcdn.com/w20/${selectedCountry.code.toLowerCase()}.png`}
                alt={`${selectedCountry.name} flag`}
                width={20}
                height={15}
                className="object-contain"
              />
              <span className="truncate">{selectedCountry.name}</span>
            </div>
          ) : (
            'Todos los países'
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar país..." />
          <CommandList>
            <CommandEmpty>No se encontró el país.</CommandEmpty>
            <CommandGroup>
                <CommandItem
                    key="all-countries"
                    value="Todos los países"
                    onSelect={() => {
                        onChange('all');
                        setOpen(false);
                    }}
                >
                     <Check
                        className={cn(
                        'mr-2 h-4 w-4',
                        value === 'all'
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                    />
                    Todos los países
                </CommandItem>
              {countries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.name}
                  onSelect={(currentValue) => {
                    onChange(
                      currentValue.toLowerCase() === value?.toLowerCase() ? 'all' : country.name
                    );
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === country.name
                        ? 'opacity-100'
                        : 'opacity-0'
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
  );
}
