import Link from 'next/link';
import { Logo } from '@/components/icons';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card">
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Image src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia.png?alt=media&token=fb7367da-8db6-4f1d-a1f0-d03f57e6b9f6" alt="WikiStars5 Logo" width={24} height={24} className="h-6 w-6" />
          <span className="font-headline text-primary">WikiStars5</span>
        </Link>
        <p className="text-sm text-muted-foreground">
          &copy; 2025 WikiStars5. All rights reserved.
        </p>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link
            href="/admin/login"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Login
          </Link>
          <Link
            href="#"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
