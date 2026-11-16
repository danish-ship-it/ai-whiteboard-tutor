import Script from "next/script";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Sans, Kalam, Newsreader } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], weight: ["400", "500"] });
const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"], weight: ["400", "500", "600"] });
/** Hand lettering on the whiteboard. */
const hand = Kalam({ variable: "--font-hand", subsets: ["latin"], weight: ["400", "700"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Chalk — learn anything in two minutes",
  description: "An AI tutor that teaches any topic with a voice and a whiteboard that draws in sync. Ask follow-up questions anytime.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f0e8" },
    { media: "(prefers-color-scheme: dark)", color: "#171c19" },
  ],
};

/** Applies the saved theme before first paint to avoid a light flash in dark mode. */
const themeScript = `try{var t=localStorage.getItem("chalk-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${newsreader.variable} ${instrument.variable} ${plexMono.variable} ${hand.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <Script id="theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
