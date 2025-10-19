import Footer from '@/components/shared/footer';
import Header from '@/components/shared/header';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <FirebaseClientProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </FirebaseClientProvider>
  );
}
