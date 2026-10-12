import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "Jesus", description: "A quiet place to listen." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="page">{children}</div>
      </body>
    </html>
  );
}
