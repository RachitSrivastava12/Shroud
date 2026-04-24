import type { Metadata } from "next";
import type { ReactNode } from "react";
import { WalletProviders } from "@/components/WalletProviders";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHROUD — private recurring payments on Solana",
  description:
    "Shield once. Pay anyone, by Telegram handle, on any cadence. Nobody sees the schedule. Nobody sees the amount. Built on Loyal + MagicBlock PER.",
  openGraph: {
    title: "SHROUD",
    description: "Private recurring payments on Solana.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SHROUD — private recurring payments on Solana",
    description:
      "Shield once. Pay anyone. Nobody sees the schedule. Built on Loyal + MagicBlock PER.",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <WalletProviders>
          <div className="relative z-10">{children}</div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#141312",
                color: "#F2EEE5",
                border: "1px solid #141312",
                borderRadius: 0,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "0.82rem",
              },
            }}
          />
        </WalletProviders>
      </body>
    </html>
  );
}
