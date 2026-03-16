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
    "Nepal federal parliament election 2082 final results with party-wise counts, constituency summaries, and province analysis.",
  keywords:
    "Nepal election, Nepal election results, election 2082, RSP, Nepali Congress, Nepal federal election 2082, Nepal parliament election, constituency results",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon", type: "image/png" }],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-icon" }],
  },
  openGraph: {
    title: "Nepal Election 2082 - Federal Parliament",
    description:
      "Final election results, constituency summaries, and province insights for Nepal Election 2082.",
    type: "website",
    url: "/",
    siteName: "Election 2082",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
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
      "Final election results, constituency summaries, and province insights for Nepal Election 2082.",
    images: ["/twitter-image"],
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
