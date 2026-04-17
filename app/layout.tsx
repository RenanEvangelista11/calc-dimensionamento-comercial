import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Calculadora de Dimensionamento Comercial",
  description: "Calcule o tamanho ideal do seu time comercial, custos e comissões com base na sua meta de faturamento.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full`}>
      <body className="min-h-full" style={{ fontFamily: "var(--font-geist), -apple-system, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
