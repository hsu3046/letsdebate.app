import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Do_Hyeon, Jua, Gowun_Dodum } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "@/components/ThemeProvider";
import ClientLayout from "@/components/ClientLayout";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const doHyeon = Do_Hyeon({
  variable: "--font-do-hyeon",
  subsets: ["latin"],
  weight: "400",
});

const jua = Jua({
  variable: "--font-jua",
  subsets: ["latin"],
  weight: "400",
});

const gowunDodum = Gowun_Dodum({
  variable: "--font-gowun-dodum",
  subsets: ["latin"],
  weight: "400",
});

// Pretendard & RIDIBatang CDN (Google Fonts에 없어서 CDN 사용)

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://letsdebate.app'),
  title: "왈가왈부 - AI와 함께하는 토론 플랫폼",
  description: "세상 모든 주제에 딴지 거는 AI들, 그리고 나. 다양한 관점에서 토론하고 새로운 시각을 발견하세요.",
  keywords: ["토론", "AI", "debate", "왈가왈부", "AI토론", "관점", "discussion"],
  authors: [{ name: "WalGaWalBu Team" }],
  creator: "WalGaWalBu",
  publisher: "WalGaWalBu",
  applicationName: "왈가왈부",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "왈가왈부",
    title: "왈가왈부 - AI와 함께하는 토론 플랫폼",
    description: "세상 모든 주제에 딴지 거는 AI들, 그리고 나. 다양한 관점에서 토론하고 새로운 시각을 발견하세요.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "왈가왈부 - AI 토론 플랫폼",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "왈가왈부 - AI와 함께하는 토론 플랫폼",
    description: "세상 모든 주제에 딴지 거는 AI들, 그리고 나.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/logo_light.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "왈가왈부",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f14" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Pretendard & RIDIBatang 폰트 CDN */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/niceplugin/ridibatang@1.0.0/dist/ridibatang.css"
        />
      </head>
      <body className={`${notoSansKr.variable} ${doHyeon.variable} ${jua.variable} ${gowunDodum.variable} antialiased`}>
        <ThemeProvider>
          <ClientLayout>{children}</ClientLayout>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
