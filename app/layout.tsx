import type { Metadata, Viewport } from "next";
import { Rubik, Nunito_Sans } from "next/font/google";
import "./globals.css";
import Shell from "@/components/Shell";
import dynamic from "next/dynamic";
import SWRegister from "@/components/SWRegister";

// Lazy load ChatWidget to avoid impacting initial bundle size
const ChatWidget = dynamic(() => import("@/components/ChatWidget"), {
  loading: () => null,
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "LEGO - Learn And Go",
  description: "AI-powered, gamified learning with video lessons, quizzes, and live tutoring.",
  // Additional metadata for PWA
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${rubik.variable} ${nunitoSans.variable} h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        {/* PWA Meta Tags for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LEGO Learn" />
      </head>
<body className="min-h-full flex flex-col bg-background text-on-surface font-body-md">
         <Shell>{children}</Shell>
         <ChatWidget />
         <SWRegister />
       </body>
    </html>
  );
}
