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
import { useAuth, useUser, useAdmin, useFirestore, useDoc, useMemoFirebase, useFirebaseApp, requestNotificationPermissionAndGetToken } from '@/firebase';
import { Gem, Globe, LogIn, LogOut, User as UserIcon, UserPlus, Ghost, Bell, Moon, Sun, Search, Download, Snowflake, Vote, Heart, Check, Info } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import CreateProfileFromWikipedia from '../figure/create-profile-from-wikipedia';
import CreateProfileFromWebDialog from '../figure/create-profile-from-web-dialog';
import InfoDialog from './info-dialog';
import SearchBar from './search-bar';
import NotificationBell from './notification-bell';
import Image from 'next/image';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { InstallPwaButton } from '../layout/InstallPwaButton';
import { useLanguage } from '@/context/LanguageContext';
import { useSnow } from '@/context/SnowContext';
import { saveFcmToken } from '@/firebase/notifications';
import { cn } from '@/lib/utils';

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
  const [isInfoDialogOpen, setIsInfoDialogOpen] = React.useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = React.useState(false);
  const { setTheme, theme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { isSnowing, toggleSnow } = useSnow();

  const firebaseApp = useFirebaseApp();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef, { realtime: true });
  
  const handleLogout = () => {
    if (auth) {
      auth.signOut().then(() => {
        router.push('/');
      });
    }
  };

  const handleSubscribe = async () => {
    if (!firebaseApp || !firestore || !user) {
      toast({ title: "Error", description: "Firebase no está inicializado.", variant: "destructive" });
      return;
    }
    const token = await requestNotificationPermissionAndGetToken(firebaseApp);
    if (token) {
        // Save the token and update stats
        await saveFcmToken(firestore, user.uid, token);
        toast({ title: "¡Suscrito a las notificaciones!", description: "Ahora recibirás notificaciones sobre la actividad importante." });
    } else {
        toast({ title: "No se concedió el permiso", description: "No se pudieron activar las notificaciones.", variant: "destructive" });
    }
  };

  const getAvatarFallback = () => {
    if (user?.isAnonymous) return <UserIcon className="h-5 w-5" />;
    return userProfile?.username?.charAt(0) || user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U';
  }

  const isLoading = isUserLoading || (user && isProfileLoading);
  const displayName = userProfile?.username || user?.displayName || user?.email;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 font-bold text-lg">
                <Link href="/">
                    <Image src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia%20(2).png?alt=media&token=7cdac6ec-4db8-4bda-a104-fa636e201528" alt="WikiStars5 Logo" width={24} height={24} className="h-6 w-6" />
                </Link>
                <span className="font-headline text-primary">
                    <Link href="/">WikiStars5</Link>
                </span>
            </div>
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
                <SearchBar onResultClick={() => setIsSearchDialogOpen(false)} />
            </DialogContent>
          </Dialog>

          {isLoading ? (
            <Skeleton className="h-10 w-20" />
          ) : user ? (
            <>
              <InstallPwaButton />
              <NotificationBell />
              
              <Dialog open={isCharacterDialogOpen} onOpenChange={setIsCharacterDialogOpen}>
                <CreateProfileFromWikipedia onProfileCreated={() => setIsCharacterDialogOpen(false)} />
              </Dialog>

               <Dialog open={isWebProfileDialogOpen} onOpenChange={setIsWebProfileDialogOpen}>
                <CreateProfileFromWebDialog onProfileCreated={() => setIsWebProfileDialogOpen(false)} />
              </Dialog>

              <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
                <InfoDialog />
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
                          <p className="text-sm font-medium leading-none">{displayName}</p>
                          {user.email && displayName !== user.email && (
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

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        {theme === 'light' && <Sun className="mr-2 h-4 w-4" />}
                        {theme === 'dark' && <Moon className="mr-2 h-4 w-4" />}
                        {theme === 'army' && <Heart className="mr-2 h-4 w-4" />}
                        <span>Temas</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            <DropdownMenuItem onSelect={() => setTheme('light')}>
                                <Sun className="mr-2 h-4 w-4" />
                                <span>Claro</span>
                                {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setTheme('dark')}>
                                <Moon className="mr-2 h-4 w-4" />
                                <span>Oscuro</span>
                                {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setTheme('army')}>
                                <Heart className="mr-2 h-4 w-4" />
                                <span>Morado</span>
                                {theme === 'army' && <Check className="ml-auto h-4 w-4" />}
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  <DropdownMenuItem onSelect={() => setIsInfoDialogOpen(true)}>
                    <Info className="mr-2 h-4 w-4" />
                    <span>Información</span>
                  </DropdownMenuItem>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Globe className="mr-2 h-4 w-4" />
                      <span>{t('Footer.language')}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onSelect={() => setLanguage('es')} className={cn(language === 'es' && 'bg-accent/50')}>
                          Español {language === 'es' && <Check className="ml-auto h-4 w-4" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setLanguage('en')} className={cn(language === 'en' && 'bg-accent/50')}>
                          English {language === 'en' && <Check className="ml-auto h-4 w-4" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setLanguage('pt')} className={cn(language === 'pt' && 'bg-accent/50')}>
                          Português {language === 'pt' && <Check className="ml-auto h-4 w-4" />}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  <DropdownMenuItem onSelect={toggleSnow}>
                    <Snowflake className="mr-2 h-4 w-4" />
                    <span>{isSnowing ? t('Header.disableSnow') : t('Header.enableSnow')}</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onSelect={handleSubscribe}>
                    <Bell className="mr-2 h-4 w-4" />
                    <span>{t('Header.activateNotifications')}</span>
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
            <div className="flex items-center gap-2">
              <InstallPwaButton />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><Globe className="h-5 w-5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setLanguage('es')}>Español</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setLanguage('en')}>English</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setLanguage('pt')}>Português</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
