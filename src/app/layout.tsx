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

export const metadata: Metadata = {
  title: "Nepal Election 2082 - Federal Parliament Election Results",
  description:
    "Latest updates, results, candidates and analysis of Nepal Election 2082 Federal Parliament. Real-time counting, party-wise results, and constituency data.",
  keywords:
    "Nepal Election 2082, Federal Parliament, Election Results, Candidates, Nepal",
  openGraph: {
    title: "Nepal Election 2082 - Federal Parliament",
    description:
      "Real-time election results and analysis for Nepal's Federal Parliament Election 2082",
    type: "website",
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
