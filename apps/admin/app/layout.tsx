import type { Metadata } from "next";
import type { ReactNode } from "react";
import "select2/dist/css/select2.min.css";
import "sweetalert2/dist/sweetalert2.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Clínica A.M.I. | Alternativa Médica Integral",
    template: "%s | Clínica A.M.I.",
  },
  description: "Sitio web de Alternativa Médica Integral A.M.I.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
