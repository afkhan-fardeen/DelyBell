import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Delybell Order Sync Dashboard',
  description: 'Simple delivery automation for your Shopify store',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
