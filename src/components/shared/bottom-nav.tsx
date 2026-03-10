'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, Ghost, Users } from 'lucide-react';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const { user } = useUser();
  const pathname = usePathname();

  const navItems = [
    {
      label: 'FEED',
      href: '/',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      label: 'SIGUIENDO',
      href: '/siguiendo',
      icon: Users,
      isActive: pathname === '/siguiendo',
    },
    {
      label: 'MI PERFIL',
      href: user ? '/profile' : '/login',
      icon: user ? User : Ghost,
      isActive: pathname === '/profile' || pathname === '/login',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background border-t border-border/60 flex items-center justify-around px-4">
      {navItems.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-full h-full transition-colors",
            item.isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <item.icon className={cn("h-6 w-6", item.isActive && "fill-current")} />
          <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
