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
import { useAuth, useUser, useAdmin, useFirestore, signInWithPopup, GoogleAuthProvider, useDoc, useMemoFirebase, useFirebaseApp, requestNotificationPermissionAndGetToken } from '@/firebase';
import { Gem, Globe, LogIn, LogOut, User as UserIcon, UserPlus, Ghost, Bell, Moon, Sun, Search, Download, Snowflake, Vote } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import CreateProfileFromWikipedia from '../figure/create-profile-from-wikipedia';
import CreateProfileFromWebDialog from '../figure/create-profile-from-web-dialog';
import SearchBar from './search-bar';
import NotificationBell from './notification-bell';
import Image from 'next/image';
import { collection, getDocs, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from './ThemeToggle';
import { InstallPwaButton } from '../layout/InstallPwaButton';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/context/LanguageContext';
import { useSnow } from '@/context/SnowContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


export default function Header() {
  const { user, isUserLoading, reloadUser } = useUser();
  const { isAdmin } = useAdmin();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isCharacterDialogOpen, setIsCharacterDialogOpen] = React.useState(false);
  const [isWebProfileDialogOpen, setIsWebProfileDialogOpen] = React.useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = React.useState(false);
  const { setTheme, theme } = useTheme();
  const { t } = useLanguage();
  const { isSnowing, toggleSnow } = useSnow();

  const firebaseApp = useFirebaseApp();

  // New logic: Check if a user profile document exists for the current user
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef, { realtime: true });
  
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
      auth.signOut().then(() => {
        router.push('/');
      });
    }
  };

  const handleLogin = () => {
    router.push('/login');
  }

  const handleSubscribe = async () => {
    if (!firebaseApp) {
      toast({
          title: "Error",
          description: "Firebase no está inicializado.",
          variant: "destructive",
      });
      return;
    }
    const token = await requestNotificationPermissionAndGetToken(firebaseApp);
    if (token) {
        toast({
            title: "¡Suscrito a las notificaciones!",
            description: "Ahora recibirás notificaciones sobre la actividad importante.",
        });
    } else {
        toast({
            title: "No se concedió el permiso",
            description: "No se pudieron activar las notificaciones.",
            variant: "destructive"
        })
    }
  };

  const getAvatarFallback = () => {
    if (user?.isAnonymous) return <UserIcon className="h-5 w-5" />;
    return userProfile?.username?.charAt(0) || user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U';
  }

  const isLoading = isUserLoading || (user && isProfileLoading);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                <Image src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia%20(2).png?alt=media&token=7cdac6ec-4db8-4bda-a104-fa636e201528" alt="WikiStars5 Logo" width={24} height={24} className="h-6 w-6" />
                <span className="font-headline text-primary">WikiStars5</span>
            </Link>
            <div className="hidden md:block w-96">
              <SearchBar />
            </div>
        </div>

        <div className="flex items-center gap-1">
          <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Search className="h-5 w-5" />
                    <span className="sr-only">Buscar</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="top-20 translate-y-0 sm:top-1/2 sm:-translate-y-1/2">
                <DialogHeader className="sr-only">
                    <DialogTitle>Buscar</DialogTitle>
                    <DialogDescription>Busca un perfil en WikiStars5.</DialogDescription>
                </DialogHeader>
                <SearchBar onResultClick={() => setIsSearchDialogOpen(false)} />
            </DialogContent>
          </Dialog>

          <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button onClick={handleSubscribe} variant="ghost" size="icon" aria-label="Activar notificaciones">
                        <Bell className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Activar notificaciones</p>
                </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {isLoading ? (
            <Skeleton className="h-10 w-20" />
          ) : user ? (
            <>
              <InstallPwaButton />
              {!user.isAnonymous && <NotificationBell />}
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
                      <AvatarImage src={user.isAnonymous ? undefined : user?.photoURL || undefined} alt={userProfile?.username || user?.displayName || 'User'} />
                      <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  
                  {user.isAnonymous ? (
                    <>
                      <DropdownMenuLabel>{t('Header.guestMenuTitle')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/profile">
                          <UserIcon className="mr-2 h-4 w-4" />
                          <span>{t('Header.myProfile')}</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{userProfile?.username || user.displayName || user.email}</p>
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
                          <span>{t('Header.myProfile')}</span>
                        </Link>
                      </DropdownMenuItem>

                      {isAdmin && (
                          <>
                            <DropdownMenuItem asChild>
                                <Link href="/admin">
                                <Gem className="mr-2 h-4 w-4" />
                                <span>{t('Header.adminPanel')}</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/elecciones-2026">
                                <Vote className="mr-2 h-4 w-4" />
                                <span>Elecciones 2026</span>
                                </Link>
                            </DropdownMenuItem>
                          </>
                      )}
                    </>
                  )}
                  
                  <DropdownMenuSeparator />

                  <DropdownMenuItem onSelect={() => setIsCharacterDialogOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>{t('Header.createCharacterProfile')}</span>
                  </DropdownMenuItem>
                  
                  {isAdmin && (
                    <DropdownMenuItem onSelect={() => setIsWebProfileDialogOpen(true)}>
                      <Globe className="mr-2 h-4 w-4" />
                      <span>{t('Header.createWebProfile')}</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onSelect={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                    {theme === 'light' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                    <span>{theme === 'light' ? t('Header.changeToDarkMode') : t('Header.changeToLightMode')}</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onSelect={toggleSnow}>
                    <Snowflake className="mr-2 h-4 w-4" />
                    <span>{isSnowing ? t('Header.disableSnow') : t('Header.enableSnow')}</span>
                  </DropdownMenuItem>
                  
                  {!user.isAnonymous && (
                    <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{t('Header.logout')}</span>
                    </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            pathname === '/' && (
              <Button onClick={handleLogin}>
                <LogIn className="mr-2 h-4 w-4" />
                {t('Header.login')}
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
