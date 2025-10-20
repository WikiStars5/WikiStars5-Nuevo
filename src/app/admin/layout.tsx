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
import { Bell, Download, Gem, Home, LogOut } from 'lucide-react';
import SearchBar from '@/components/shared/search-bar';
import { Shield, ShieldAlert } from 'lucide-react';
import { useAuth, useUser, useAdmin } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function AccessDenied() {
  const router = useRouter();

  useEffect(() => {
    // After showing the message for a moment, redirect to the home page.
    const timer = setTimeout(() => {
      router.push('/');
    }, 3000); // 3-second delay before redirecting

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <ShieldAlert className="h-16 w-16 text-destructive" />
      <h1 className="text-3xl font-bold">Acceso Denegado</h1>
      <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
      <p className="text-sm text-muted-foreground">Serás redirigido a la página principal...</p>
    </div>
  );
}


export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const { isAdmin, isAdminLoading } = useAdmin();
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        if (auth) {
            auth.signOut();
        }
    };

    const getAvatarFallback = () => {
        return user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'A';
    }
    
    // Step 1: Render a loading state until all checks are complete.
    // This is the most critical part to prevent race conditions.
    // We wait until BOTH user loading AND admin status loading are finished.
    if (isUserLoading || isAdminLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p>Verificando permisos de administrador...</p>
            </div>
        )
    }

    // Step 2: After loading, check for user existence and admin status.
    // If there is no user logged in OR if the user is not an admin, render the AccessDenied component.
    if (!user || !isAdmin) {
      return <AccessDenied />;
    }

    // Step 3: Only if all checks pass, render the full admin layout.
    return (
    <div className="flex min-h-screen w-full flex-col">
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

            <div className="flex items-center gap-4">
                 <Button variant="ghost" size="icon" asChild>
                    <Link href="/">
                        <Home className="h-5 w-5"/>
                    </Link>
                </Button>
                <Button variant="ghost" size="icon">
                    <Download className="h-5 w-5"/>
                </Button>
                 <Button variant="ghost" size="icon">
                    <Bell className="h-5 w-5"/>
                </Button>
            
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
                      <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                      </p>
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

                  <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            </div>
        </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 container">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Panel de Administración</h1>
          </div>
          {children}
        </main>
    </div>
    );
}
