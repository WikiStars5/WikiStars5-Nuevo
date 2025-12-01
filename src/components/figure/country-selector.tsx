
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
import { useLanguage } from '@/context/LanguageContext';

interface CountrySelectorProps {
  value?: string;
  onChange: (value: string) => void;
}

export function CountrySelector({ value, onChange }: CountrySelectorProps) {
  const [open, setOpen] = React.useState(false);
  const { t } = useLanguage();

  const countryName = value ? t(`countries.${value.toLowerCase().replace(/ /g, '_')}`) : '';

  const translatedCountries = React.useMemo(() => {
    return countries.map(country => ({
      ...country,
      name: t(`countries.${country.key}`),
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [t]);


  const selectedCountry = value ? translatedCountries.find(
    (country) => country.name.toLowerCase() === countryName?.toLowerCase()
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
                alt={`${countryName} flag`}
                width={20}
                height={15}
                className="object-contain"
              />
              <span className="truncate">{countryName}</span>
            </div>
          ) : (
            t('EditFigure.countrySelector.placeholder')
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={t('EditFigure.countrySelector.searchPlaceholder')} />
          <CommandList>
            <CommandEmpty>{t('EditFigure.countrySelector.noResults')}</CommandEmpty>
            <CommandGroup>
              {translatedCountries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.name}
                  onSelect={(currentValue) => {
                    // Find original english name to store
                    const originalCountry = countries.find(c => t(`countries.${c.key}`).toLowerCase() === currentValue.toLowerCase());
                    onChange(
                      originalCountry ? t(`countries.${originalCountry.key}`) : ''
                    );
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      countryName?.toLowerCase() === country.name.toLowerCase()
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
