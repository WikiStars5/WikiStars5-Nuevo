
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
import CookieConsentBanner from '@/components/shared/cookie-consent-banner';
import { LanguageProvider } from '@/context/LanguageContext';
import { SnowProvider } from '@/context/SnowContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  variable: '--font-source-code-pro',
  display: 'swap',
});


export const metadata: Metadata = {
  title: 'WikiStars5 | El YELP de las Celebridades',
  description: 'Ponle 1 estrella al que odias, 5 al que amas. Entra al ring: ataca, defiende y cierra la boca a los haters con tu StarPost. ¡La pelea empieza aquí!',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f4f4f5" media="(prefers-color-scheme: light)" />
        <link rel="manifest" href="/manifest.json" />
        {/* AdSense script is deferred below using next/script */}
      </head>
      <body className={cn('min-h-screen bg-background font-body antialiased', inter.variable, sourceCodePro.variable)}>
        {/* Meta Pixel Code */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=815352248035468&ev=PageView&noscript=1"
          />
        </noscript>
        {/* End Meta Pixel Code */}
        
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
                  <CookieConsentBanner />
                </StreakAnimationProvider>
              </SnowProvider>
            </LanguageProvider>
          </FirebaseClientProvider>
        </ThemeProvider>
         
        {/* Google Analytics */}
        <Script
            async
            src="https://www.googletagmanager.com/gtag/js?id=G-JPZ1R12H4D"
            strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-JPZ1R12H4D');
          `}
        </Script>

        {/* Meta Pixel Code */}
        <Script id="fb-pixel" strategy="afterInteractive">
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

        {/* AdSense Code - Deferred Loading */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js?client=ca-pub-4946268254100131"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
