import type { Metadata, Viewport } from "next";
import "./globals.css";
import { appUrl } from "@/lib/url";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: "Dartkveld", template: "%s · Dartkveld" },
  description: "Poengføring for dartkvelden: Mickey Mouse, med flere spill på vei.",
  appleWebApp: { capable: true, title: "Dartkveld", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0a0e15",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <body className="antialiased">{children}</body>
    </html>
  );
}
