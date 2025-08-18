import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Usual Odds - Football Prediction Platform",
  description: "Internal platform for football match predictions and betting analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}