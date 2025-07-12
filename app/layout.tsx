import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from '@vercel/analytics/react';
import { AnalyticsProvider } from '@/components/analytics/analytics-provider';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HangJegyzet",
  description: "97%+ pontosságú meeting átírás és intelligens összefoglalók. Spóroljon 5+ órát hetente automatikus jegyzeteléssel.",
  keywords: "meeting jegyzetelés, AI átírás, magyar üzleti megbeszélés, meeting összefoglaló",
  authors: [{ name: "HangJegyzet" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HangJegyzet",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "HangJegyzet - AI Meeting Jegyzetelés",
    description: "97%+ pontosságú meeting átírás magyar vállalkozásoknak",
    url: "https://hangjegyzet.hu",
    siteName: "HangJegyzet",
    locale: "hu_HU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HangJegyzet",
    description: "97%+ pontosságú meeting átírás magyar vállalkozásoknak",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <body className={`${inter.className} antialiased`}>
        <AnalyticsProvider>
          {children}
          <Analytics />
        </AnalyticsProvider>
      </body>
    </html>
  );
}