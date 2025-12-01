'use client';

import Footer from '@/components/shared/footer';
import Header from '@/components/shared/header';
import SnowAnimation from '@/components/shared/snow-animation';

export const dynamic = 'force-dynamic';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
      <div className="flex min-h-screen flex-col bg-background">
        <SnowAnimation />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
  );
}
