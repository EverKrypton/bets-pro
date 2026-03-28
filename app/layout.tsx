import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bets Pro | Crypto Sportsbook',
  description: 'The biggest football sportsbook. Real matches, real odds, instant USDT payouts.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-white min-h-screen flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
