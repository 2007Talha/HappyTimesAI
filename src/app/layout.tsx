import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="h-full light">
      <body className="min-h-full flex flex-col bg-[#f7f8fc] text-[#1c192b] antialiased selection:bg-[#6842ed] selection:text-white">
        {children}
      </body>
    </html>
  );
}
