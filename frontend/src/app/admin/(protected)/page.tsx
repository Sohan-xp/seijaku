import Link from "next/link";
import AdminCard from "@/src/components/admin/AdminCard";
import AdminPage from "@/src/components/admin/AdminPage";
import AdminStatusBadge from "@/src/components/admin/AdminStatusBadge";
import { adminBackendJson } from "@/src/lib/admin-backend";

type DashboardData = {
  counts: Record<string, number>;
  recent: {
    orderRequests: Array<{ id: string; name: string; email: string; status: string; createdAt: string }>;
    programReservations: Array<{ id: string; name: string; email: string; status: string; createdAt: string; program: { name: string } }>;
    retreatInquiries: Array<{ id: string; name: string; email: string; status: string; createdAt: string; retreat: { name: string } }>;
  };
};

const labels: Record<string, string> = {
  products: "Products",
  articles: "Articles",
  retreats: "Retreats",
  programs: "Programs",
  mediaAssets: "Media Assets",
  orderRequests: "Order Requests",
  newsletterSubscriptions: "Newsletter Subscriptions",
  programReservations: "Program Reservations",
  retreatInquiries: "Retreat Inquiries",
};

export default async function AdminDashboardPage() {
  const data = await adminBackendJson<DashboardData>("/dashboard");

  return (
    <AdminPage
      title="Dashboard"
      description="A quick view of what is live in the system and which inbound conversations need attention first."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(data.counts).map(([key, value]) => (
          <AdminCard key={key}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a7e71]">{labels[key] ?? key}</p>
              {key === "orderRequests" ? (
                <Link href="/admin/orders" className="text-[10px] uppercase tracking-[0.18em] text-[#2e4a36] hover:underline">
                  View →
                </Link>
              ) : null}
            </div>
            <p className="mt-4 font-serif text-[40px] leading-none text-[#1d1916]">{value}</p>
          </AdminCard>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <AdminCard>
          <div className="flex items-center justify-between">
            <h2 className="text-[22px]">Recent Order Requests</h2>
            <Link href="/admin/orders" className="text-[11px] uppercase tracking-[0.18em] text-[#2e4a36] hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {data.recent.orderRequests.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[#e2d7c7] bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-medium text-[#201b18]">{item.name}</p>
                    <p className="mt-1 text-[13px] text-[#6c6157]">{item.email}</p>
                  </div>
                  <AdminStatusBadge value={item.status} />
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="text-[22px]">Recent Program Reservations</h2>
          <div className="mt-5 space-y-4">
            {data.recent.programReservations.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[#e2d7c7] bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-medium text-[#201b18]">{item.name}</p>
                    <p className="mt-1 text-[13px] text-[#6c6157]">{item.program.name}</p>
                  </div>
                  <AdminStatusBadge value={item.status} />
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="text-[22px]">Recent Retreat Inquiries</h2>
          <div className="mt-5 space-y-4">
            {data.recent.retreatInquiries.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[#e2d7c7] bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-medium text-[#201b18]">{item.name}</p>
                    <p className="mt-1 text-[13px] text-[#6c6157]">{item.retreat.name}</p>
                  </div>
                  <AdminStatusBadge value={item.status} />
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>
    </AdminPage>
  );
}
