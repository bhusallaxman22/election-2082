import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import Providers from "./providers";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://election.bhusallaxman.com.np";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Nepal Election 2082 - Federal Parliament Election Results",
  description:
    "Nepal election live update for Federal Parliament Election 2082. Real-time counting, party-wise results, RSP and Nepali Congress updates, and constituency data.",
  keywords:
    "Nepal election, Nepal election live update, election live update, RSP, Nepali Congress, election 2082, Nepal federal election 2082, Nepal parliament election",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-icon.png" }],
  },
  openGraph: {
    title: "Nepal Election 2082 - Federal Parliament",
    description:
      "Real-time election results, constituency races, and province insights for Nepal Election 2082.",
    type: "website",
    url: "/",
    siteName: "Election 2082",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Nepal Election 2082 share card",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nepal Election 2082 - Federal Parliament",
    description:
      "Real-time election results, constituency races, and province insights for Nepal Election 2082.",
    images: ["/twitter-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
