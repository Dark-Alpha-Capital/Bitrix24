import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { GeistSans } from "geist/font/sans";
import "../globals.css";
import { Toaster } from "@/components/ui/toaster";
import Image from "next/image";
import { Geist_Mono } from "next/font/google";

export const metadata: Metadata = {
  title: "Dark Alpha Capital Deal Sourcing Organization",
  description: "Sourcing and Scrape Deals with AI",
};

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(GeistSans.variable, geistMono.variable)}>
      <body className={`antialiased`}>
        <main>
          <div>{children}</div>
        </main>
        <Toaster />
      </body>
    </html>
  );
}
