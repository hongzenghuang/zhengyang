import type { Metadata } from 'next';
import './globals.css';
import { FlightProvider } from '@/contexts/FlightContext';

export const metadata: Metadata = {
  title: 'B777-300ER 飞行模拟器',
  description: '波音 777-300ER 专业飞行模拟器',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <FlightProvider>
          {children}
        </FlightProvider>
      </body>
    </html>
  );
}