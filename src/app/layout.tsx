import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MIC Check-in",
  description: "A calm, realtime event check-in desk for MIC clubs and communities.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
