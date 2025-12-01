'use client';

import Footer from '@/components/shared/footer';
import Header from '@/components/shared/header';
import { LanguageProvider } from '@/context/LanguageContext';

export const dynamic = 'force-dynamic';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <LanguageProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </LanguageProvider>
  );
}
