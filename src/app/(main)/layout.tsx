'use client';

import Footer from '@/components/shared/footer';
import Header from '@/components/shared/header';
import BottomNav from '@/components/shared/bottom-nav';
import SnowAnimation from '@/components/shared/snow-animation';
import { useSnow } from '@/context/SnowContext';
import KonamiCodeListener from '@/components/shared/KonamiCodeListener';

export const dynamic = 'force-dynamic';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isSnowing } = useSnow();

  return (
      <div className="flex min-h-screen flex-col bg-background">
        {isSnowing && <SnowAnimation />}
        <KonamiCodeListener />
        <Header />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <Footer />
        <BottomNav />
      </div>
  );
}
