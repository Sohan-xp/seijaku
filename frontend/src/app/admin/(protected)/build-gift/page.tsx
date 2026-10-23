import AdminPage from "@/src/components/admin/AdminPage";
import BuildGiftManager from "@/src/components/admin/BuildGiftManager";
import { adminBackendJson } from "@/src/lib/admin-backend";
import { requireCurrentAdmin } from "@/src/lib/admin-session";
import type { ProductSummary } from "@/src/lib/admin-types";

export const dynamic = "force-dynamic";

export default async function AdminBuildGiftPage() {
  await requireCurrentAdmin();
  const data = await adminBackendJson<{ items: ProductSummary[] }>("/products?workflow=published");

  return (
    <AdminPage
      title="Build-A-Gift Curation"
      description="Choose exactly which products appear in each section of the Build-A-Gift page (/build-gift). Changes take effect immediately."
    >
      <BuildGiftManager initialProducts={data.items} />
    </AdminPage>
  );
}
