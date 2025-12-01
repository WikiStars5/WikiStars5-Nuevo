
'use client';

import Footer from '@/components/shared/footer';
import Header from '@/components/shared/header';
import SnowAnimation from '@/components/shared/snow-animation';
import { useSnow } from '@/context/SnowContext';

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
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
  );
}
