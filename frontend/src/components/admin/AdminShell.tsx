"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AdminIdentity } from "@/src/lib/admin-types";

import AdminLogoutButton from "./AdminLogoutButton";

const navigation: Array<{ href: string; label: string; roles?: Array<AdminIdentity["role"]> }> = [
  { href: "/admin", label: "Dashboard" },
  // { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/bridge-pages", label: "Bridge Pages" },
  { href: "/admin/stories", label: "Stories" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/retreats", label: "Retreats" },
  { href: "/admin/programs", label: "Programs" },
  { href: "/admin/program-sessions", label: "Program Sessions" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/shipping", label: "Shipping", roles: ["SUPER_ADMIN"] },
  { href: "/admin/settings", label: "Settings", roles: ["SUPER_ADMIN"] },
  { href: "/admin/team", label: "Team", roles: ["SUPER_ADMIN"] },
];

export default function AdminShell({
  admin,
  children,
}: {
  admin: AdminIdentity;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const visibleNavigation = navigation.filter((item) => !item.roles || item.roles.includes(admin.role));

  return (
    <div className="min-h-screen bg-[#efe7db] text-[#2d2824]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6">
        <aside className="flex flex-col rounded-[32px] border border-[#d7cec1] bg-[#2e4a36] px-5 py-6 text-[#f4efe8] shadow-[0_24px_80px_rgba(30,37,33,0.14)] lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <Link href="/admin" className="inline-flex shrink-0 items-center gap-3">
            <span className="font-serif text-[28px] tracking-[-0.03em]">Seijaku</span>
            <span className="rounded-full border border-white/20 px-2 py-1 text-[9px] uppercase tracking-[0.24em] text-white/70">Admin</span>
          </Link>

          <div className="mt-8 shrink-0 rounded-[24px] border border-white/10 bg-white/6 p-4">
            <p className="text-[10px] uppercase tracking-[0.26em] text-white/60">Signed in as</p>
            <p className="mt-3 text-[14px] leading-[1.7] text-white/90">{admin.email}</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-[#e0c98a]">{admin.role.replace("_", " ")}</p>
          </div>

          <nav className="mt-8 -mr-2 min-h-0 flex-1 space-y-2 overflow-y-scroll pr-2 [&::-webkit-scrollbar-thumb:hover]:bg-white/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/30 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
            {visibleNavigation.map((item) => {
              const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-[12px] uppercase tracking-[0.18em] transition ${
                    active ? "bg-[#f4efe8] text-[#23382b]" : "text-white/76 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 rounded-[32px] border border-[#d7cec1] bg-[#f7f1e7] p-5 shadow-[0_18px_60px_rgba(55,42,31,0.05)] sm:p-8">
          <div className="mb-8 flex flex-col gap-4 border-b border-[#ddd3c6] pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#8e755c]">Quiet structure</p>
              <p className="mt-3 max-w-[52ch] text-[14px] leading-[1.8] text-[#685d52]">
                Manage Seijaku catalog, editorial content, experiences, media, and incoming inquiries without leaving the main app.
              </p>
            </div>
            <AdminLogoutButton />
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
