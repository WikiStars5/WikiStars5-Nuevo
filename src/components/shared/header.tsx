'use client';

import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { useAuth, useUser, useAdmin } from '@/firebase';
import { Gem, LogOut, User as UserIcon } from 'lucide-react';
import { Input } from '../ui/input';
import { Search } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

export default function Header() {
  const { user, isUserLoading } = useUser();
  const { isAdmin } = useAdmin();
  const auth = useAuth();

  const handleLogout = () => {
    if (auth) {
      auth.signOut();
    }
  };

  const getAvatarFallback = () => {
    if (user?.isAnonymous) return 'G';
    return user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U';
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                <Logo className="h-6 w-6 text-primary" />
                <span className="font-headline text-primary">WikiStars5</span>
            </Link>
            <div className="hidden md:block relative min-w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Buscar perfiles o #hashtags"
                className="w-full pl-9 pr-4 py-2 h-10 text-sm rounded-full bg-card border-border/60"
                />
            </div>
        </div>

        <div className="flex items-center gap-4">
          {isUserLoading ? (
            <Skeleton className="h-10 w-10 rounded-full" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border-2 border-primary">
                    <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
                    <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.isAnonymous ? 'Guest User' : (user.displayName || user.email)}</p>
                    {!user.isAnonymous && (
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {isAdmin && (
                    <>
                    <DropdownMenuItem asChild>
                        <Link href="/admin">
                        <Gem className="mr-2 h-4 w-4" />
                        <span>Panel de Administrador</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    </>
                )}

                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            null
          )}
        </div>
      </div>
    </header>
  );
}
