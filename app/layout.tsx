import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import './features.css';
import './quests.css';
import './quest-integration.css';
import './premium.css';
import './premium-locked.css';
import './hangout.css';
import './modal-layer.css';
import './friends-list.css';
import './social-profile.css';
import './schedule-gap.css';
import './language-exchange.css';
import './language-swap-fix.css';
import 'leaflet/dist/leaflet.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'sidequest — Campus events outside your orbit',
  description: 'Discover beginner-friendly campus events, people, and unexpected interests.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body></html>;
}
