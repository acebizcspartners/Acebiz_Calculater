import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import AuthWrapper from './components/AuthWrapper';
import NavBar from './components/NavBar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Rental Property Schedule Automation',
  description: 'AI-powered rental property schedule processing using Claude',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthWrapper navBar={<NavBar />}>
          {children}
        </AuthWrapper>
      </body>
    </html>
  );
}
