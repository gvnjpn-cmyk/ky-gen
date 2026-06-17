import { JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "700"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700"] });

export const metadata = {
  title: "Kyzen.id — Plugin Generator",
  description: "Generator plugin & case WhatsApp bot Kyzen.id pakai squad AI, langsung push ke GitHub.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`${mono.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}
