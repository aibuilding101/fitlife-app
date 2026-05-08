import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitLife",
  description: "Track your fitness journey",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
