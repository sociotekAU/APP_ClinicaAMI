import type { Metadata } from "next";
import type { ReactNode } from "react";
import "sweetalert2/dist/sweetalert2.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Clínica A.M.I. | Sistema administrativo",
    template: "%s | Clínica A.M.I.",
  },
  description: "Sistema administrativo y clínico de Alternativa Médica Integral A.M.I.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
