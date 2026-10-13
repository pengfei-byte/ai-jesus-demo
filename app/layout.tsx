import type { ReactNode } from "react";
import { Cormorant_Garamond } from "next/font/google";
import { Footer } from "@/components/Footer";
import "./globals.css";

const vintage = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-vintage",
  display: "swap",
});

export const metadata = { title: "Jesus", description: "A quiet place to listen." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={vintage.variable}>
      <body>
        <div className="page">
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
