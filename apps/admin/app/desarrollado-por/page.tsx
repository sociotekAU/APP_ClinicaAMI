import type { Metadata } from "next";

import { SociotecPage } from "../../components/developer-credit/sociotec-page";

export const metadata: Metadata = {
  title: "Desarrollado por SOCIOTEC | Clínica AMI",
  description:
    "Créditos del equipo que desarrolló el sistema administrativo y clínico de Clínica AMI.",
};

export default function DeveloperCreditPage() {
  return <SociotecPage />;
}
