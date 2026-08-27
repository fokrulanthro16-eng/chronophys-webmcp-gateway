import type { Metadata } from "next";
import "./globals.css";
import { WebMCPProvider } from "@/components/WebMCPProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "ChronoPhys WebMCP Gateway | The WebMCP Challenge",
  description: "Next.js Agentic Application natively integrated with W3C WebMCP (document.modelContext) standard.",
  keywords: ["WebMCP", "document.modelContext", "AI Agents", "Next.js", "Industrial Vibration", "Grandma Mode"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#080b11] text-slate-100 antialiased min-h-screen selection:bg-purple-600 selection:text-white font-sans">
        <ErrorBoundary>
          <WebMCPProvider>
            {children}
          </WebMCPProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
