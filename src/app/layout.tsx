import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snake Game | Classic Arcade Experience",
  description: "Play the classic Snake game with modern controls, progressive difficulty, and responsive design. Compatible with desktop and mobile devices.",
  keywords: "snake game, arcade game, classic games, browser game, mobile game",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Inter:wght@400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="min-h-screen bg-gray-900 text-white overflow-x-hidden">
        <main className="relative">
          {children}
        </main>
      </body>
    </html>
  );
}