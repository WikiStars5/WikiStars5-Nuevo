'use client';

import * as React from 'react';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card pb-20 md:pb-6">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-6">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Image src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Festrellados%20(3).jpg?alt=media&token=4c5ff945-b737-4bd6-bb41-98b609c654c9" alt="Starryz5 Logo" width={24} height={24} className="h-6 w-6 rounded-full" />
          <span className="font-headline text-primary">Starryz5</span>
        </div>
        <p className="text-xs text-muted-foreground">
          © 2026 Starryz5. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}