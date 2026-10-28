import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "happytimes chatbot — GenAI-Powered Event Planning Assistant",
  description:
    "Production-grade, accessible event planning assistant for Weddings, Birthdays, and Community Events with interactive budgets, dual timelines, vendor checklists, and creative ideas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
