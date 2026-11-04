import type { Metadata } from "next";
import { Outfit, Orbitron } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Nixtio Watch — Daftar Tontonan",
  description: "Catat film, serial, dan anime lengkap dengan progres, catatan, dan link tempat menonton.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${outfit.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="min-h-dvh flex flex-col text-ink bg-bg-page font-sans">
        {children}
      </body>
    </html>
  );
}
