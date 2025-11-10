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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { useAuth, useUser, useAdmin, useFirestore } from '@/firebase';
import { Gem, Globe, LogIn, LogOut, User as UserIcon, UserPlus, Ghost, Bell, Moon, Sun } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Dialog, DialogTrigger } from '../ui/dialog';
import CreateProfileFromWikipedia from '../figure/create-profile-from-wikipedia';
import CreateProfileFromWebDialog from '../figure/create-profile-from-web-dialog';
import SearchBar from './search-bar';
import NotificationBell from './notification-bell';
import Image from 'next/image';
import { collection, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from 'next-themes';
import { InstallPwaButton } from './InstallPwaButton';


export default function Header() {
  const { user, isUserLoading } = useUser();
  const { isAdmin } = useAdmin();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isCharacterDialogOpen, setIsCharacterDialogOpen] = React.useState(false);
  const [isWebProfileDialogOpen, setIsWebProfileDialogOpen] = React.useState(false);
  const { setTheme, theme } = useTheme();
  
  React.useEffect(() => {
    // This effect runs only on the client after hydration
    const searchParams = new URLSearchParams(window.location.search);
    const referrerId = searchParams.get('ref');
    const figureMatch = window.location.pathname.match(/\/figures\/([^?\/]+)/);
    const sourceFigureId = figureMatch ? figureMatch[1] : null;

    if (referrerId) {
      localStorage.setItem('referrerId', referrerId);
      if (sourceFigureId) {
        localStorage.setItem('sourceFigureId', sourceFigureId);
      } else {
        // If there's a referrer but no figure, clear any old sourceFigureId
        localStorage.removeItem('sourceFigureId');
      }
    }
  }, [pathname]); // Rerun if the path changes

  const handleLogout = () => {
    if (auth) {
      auth.signOut();
      router.push('/');
    }
  };

  const handleRandomProfile = async () => {
    if (!firestore) return;
    toast({ title: 'Buscando un perfil aleatorio...' });
    try {
        const figuresCollection = collection(firestore, 'figures');
        const figuresSnapshot = await getDocs(figuresCollection);
        const figureIds = figuresSnapshot.docs.map(doc => doc.id);

        if (figureIds.length > 0) {
            const randomIndex = Math.floor(Math.random() * figureIds.length);
            const randomFigureId = figureIds[randomIndex];
            router.push(`/figures/${randomFigureId}`);
        } else {
            toast({
                title: 'No se encontraron perfiles',
                description: 'Aún no hay perfiles para mostrar.',
                variant: 'destructive',
            });
        }
    } catch (error) {
        console.error("Error fetching random profile:", error);
        toast({
            title: 'Error',
            description: 'No se pudo obtener un perfil aleatorio.',
            variant: 'destructive',
        });
    }
  };

  const getAvatarFallback = () => {
    return user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U';
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                <Image src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia.png?alt=media&token=fb7367da-8db6-4f1d-a1f0-d03f57e6b9f6" alt="WikiStars5 Logo" width={24} height={24} className="h-6 w-6" />
                <span className="font-headline text-primary">WikiStars5</span>
            </Link>
            <div className="hidden md:block w-96">
              <SearchBar />
            </div>
        </div>

        <div className="flex items-center gap-2">
          <InstallPwaButton />
          {isUserLoading ? (
            <Skeleton className="h-10 w-20" />
          ) : user ? (
            <>
              <NotificationBell />
              <Dialog open={isCharacterDialogOpen} onOpenChange={setIsCharacterDialogOpen}>
                <CreateProfileFromWikipedia onProfileCreated={() => setIsCharacterDialogOpen(false)} />
              </Dialog>

               <Dialog open={isWebProfileDialogOpen} onOpenChange={setIsWebProfileDialogOpen}>
                <CreateProfileFromWebDialog onProfileCreated={() => setIsWebProfileDialogOpen(false)} />
              </Dialog>

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
                      <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
                      {user.email && (
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

                  <DropdownMenuItem onSelect={handleRandomProfile}>
                    <Ghost className="mr-2 h-4 w-4" />
                    <span>Perfil Aleatorio</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onSelect={() => setIsCharacterDialogOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>Crear Perfil de Personaje</span>
                  </DropdownMenuItem>
                  
                  {isAdmin && (
                    <DropdownMenuItem onSelect={() => setIsWebProfileDialogOpen(true)}>
                      <Globe className="mr-2 h-4 w-4" />
                      <span>Crear Perfil Web</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onSelect={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                    {theme === 'light' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                    <span>Cambiar a modo {theme === 'light' ? 'oscuro' : 'claro'}</span>
                  </DropdownMenuItem>
                  
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
                {pathname !== '/login' && (
                  <Button asChild>
                      <Link href="/login">
                          <LogIn className="mr-2 h-4 w-4" />
                          Iniciar Sesión
                      </Link>
                  </Button>
                )}
             </div>
          )}
        </div>
      </div>
    </header>
  );
}
