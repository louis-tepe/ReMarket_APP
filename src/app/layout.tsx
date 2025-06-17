import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import NextAuthProvider from "@/components/providers/NextAuthProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "ReMarket - Votre marché de seconde main, réinventé.",
  description: "Achetez et vendez des produits d'occasion avec une expérience comme neuve.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={cn("h-full", GeistSans.variable, GeistMono.variable)}
      suppressHydrationWarning
    >
      <body className={cn("min-h-screen bg-background font-sans antialiased")}>
        <NextAuthProvider>
          <Header />
          <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Footer />
          <Toaster />
        </NextAuthProvider>
      </body>
    </html>
  );
}
