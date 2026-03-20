import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { DemoSessionProvider } from '@/components/DemoSessionProvider';
import { Navbar } from '@/components/Navbar';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HEED - Historia Clínica Inteligente',
  description: 'Plataforma de historia clínica inteligente',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <DemoSessionProvider>
          <Navbar />
          <div className="pt-16">
            {children}
          </div>
          <Toaster position="top-right" />
        </DemoSessionProvider>
      </body>
    </html>
  );
}
