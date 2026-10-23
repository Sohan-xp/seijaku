import AdminPage from "@/src/components/admin/AdminPage";
import OrdersManager, { type AdminOrder } from "@/src/components/admin/OrdersManager";
import { adminBackendJson } from "@/src/lib/admin-backend";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const data = await adminBackendJson<{ items: AdminOrder[] }>("/lead/order-requests");

  return (
    <AdminPage
      title="Orders Management"
      description="Review customer orders and curated gift boxes, update processing and shipment statuses, dispatch via Shiprocket, and print packing slips."
    >
      <OrdersManager initialOrders={data.items} />
    </AdminPage>
  );
}
