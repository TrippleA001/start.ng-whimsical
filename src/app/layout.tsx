import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./tournament.css";
import Arcade from "~/components/arcade";

export const metadata: Metadata = {
  title: "start.ng · Good vibes. Good games.",
  description:
    "Games made by builders in the community. Each one lives at its own start.ng address. Pick one and play right in your browser.",
  metadataBase: new URL("https://start.ng"),
  openGraph: {
    title: "start.ng · Good vibes. Good games.",
    description:
      "188 browser games made by the community — and one hole you can fall into.",
    siteName: "start.ng",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f6f5ee",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Mounted once, above every route: the catalogue changes underneath,
            the vortex and the player never unmount mid-flight. */}
        <Arcade>{children}</Arcade>
      </body>
    </html>
  );
}
