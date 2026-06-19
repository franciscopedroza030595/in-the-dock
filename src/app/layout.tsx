import type { Metadata, Viewport } from "next";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "In The Dock",
  description: "Daily reasoning challenge · Win USDT on Celo",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "talentapp:project_verification": "80f40a745da0cb9000b4163f28a5f010d30f37ea4362b6b1f34565cc6d30cae9c48cb26d23a9c39979c7ee0d2a629df9acd5e4687b191c6230b1985f81ea7948",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0D0A1A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-svh bg-bg">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
