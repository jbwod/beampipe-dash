import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/shared/app-providers";

export const metadata: Metadata = {
  title: {
    default: "beampipe dash",
    template: "%s | beampipe dash",
  },
  description: "Operate Beampipe discovery and DALiuGE execution.",
  icons: { icon: "/brand/beampipe-terminal-logo.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
