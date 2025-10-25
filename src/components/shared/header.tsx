
'use client';

import Link from 'next/link';
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { useAuth, useUser, useAdmin } from '@/firebase';
import { Gem, Globe, LogIn, LogOut, User as UserIcon, UserPlus, Ghost } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Dialog, DialogTrigger } from '../ui/dialog';
import CreateProfileFromWikipedia from '../figure/create-profile-from-wikipedia';
import CreateProfileFromWebDialog from '../figure/create-profile-from-web-dialog';
import SearchBar from './search-bar';
import { ThemeToggle } from './ThemeToggle';
import { InstallPwaButton } from './InstallPwaButton';

export default function Header() {
  const { user, isUserLoading } = useUser();
  const { isAdmin } = useAdmin();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isCharacterDialogOpen, setIsCharacterDialogOpen] = React.useState(false);
  const [isWebProfileDialogOpen, setIsWebProfileDialogOpen] = React.useState(false);

  const handleLogout = () => {
    if (auth) {
      auth.signOut();
      router.push('/');
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
            <div className="hidden md:block w-96">
              <SearchBar />
            </div>
        </div>

        <div className="flex items-center gap-2">
          {isUserLoading ? (
            <Skeleton className="h-10 w-10 rounded-full" />
          ) : user ? (
            <>
              <Dialog open={isCharacterDialogOpen} onOpenChange={setIsCharacterDialogOpen}>
                <CreateProfileFromWikipedia onProfileCreated={() => setIsCharacterDialogOpen(false)} />
              </Dialog>

               <Dialog open={isWebProfileDialogOpen} onOpenChange={setIsWebProfileDialogOpen}>
                <CreateProfileFromWebDialog onProfileCreated={() => setIsWebProfileDialogOpen(false)} />
              </Dialog>

              <InstallPwaButton />

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
                  
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Mi Perfil</span>
                    </Link>
                  </DropdownMenuItem>

                  {isAdmin && (
                      <>
                      <DropdownMenuItem asChild>
                          <Link href="/admin">
                          <Gem className="mr-2 h-4 w-4" />
                          <span>Panel de Administrador</span>
                          </Link>
                      </DropdownMenuItem>
                      </>
                  )}
                  
                  <DropdownMenuSeparator />

                  <DropdownMenuItem onSelect={() => setIsCharacterDialogOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>Crear Perfil de Personaje</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onSelect={() => setIsWebProfileDialogOpen(true)}>
                    <Globe className="mr-2 h-4 w-4" />
                    <span>Crear Perfil Web</span>
                  </DropdownMenuItem>

                  <ThemeToggle />

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
             <div className="flex items-center gap-2">
                <Button asChild>
                    <Link href="/admin/login">
                        <LogIn className="mr-2 h-4 w-4" />
                        Iniciar Sesión
                    </Link>
                </Button>
             </div>
          )}
        </div>
      </div>
    </header>
  );
}
