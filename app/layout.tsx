import type { Metadata } from "next";
import "./globals.css";
import { WebMCPProvider } from "@/components/WebMCPProvider";

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
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen selection:bg-mcp-purple selection:text-white">
        <WebMCPProvider>
          {children}
        </WebMCPProvider>
      </body>
    </html>
  );
}
