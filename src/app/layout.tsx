import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Newsreader } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "happytimes chatbot — GenAI Event Architecture Studio",
  description:
    "Production-grade, accessible event planning assistant for Weddings, Birthdays, and Community Events with interactive budgets, dual timelines, vendor checklists, and creative ideas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${plusJakartaSans.variable} ${newsreader.variable}`}>
      <body className="min-h-full flex flex-col bg-[#f7f8fc] text-[#1c192b] antialiased selection:bg-[#6842ed] selection:text-white">
        {children}
      </body>
    </html>
  );
}
