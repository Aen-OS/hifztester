import {
  Scheherazade_New,
  DM_Serif_Text,
  DM_Serif_Display,
  Rakkas,
} from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import QuranAuthHeader from "@/components/QuranAuthHeader";

const Rakkasfont = Rakkas({
  variable: "--font-rakkas",
  subsets: ["arabic"],
  weight: "400",
});

const DMSerifText = DM_Serif_Text({
  weight: "400",
  variable: "--font-dm-serif-text",
  subsets: ["latin"],
});

const DMSerifDisplay = DM_Serif_Display({
  weight: "400",
  variable: "--font-dm-serif-display",
  subsets: ["latin"],
});

const scheherazade = Scheherazade_New({
  variable: "--font-scheherazade",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

export const metadata = {
  title: "Itqaan",
  description: "Quran memorization tools",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${Rakkasfont.variable} ${DMSerifText.variable} ${DMSerifDisplay.variable} ${scheherazade.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <QuranAuthHeader />
        {children}
      </body>
      <Analytics />
      <SpeedInsights />
    </html>
  );
}
