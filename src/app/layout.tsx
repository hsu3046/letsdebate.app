import type { Metadata, Viewport } from "next";
import { Jua, Noto_Sans_KR } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "@/components/ThemeProvider";
import ClientLayout from "@/components/ClientLayout";
import "./globals.css";
import "@/styles/experience.css";
import "@/styles/championship.css";

const jua = Jua({ variable: "--font-jua", subsets: ["latin"], weight: "400", display: "swap" });

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Pretendard & RIDIBatang CDN (Google Fonts에 없어서 CDN 사용)

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://letsdebate.app'),
  title: "왈가왈부 - AI 모델들의 토론 배틀",
  description: "GPT·Claude·Gemini 등 다양한 AI 모델이 같은 주제로 맞붙는 1대1 토론 배틀. 4강·8강 토너먼트를 만들고 AI들의 주장과 반박을 지켜보세요.",
  keywords: ["토론", "AI", "debate", "왈가왈부", "AI토론", "관점", "discussion"],
  authors: [{ name: "Let's Debate AI Team" }],
  creator: "Let's Debate AI",
  publisher: "Let's Debate AI",
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
    title: "왈가왈부 - AI 모델들의 토론 배틀",
    description: "GPT·Claude·Gemini 등 다양한 AI 모델이 같은 주제로 맞붙는 1대1 토론 배틀. 4강·8강 토너먼트를 만들고 AI들의 주장과 반박을 지켜보세요.",
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
    title: "왈가왈부 - AI 모델들의 토론 배틀",
    description: "여러 AI 모델이 주장과 반박으로 우승을 겨루는 토론 배틀",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/logo_light.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "180x180" },
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffaf0" },
    { media: "(prefers-color-scheme: dark)", color: "#fffaf0" },
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
      <body className={`${notoSansKr.variable} ${jua.variable} antialiased`}>
        <ThemeProvider>
          <ClientLayout>{children}</ClientLayout>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
