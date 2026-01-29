import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Matchify - CV ile Is Eslestirme",
  description: "Yapay zeka destekli CV ve is ilani eslestirme platformu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
