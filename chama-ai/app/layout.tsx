import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kikapu",
  description: "The chama treasurer's desk and each member's own position.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
