import './globals.css';
import BottomNav from '@/components/BottomNav';
import DemoModeBanner from '@/components/DemoModeBanner';
import ErrorBoundary from '@/components/ErrorBoundary';
import NetworkStatus from '@/components/NetworkStatus';
import Providers from '@/components/Providers';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

export const metadata = {
  metadataBase: new URL('https://chiribudget.vercel.app'),
  verification: {
    google: 'eFeEzEw5PDGHfBiYdUkdbDMYUGiwTcDFZy5KHsYF8uM',
  },
  title: 'ChiriBudget',
  description:
    "Create a friendly, shared view of our family's financial health.",
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'ChiriBudget',
    description:
      'A friendly, shared view of your family finances. Track expenses, flag big purchases, and have monthly budget discussions together.',
    url: 'https://chiribudget.vercel.app',
    siteName: 'ChiriBudget',
    images: [
      {
        url: '/apple-touch-icon.png',
        width: 180,
        height: 180,
        alt: 'ChiriBudget logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'ChiriBudget',
    description:
      'A friendly, shared view of your family finances. Track expenses, flag big purchases, and have monthly budget discussions together.',
    images: ['/apple-touch-icon.png'],
  },
};

export const viewport = {
  themeColor: '#F5D4BE',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="ChiriBudget" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (${JSON.stringify(process.env.NEXT_PUBLIC_DEMO_ONLY === 'true')}) {
                try {
                  localStorage.setItem('chiribudget_demoMode', 'true');
                } catch (e) {}
              }
            `,
          }}
        />
      </head>
      <body>
        <ServiceWorkerRegistration />
        <Providers>
          <DemoModeBanner />
          <NetworkStatus />
          <ErrorBoundary>{children}</ErrorBoundary>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
