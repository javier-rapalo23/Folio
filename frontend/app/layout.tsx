import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Folio · Herramientas para documentos y PDF",
  description: "Extrae texto de escaneos, une, separa, comprime, numera y protege tus PDF.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
