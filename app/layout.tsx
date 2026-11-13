import type { Metadata, Viewport } from 'next';
import { Fraunces, Figtree } from 'next/font/google';
import './globals.css';

const display = Fraunces({ subsets: ['latin'], variable: '--font-display', axes: ['opsz'] });
const body = Figtree({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = { title: 'Expense Tracker' };
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('et-theme');document.documentElement.dataset.theme=t==='light'?'light':'dark'}catch(e){}" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
