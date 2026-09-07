import type { Metadata } from "next";
import { ModulePlaceholder } from "../../../../components/erp/module-placeholder";

export const metadata: Metadata = {
  title: "Módulo ERP",
};

export default async function ErpModulePage({
  params,
}: Readonly<{ params: Promise<{ module: string }> }>) {
  const { module } = await params;
  return <ModulePlaceholder moduleCode={module} />;
}
