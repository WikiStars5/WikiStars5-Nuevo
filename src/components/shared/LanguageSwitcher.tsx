'use client';

import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import Image from 'next/image';

export default function LanguageSwitcher() {
  // Placeholder for language state
  const [selectedLanguage, setSelectedLanguage] = React.useState('es');

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    // Logic to change the site's language will be added here later.
    console.log('Language changed to:', lang);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="text-muted-foreground transition-colors hover:text-foreground">
          <Globe className="mr-2 h-4 w-4" />
          Idioma
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => handleLanguageChange('es')}>
          <div className="flex items-center gap-2">
            <Image
              src="https://flagcdn.com/w20/es.png"
              alt="Bandera de España"
              width={20}
              height={15}
            />
            <span>Español</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleLanguageChange('en')}>
          <div className="flex items-center gap-2">
            <Image
              src="https://flagcdn.com/w20/us.png"
              alt="Bandera de Estados Unidos"
              width={20}
              height={15}
            />
            <span>English</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
