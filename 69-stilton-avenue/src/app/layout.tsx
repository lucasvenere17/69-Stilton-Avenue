import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import TabNavigation from "@/components/layout/TabNavigation";

export const metadata: Metadata = {
  title: "69 Stilton Avenue — Renovation Portal",
  description: "Interactive renovation planning portal for 69 Stilton Avenue, Kleinburg, Ontario",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <Header />
        <TabNavigation />
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
