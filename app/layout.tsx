import ClientLayout from '@/components/_default/LayoutClient';
import { Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ReactNode } from 'react';
import './globals.css';

const font = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#FF8200',
  width: 'device-width',
  initialScale: 1,
};


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="fantasy" className={font.className}>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
