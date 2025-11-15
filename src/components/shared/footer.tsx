
import Link from 'next/link';
import { Logo } from '@/components/icons';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 items-center gap-4 px-4 py-6">
        <div className="flex items-center gap-2 font-bold text-lg justify-center md:justify-start">
          <Image src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia.png?alt=media&token=fb7367da-8db6-4f1d-a1f0-d03f57e6b9f6" alt="WikiStars5 Logo" width={24} height={24} className="h-6 w-6" />
          <span className="font-headline text-primary">WikiStars5</span>
        </div>
        <p className="text-sm text-muted-foreground text-center order-last md:order-none">
          © 2025 WikiStars5. Todos los derechos reservados.
        </p>
        <nav className="flex items-center justify-center md:justify-end gap-x-4 text-sm font-medium">
          <Link href="/admin/login" className="text-muted-foreground transition-colors hover:text-foreground">
            Admin
          </Link>
          <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">
            Privacidad
          </Link>
          <Link href="/disclaimer" className="text-muted-foreground transition-colors hover:text-foreground">
            Descargo de Responsabilidad
          </Link>
        </nav>
      </div>
    </footer>
  );
}
