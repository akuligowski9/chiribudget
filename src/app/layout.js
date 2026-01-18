import './globals.css';
import ErrorBoundary from '@/components/ErrorBoundary';
import BottomNav from '@/components/BottomNav';
import Providers from '@/components/Providers';
import DemoModeBanner from '@/components/DemoModeBanner';

export const metadata = {
  title: 'ChiriBudget',
  description:
    "Create a friendly, shared view of our family's financial health.",
  manifest: '/manifest.webmanifest',
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
      </head>
      <body>
        <Providers>
          <DemoModeBanner />
          <ErrorBoundary>{children}</ErrorBoundary>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
