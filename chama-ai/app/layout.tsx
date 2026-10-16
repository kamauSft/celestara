import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chama AI",
  description: "Records, balances, and approvals for a savings group.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
