import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '../components/ui/toaster';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'GiftMind - AI-Powered Web3 Gifting on Solana',
  description: 'Send personalized crypto gifts on Solana using AI-powered recipient analysis',
  icons: { icon: '/favicon.svg' },
  metadataBase: new URL('https://giftmind.xyz'),
  openGraph: {
    title: 'GiftMind - AI-Powered Web3 Gifting',
    description: 'Send personalized crypto gifts on Solana',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GiftMind',
    description: 'AI-Powered Web3 Gifting on Solana',
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <footer className="fixed bottom-0 left-0 right-0 py-2 text-center">
          <p className="text-[10px] text-slate-800/60">
            VBH3 Summer Solstice &middot; BOHBOOverse Ecosystem &middot; Solana Edition
          </p>
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
