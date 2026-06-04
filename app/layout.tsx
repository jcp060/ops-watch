import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { OccProviders } from "@/components/OccProviders";
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
  title: "OPS Watch",
  description: "Operations control center dashboard for flight following",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <OccProviders>{children}</OccProviders>
      </body>
    </html>
  );
}
