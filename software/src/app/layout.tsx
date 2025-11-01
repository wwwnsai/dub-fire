import type { Metadata } from "next";
import "./globals.css";
import { FireStatusProvider } from "@/lib/fireStatusContext";
import EmailEventListenerProvider from "@/component/EmailEventListenerProvider";

// Define metadata for the PWA and SEO
export const metadata: Metadata = {
  title: "Fire Alert Dashboard",
  description: "Real-time monitoring for IoT fire detection devices.",
  manifest: "/manifest.json", // Link to the PWA manifest
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Sen:wght@400..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <FireStatusProvider>
          <EmailEventListenerProvider />
          <main className="min-h-screen">{children}</main>
        </FireStatusProvider>
      </body>
    </html>
  );
}
