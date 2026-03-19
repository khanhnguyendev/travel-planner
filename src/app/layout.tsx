import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

// TODO: replace with your real production URL
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';

// TODO: replace APP_NAME with your brand name (e.g. "TripMate")
const APP_NAME = 'Travel Planner';
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: `${APP_NAME} – Lên kế hoạch du lịch cùng nhau`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    'Lên kế hoạch du lịch nhóm dễ dàng: thu thập địa điểm, bình chọn nơi đến, theo dõi chi tiêu chung — tất cả trong một ứng dụng cộng tác.',
  keywords: [
    'lên kế hoạch du lịch',
    'du lịch nhóm',
    'ứng dụng du lịch',
    'chia sẻ chi phí du lịch',
    'địa điểm du lịch',
    'lịch trình du lịch',
    'travel planner',
    'trip planning',
    'group travel',
  ],

  authors: [{ name: APP_NAME }],
  creator: APP_NAME,
  publisher: APP_NAME,

  // Canonical + robots
  alternates: {
    canonical: '/',
    languages: { 'vi-VN': '/' },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },

  // Open Graph (Facebook, Zalo, Messenger previews)
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: SITE_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} – Lên kế hoạch du lịch cùng nhau`,
    description:
      'Lên kế hoạch du lịch nhóm dễ dàng: thu thập địa điểm, bình chọn nơi đến, theo dõi chi tiêu chung — tất cả trong một ứng dụng cộng tác.',
    images: [
      {
        url: '/og-image.png', // place a 1200×630 image in /public/og-image.png
        width: 1200,
        height: 630,
        alt: `${APP_NAME} – Lên kế hoạch du lịch cùng nhau`,
      },
    ],
  },

  // Twitter / X card
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} – Lên kế hoạch du lịch cùng nhau`,
    description:
      'Lên kế hoạch du lịch nhóm dễ dàng: thu thập địa điểm, bình chọn nơi đến, theo dõi chi tiêu chung.',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={plusJakarta.variable} suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
