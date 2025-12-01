
'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// Import message files
import esMessages from '@/messages/es.json';
import enMessages from '@/messages/en.json';
import ptMessages from '@/messages/pt.json';
import zhMessages from '@/messages/zh.json';
import frMessages from '@/messages/fr.json';
import itMessages from '@/messages/it.json';
import deMessages from '@/messages/de.json';

type Language = 'es' | 'en' | 'pt'; // | 'zh' | 'fr' | 'it' | 'de';

const supportedLanguages: Language[] = ['es', 'en', 'pt'];

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Define which messages to use for each language
const messages: Record<Language, any> = {
  es: esMessages,
  en: enMessages,
  pt: ptMessages,
  // zh: zhMessages,
  // fr: frMessages,
  // it: itMessages,
  // de: deMessages,
};

function getNestedValue(obj: any, key: string): string | undefined {
  return key.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
}


export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('es'); // Default to Spanish initially

  useEffect(() => {
    // This effect runs only on the client side
    const savedLanguage = localStorage.getItem('wikistars5-lang') as Language;
    
    if (savedLanguage && supportedLanguages.includes(savedLanguage)) {
      setLanguageState(savedLanguage);
    } else {
      // If no language is saved, detect from browser
      const browserLang = navigator.language.split('-')[0] as Language;
      if (supportedLanguages.includes(browserLang)) {
        setLanguageState(browserLang);
      }
      // Otherwise, it stays on the default 'es'
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('wikistars5-lang', lang);
    } catch (error) {
        console.error("Could not save language to localStorage:", error)
    }
  };

  const t = (key: string): string => {
    const value = getNestedValue(messages[language], key);
    // If translation is missing for the current language, fall back to English
    if (value === undefined || value === '') {
        return getNestedValue(messages['en'], key) || key;
    }
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
