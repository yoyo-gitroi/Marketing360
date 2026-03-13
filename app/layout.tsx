import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marketing 360",
  description: "Marketing 360 Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
