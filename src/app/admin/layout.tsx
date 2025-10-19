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
import { getUserById } from '@/lib/data';
import { Bell, Download, Gem, Home, LogOut, User as UserIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Search, Shield } from 'lucide-react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const user = await getUserById('user-1');

    return (
    <div className="flex min-h-screen w-full flex-col">
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
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border-2 border-primary">
                    <AvatarImage src={user?.avatarUrl} alt={user?.name} data-ai-hint={user?.avatarHint} />
                    <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                    </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user?.role === 'admin' && (
                    <>
                    <DropdownMenuItem asChild>
                        <Link href="/admin">
                        <Gem className="mr-2 h-4 w-4" />
                        <span>Admin</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    </>
                )}
                <DropdownMenuItem asChild>
                    <Link href="/profile">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
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
