import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

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
      <body className="antialiased bg-gray-50">
        <Navigation />
        {children}
      </body>
    </html>
  );
}