'use client';

import Footer from '@/components/shared/footer';
import Header from '@/components/shared/header';
import BottomNav from '@/components/shared/bottom-nav';
import SnowAnimation from '@/components/shared/snow-animation';
import { useSnow } from '@/context/SnowContext';
import KonamiCodeListener from '@/components/shared/KonamiCodeListener';
import ExternalBrowserRedirect from '@/components/shared/external-browser-redirect';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const snow = useSnow();
  const isSnowing = snow?.isSnowing ?? false;

  return (
      <div className="flex min-h-screen flex-col bg-background">
        <ExternalBrowserRedirect />
        {isSnowing && <SnowAnimation />}
        <KonamiCodeListener />
        <Header />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <Footer />
        <BottomNav />
      </div>
  );
}
