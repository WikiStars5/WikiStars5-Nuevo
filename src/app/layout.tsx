import type { Metadata } from 'next';
import { Inter, Source_Code_Pro } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { ThemeProvider } from 'next-themes';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { StreakAnimationProvider } from '@/context/StreakAnimationContext';
import StreakAnimationOverlay from '@/components/streaks/StreakAnimationOverlay';
import Script from 'next/script';
import { LanguageProvider } from '@/context/LanguageContext';
import { SnowProvider } from '@/context/SnowContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  adjustFontFallback: true,
});

const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  variable: '--font-source-code-pro',
  display: 'swap',
});


export const metadata: Metadata = {
  metadataBase: new URL('https://starryz5.com'),
  title: 'Starryz5 | El YELP de las Celebridades',
  description: 'Ponle 1 estrella al que odias, 5 al que amas. Entra al ring: ataca, defiende y cierra la boca a los haters con tu StarPost. ¡La pelea empieza aquí!',
  manifest: '/manifest.json',
  openGraph: {
    siteName: 'Starryz5',
    title: 'Starryz5 | El YELP de las Celebridades',
    description: 'Vota, califica y comparte tus pensamientos sobre figuras públicas.',
    images: ['https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Festrellados%20(3).jpg?alt=media&token=4c5ff945-b737-4bd6-bb41-98b609c654c9'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Starryz5 | El YELP de las Celebridades',
    description: 'Vota, califica y comparte tus pensamientos sobre figuras públicas.',
    images: ['https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Festrellados%20(3).jpg?alt=media&token=4c5ff945-b737-4bd6-bb41-98b609c654c9'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f4f4f5" media="(prefers-color-scheme: light)" />
        <link rel="manifest" href="/manifest.json" />
        {/* Preconnect to external assets for performance */}
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://images.unsplash.com" />
      </head>
      <body className={cn('min-h-screen bg-background font-body antialiased', inter.variable, sourceCodePro.variable)}>
        {/* Meta Pixel (noscript) */}
        <noscript>
          <img 
            height="1" 
            width="1" 
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=815352248035468&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>

        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <LanguageProvider>
              <SnowProvider>
                <StreakAnimationProvider>
                  {children}
                  <Toaster />
                  <StreakAnimationOverlay />
                </StreakAnimationProvider>
              </SnowProvider>
            </LanguageProvider>
          </FirebaseClientProvider>
        </ThemeProvider>
         
        {/* Google Analytics - Loaded with lazyOnload to prioritize LCP */}
        <Script
            async
            src="https://www.googletagmanager.com/gtag/js?id=G-JPZ1R12H4D"
            strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-JPZ1R12H4D');
          `}
        </Script>

        {/* Meta Pixel Code - Loaded with lazyOnload to prioritize LCP */}
        <Script id="meta-pixel" strategy="lazyOnload">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '815352248035468');
            fbq('track', 'PageView');
          `}
        </Script>
      </body>
    </html>
  );
}
