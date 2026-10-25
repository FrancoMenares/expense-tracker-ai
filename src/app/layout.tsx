import type { Metadata, Viewport } from 'next';
import ActivityTray from '@/components/cloud/ActivityTray';
import Navbar from '@/components/Navbar';
import Providers from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Spendwise — Expense Tracker',
  description: 'Track, filter and analyze your personal expenses.',
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">{children}</main>
          <ActivityTray />
        </Providers>
      </body>
    </html>
  );
}
