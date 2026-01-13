
'use client';

import Link from 'next/link';
import { Logo } from '@/components/icons';
import Image from 'next/image';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '@/context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border/60 bg-card">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 items-center gap-4 px-4 py-6">
        <div className="flex items-center gap-2 font-bold text-lg justify-center md:justify-start">
          <Image src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia%20(2).png?alt=media&token=7cdac6ec-4db8-4bda-a104-fa636e201528" alt="WikiStars5 Logo" width={24} height={24} className="h-6 w-6" />
          <span className="font-headline text-primary">WikiStars5</span>
        </div>
        <p className="text-sm text-muted-foreground text-center order-last md:order-none">
          © 2025 WikiStars5.
        </p>
        <nav className="flex items-center justify-center md:justify-end gap-x-4 text-sm font-medium">
          <Link href="/rules" className="text-muted-foreground transition-colors hover:text-foreground">
            {t('Footer.rules')}
          </Link>
          <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">
            {t('Footer.privacy')}
          </Link>
          <Link href="/disclaimer" className="text-muted-foreground transition-colors hover:text-foreground">
            {t('Footer.disclaimer')}
          </Link>
          <LanguageSwitcher />
        </nav>
      </div>
    </footer>
  );
}
