'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// Import message files
import esMessages from '@/messages/es.json';
import enMessages from '@/messages/en.json';
import { useTheme } from 'next-themes';

type Language = 'es' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Define which messages to use for each language
const messages: Record<Language, any> = {
  es: esMessages,
  en: enMessages,
};

function getNestedValue(obj: any, key: string): string | undefined {
  return key.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
}


export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('es');
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // This effect runs on the client side
    const savedLanguage = localStorage.getItem('wikistars5-lang') as Language;
    if (savedLanguage && (savedLanguage === 'es' || savedLanguage === 'en')) {
      setLanguageState(savedLanguage);
      document.documentElement.lang = savedLanguage;
    } else {
        document.documentElement.lang = 'es';
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('wikistars5-lang', lang);
      document.documentElement.lang = lang;
    } catch (error) {
        console.error("Could not save language to localStorage:", error)
    }
  };

  const t = (key: string, values?: Record<string, string | number>): string => {
    let translation = getNestedValue(messages[language], key) || key;

    if (values) {
        Object.entries(values).forEach(([k, v]) => {
            if (key.includes('{theme}')) {
                // Special handling for theme
                const themeValue = resolvedTheme === 'dark' ? 'oscuro' : 'claro';
                if (language === 'en') {
                  translation = translation.replace('{theme}', resolvedTheme === 'dark' ? 'dark' : 'light');
                } else {
                  translation = translation.replace('{theme}', themeValue);
                }
            } else {
                translation = translation.replace(`{${k}}`, String(v));
            }
        });
    }

    return translation;
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
