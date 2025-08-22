import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";

export const metadata: Metadata = {
  title: "UsualOdds - Prédictions Football IA",
  description: "Plateforme de prédictions football alimentée par l'intelligence artificielle. Système ML avec 54.2% de précision.",
  keywords: "prédictions football, intelligence artificielle, paris sportifs, ML, Ligue 1",
  authors: [{ name: "UsualOdds Team" }],
  openGraph: {
    title: "UsualOdds - Prédictions Football IA",
    description: "Plateforme de prédictions football alimentée par l'intelligence artificielle",
    type: "website",
    siteName: "UsualOdds"
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Styles CSS critiques pour éviter FOUC */
            body { font-family: Inter, system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
            .btn-primary { background: linear-gradient(to right, #2563eb, #1d4ed8); color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; }
            .card-elevated { background: white; border: 1px solid #e2e8f0; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          `
        }} />
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground font-sans">
        <QueryProvider>
          <ThemeProvider
            attribute="data-theme"
            defaultTheme="light"
            enableSystem={true}
            disableTransitionOnChange={false}
          >
            <div className="flex flex-col min-h-screen">
              <Navigation />
              <main className="flex-1">
                {children}
              </main>
            
            {/* Footer minimal premium */}
            <footer className="border-t border-neutral-200 bg-neutral-50/50 no-print">
              <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex justify-between items-center text-sm text-neutral-600">
                  <div className="flex items-center space-x-4">
                    <span>© 2025 UsualOdds</span>
                    <span>•</span>
                    <span>Powered by AI</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                    <span>54.2% Accuracy</span>
                  </div>
                </div>
              </div>
            </footer>
            </div>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}