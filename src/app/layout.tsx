import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReviewLens | AI Return Prevention & Margin Intelligence",
  description: "Stop e-commerce return bleed with AI intelligence. Pinpoint root-cause defects on Flipkart & Meesho and recover margins with automated supplier playbooks.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "ReviewLens | AI Return Prevention & Margin Intelligence",
    description: "Analyze Flipkart & Meesho reviews, isolate product defects, and generate automated supplier playbooks.",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
