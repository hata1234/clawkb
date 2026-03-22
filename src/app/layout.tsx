import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClawKB",
  description: "A knowledge base built for Human–AI Agent collaboration",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
