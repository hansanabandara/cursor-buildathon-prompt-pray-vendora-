import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vendora",
  description:
    "AI-powered omnichannel marketing media and e-commerce listing generator.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
