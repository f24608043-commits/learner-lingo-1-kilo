import type { Metadata, Viewport } from "next";
import "./globals.css";
import Shell from "@/components/Shell";
import ChatWidget from "@/components/ChatWidget";
import SWRegister from "@/components/SWRegister";
import { Toaster } from "react-hot-toast";

// Use system fonts to avoid build-time network requests
const rubikVariable = "--font-rubik";
const nunitoSansVariable = "--font-nunito-sans";

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
      className={`h-full antialiased`}
      style={{
        [rubikVariable]: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        [nunitoSansVariable]: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      } as React.CSSProperties}
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
        <Toaster
          position="top-center"
          toastOptions={{
            className: "!rounded-2xl !shadow-clay-surface",
          }}
        />
      </body>
    </html>
  );
}