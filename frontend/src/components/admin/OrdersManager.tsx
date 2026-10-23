"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ShoppingBag,
  Gift,
  Mail,
  Phone,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Printer,
  RefreshCw,
  Truck,
  Send,
  Edit3,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
} from "lucide-react";

import AdminCard from "@/src/components/admin/AdminCard";
import AdminStatusBadge from "@/src/components/admin/AdminStatusBadge";
import { adminButtonClassName } from "@/src/components/admin/AdminField";

export type LeadStatus = "NEW" | "REVIEWED" | "CONTACTED" | "CLOSED";
export type PaymentStatus = "CREATED" | "PAID" | "FAILED" | "REFUNDED";
export type ShipmentStatus =
  | "NOT_CREATED"
  | "PUSHED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "RTO"
  | "CANCELLED"
  | "FAILED";

export type AdminOrderItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPriceAmount: number;
  variantSummary?: string | null;
  selectedOptionsJson?: Record<string, string> | null;
  product?: {
    id: string;
    slug: string;
    title: string;
    image?: string | null;
  } | null;
};

export type AdminOrder = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  source?: string | null;
  status: LeadStatus;
  notes?: string | null;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  totalAmount: number;
  currency: string;
  shippingLine1?: string | null;
  shippingLine2?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingPincode?: string | null;
  shippingCountry?: string | null;
  shiprocketOrderId?: string | null;
  shiprocketShipmentId?: string | null;
  awbCode?: string | null;
  courierName?: string | null;
  trackingUrl?: string | null;
  shipmentStatus: ShipmentStatus;
  shipmentError?: string | null;
  shipmentPushedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: AdminOrderItem[];
};

const PAYMENT_BADGE_COLORS: Record<PaymentStatus, string> = {
  CREATED: "bg-[#e8dec9] text-[#7c6849]",
  PAID: "bg-[#cde0d2] text-[#2c6541] font-semibold",
  FAILED: "bg-[#e7c1ba] text-[#9f4332]",
  REFUNDED: "bg-[#f1e0c1] text-[#8a6431]",
};

const SHIPMENT_BADGE_COLORS: Record<ShipmentStatus, string> = {
  NOT_CREATED: "bg-[#ece2d2] text-[#7d6b56]",
  PUSHED: "bg-[#dde7d1] text-[#4f6638]",
  PICKED_UP: "bg-[#d8dfe6] text-[#3b4f60]",
  IN_TRANSIT: "bg-[#cfd9e0] text-[#3b5060]",
  OUT_FOR_DELIVERY: "bg-[#c2d2dc] text-[#2f4858]",
  DELIVERED: "bg-[#cde0d2] text-[#2c6541] font-semibold",
  RTO: "bg-[#f1e0c1] text-[#8a6431]",
  CANCELLED: "bg-[#e2dad2] text-[#665d54]",
  FAILED: "bg-[#e7c1ba] text-[#9f4332]",
};

const ORDER_STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: "bg-[#e4ede7] text-[#265337] font-semibold",
  REVIEWED: "bg-[#d8dfe6] text-[#2e475c]",
  CONTACTED: "bg-[#eedfcb] text-[#775a34]",
  CLOSED: "bg-[#e5ded4] text-[#635a50]",
};

function formatPrice(amountPaise: number, currency: string = "INR") {
  const rupees = amountPaise / 100;
  return `${currency === "INR" ? "₹" : `${currency} `}${rupees.toLocaleString("en-IN")}`;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function isGiftOrder(order: AdminOrder): boolean {
  if (order.source === "frontend-gift-checkout") return true;
  if (order.notes && order.notes.toLowerCase().includes("gift box")) return true;
  return order.items.some(
    (i) =>
      i.variantSummary?.toLowerCase().includes("gift box") ||
      (i.selectedOptionsJson &&
        Object.keys(i.selectedOptionsJson).some((k) =>
          k.toLowerCase().includes("gift"),
        )),
  );
}

export default function OrdersManager({
  initialOrders,
}: {
  initialOrders: AdminOrder[];
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<
    "all" | "paid" | "gifts" | "pending-payment" | "shipped" | "action-needed"
  >("all");
  const [selectedOrderForSlip, setSelectedOrderForSlip] =
    useState<AdminOrder | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] =
    useState<AdminOrder | null>(null);

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Statistics
  const stats = useMemo(() => {
    const total = orders.length;
    const paidOrders = orders.filter((o) => o.paymentStatus === "PAID");
    const totalPaidRevenuePaise = paidOrders.reduce(
      (sum, o) => sum + o.totalAmount,
      0,
    );
    const giftCount = orders.filter(isGiftOrder).length;
    const pendingDispatch = paidOrders.filter(
      (o) => o.shipmentStatus === "NOT_CREATED",
    ).length;
    const inTransit = orders.filter((o) =>
      ["PUSHED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(
        o.shipmentStatus,
      ),
    ).length;

    return {
      total,
      paidCount: paidOrders.length,
      revenueFormatted: formatPrice(totalPaidRevenuePaise, "INR"),
      giftCount,
      pendingDispatch,
      inTransit,
    };
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (activeTab === "paid" && order.paymentStatus !== "PAID") return false;
      if (activeTab === "gifts" && !isGiftOrder(order)) return false;
      if (activeTab === "pending-payment" && order.paymentStatus === "PAID")
        return false;
      if (
        activeTab === "shipped" &&
        !["PUSHED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
          order.shipmentStatus,
        )
      )
        return false;
      if (activeTab === "action-needed") {
        const needsPush =
          order.paymentStatus === "PAID" &&
          order.shipmentStatus === "NOT_CREATED";
        const hasError =
          order.shipmentStatus === "FAILED" || Boolean(order.shipmentError);
        const isNewUnreviewed =
          order.status === "NEW" && order.paymentStatus === "PAID";
        if (!needsPush && !hasError && !isNewUnreviewed) return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesId = order.id.toLowerCase().includes(q);
        const matchesName = order.name.toLowerCase().includes(q);
        const matchesEmail = order.email.toLowerCase().includes(q);
        const matchesPhone = Boolean(order.phone?.toLowerCase().includes(q));
        const matchesPaymentId = Boolean(
          order.razorpayPaymentId?.toLowerCase().includes(q),
        );
        const matchesAwb = Boolean(order.awbCode?.toLowerCase().includes(q));
        const matchesCity = Boolean(
          order.shippingCity?.toLowerCase().includes(q),
        );
        const matchesItems = order.items.some((i) =>
          i.product?.title?.toLowerCase().includes(q),
        );

        if (
          !matchesId &&
          !matchesName &&
          !matchesEmail &&
          !matchesPhone &&
          !matchesPaymentId &&
          !matchesAwb &&
          !matchesCity &&
          !matchesItems
        ) {
          return false;
        }
      }

      return true;
    });
  }, [orders, activeTab, search]);

  function copyText(text: string, id: string) {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  // Quick status update API
  async function updateOrderStatus(
    orderId: string,
    updates: {
      status?: LeadStatus;
      paymentStatus?: PaymentStatus;
      shipmentStatus?: ShipmentStatus;
      notes?: string;
      awbCode?: string;
      courierName?: string;
      trackingUrl?: string;
    },
  ) {
    startTransition(async () => {
      setNotice(null);
      setError(null);
      try {
        const res = await fetch(`/api/admin/proxy/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setError(body?.error ?? "Failed to update order.");
          return;
        }

        const data = (await res.json()) as { item: AdminOrder };
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? data.item : o)),
        );
        setNotice("Order updated successfully.");
        router.refresh();
      } catch {
        setError("Network error while updating order.");
      }
    });
  }

  // Push to Shiprocket
  async function pushToShiprocket(orderId: string) {
    startTransition(async () => {
      setNotice(null);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/proxy/orders/${orderId}/shiprocket/push`,
          {
            method: "POST",
          },
        );

        const body = (await res.json().catch(() => null)) as {
          item?: AdminOrder;
          error?: string;
        } | null;

        if (!res.ok) {
          setError(body?.error ?? "Failed to push order to Shiprocket.");
          return;
        }

        if (body?.item) {
          setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? body.item! : o)),
          );
        }
        setNotice(
          "Shipment successfully pushed to Shiprocket & customer email notified.",
        );
        router.refresh();
      } catch {
        setError("Network error while communicating with Shiprocket.");
      }
    });
  }

  // Resend Order Confirmation Email
  async function resendConfirmationEmail(orderId: string) {
    startTransition(async () => {
      setNotice(null);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/proxy/orders/${orderId}/resend-confirmation`,
          {
            method: "POST",
          },
        );

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setError(body?.error ?? "Failed to resend confirmation.");
          return;
        }

        setNotice("Order confirmation email successfully dispatched.");
      } catch {
        setError("Network error while sending email.");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Notifications */}
      {notice && (
        <div className="flex items-center justify-between rounded-2xl border border-[#cde0d2] bg-[#eef8f0] px-5 py-4 text-[13px] text-[#2c6541]">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-[#2c6541]/70 hover:text-[#2c6541]"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-[#e7c1ba] bg-[#fff1ee] px-5 py-4 text-[13px] text-[#9f4332]">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-[#9f4332]/70 hover:text-[#9f4332]"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <AdminCard>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#8a7e71]">
            Total Orders
          </p>
          <p className="mt-3 font-serif text-[34px] leading-none text-[#1d1916]">
            {stats.total}
          </p>
        </AdminCard>

        <AdminCard>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#8a7e71]">
            Paid Revenue
          </p>
          <p className="mt-3 font-serif text-[34px] leading-none text-[#2e4a36]">
            {stats.revenueFormatted}
          </p>
        </AdminCard>

        <AdminCard>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-[#4a6350]">
            <Gift size={12} />
            <span>Gift Boxes</span>
          </div>
          <p className="mt-3 font-serif text-[34px] leading-none text-[#23382b]">
            {stats.giftCount}
          </p>
        </AdminCard>

        <AdminCard>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#8a7e71]">
            Pending Dispatch
          </p>
          <p
            className={`mt-3 font-serif text-[34px] leading-none ${
              stats.pendingDispatch > 0 ? "text-[#b25e3b]" : "text-[#1d1916]"
            }`}
          >
            {stats.pendingDispatch}
          </p>
        </AdminCard>

        <AdminCard>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#8a7e71]">
            In Transit / Active
          </p>
          <p className="mt-3 font-serif text-[34px] leading-none text-[#3b5060]">
            {stats.inTransit}
          </p>
        </AdminCard>
      </div>

      {/* Controls: Search & Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: `All (${orders.length})` },
            { key: "paid", label: `Paid (${stats.paidCount})` },
            { key: "gifts", label: `Gift Boxes 🎁 (${stats.giftCount})` },
            {
              key: "action-needed",
              label: `Needs Action (${stats.pendingDispatch})`,
            },
            { key: "shipped", label: `Dispatched (${stats.inTransit})` },
            {
              key: "pending-payment",
              label: `Unpaid (${orders.length - stats.paidCount})`,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`rounded-full px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] transition ${
                activeTab === tab.key
                  ? "bg-[#2e4a36] text-[#f4efe8] shadow-sm"
                  : "border border-[#cdbfae] bg-[#f8f2e8] text-[#3a3129] hover:bg-[#efe6d8]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Live Search */}
        <div className="relative min-w-[280px]">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e8174]"
          />
          <input
            type="text"
            placeholder="Search order ID, name, email, phone, AWB..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-[#cfc3b4] bg-[#faf7f1] pl-10 pr-4 py-2 text-[13px] text-[#2f2924] outline-none focus:border-[#2e4a36] focus:ring-1 focus:ring-[#2e4a36]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#8e8174] hover:text-[#2f2924]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-6">
        {filteredOrders.length === 0 ? (
          <div className="rounded-[28px] border border-[#d8cec1] bg-[#faf7f1] p-12 text-center text-[#685d52]">
            <ShoppingBag size={32} className="mx-auto text-[#a59685]" />
            <h3 className="mt-4 font-serif text-[22px] text-[#1d1916]">
              No orders found
            </h3>
            <p className="mt-2 text-[14px]">
              {search
                ? `No orders matching "${search}".`
                : "No orders in this category."}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isGift = isGiftOrder(order);
            const canShiprocketPush =
              order.paymentStatus === "PAID" &&
              order.shipmentStatus === "NOT_CREATED";

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-[26px] border border-[#d8cec1] bg-[#faf7f1] shadow-sm transition hover:shadow-md"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e6ddd1] bg-[#f4ebe0]/80 px-6 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[13px] font-semibold text-[#1d1916]">
                      #{order.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(order.id, order.id)}
                      className="text-[#8a7d6e] hover:text-[#2e4a36]"
                      title="Copy Order ID"
                    >
                      {copiedId === order.id ? (
                        <Check size={14} className="text-[#2c6541]" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>

                    <span className="text-[#a59685]">·</span>
                    <span className="text-[12px] text-[#6b6055]">
                      {formatDate(order.createdAt)}
                    </span>

                    {isGift && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2e4a36] px-3 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[#f4efe8] shadow-sm">
                        <Gift size={11} />
                        <span>Curated Gift Box</span>
                      </span>
                    )}
                  </div>

                  {/* Status Badges Group */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Order Status */}
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${
                        ORDER_STATUS_COLORS[order.status]
                      }`}
                    >
                      Order: {order.status}
                    </span>

                    {/* Payment Status */}
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${
                        PAYMENT_BADGE_COLORS[order.paymentStatus]
                      }`}
                    >
                      Payment: {order.paymentStatus}
                    </span>

                    {/* Shipment Status */}
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${
                        SHIPMENT_BADGE_COLORS[order.shipmentStatus]
                      }`}
                    >
                      Shipping: {order.shipmentStatus.replaceAll("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr]">
                  {/* Left Column: Customer, Items, Gift Notes */}
                  <div className="space-y-6">
                    {/* Customer Row */}
                    <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-[#f2e9dc] p-4">
                      <div>
                        <p className="font-serif text-[17px] font-medium text-[#1d1916]">
                          {order.name}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[12px] text-[#5e5348]">
                          <a
                            href={`mailto:${order.email}?subject=Seijaku Order %23${order.id}`}
                            className="inline-flex items-center gap-1 hover:text-[#2e4a36] hover:underline"
                          >
                            <Mail size={13} />
                            <span>{order.email}</span>
                          </a>
                          {order.phone && (
                            <>
                              <span>·</span>
                              <a
                                href={`tel:${order.phone}`}
                                className="inline-flex items-center gap-1 hover:text-[#2e4a36] hover:underline"
                              >
                                <Phone size={13} />
                                <span>{order.phone}</span>
                              </a>
                              <span>·</span>
                              <a
                                href={`https://wa.me/${order.phone.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[#2d683a] hover:underline"
                              >
                                <MessageCircle size={13} />
                                <span>WhatsApp</span>
                              </a>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Shipping Address */}
                      <div className="text-right text-[12px] leading-[1.6] text-[#6b6055]">
                        <p className="font-medium uppercase tracking-[0.16em] text-[10px] text-[#8a7d6e]">
                          Shipping Destination
                        </p>
                        <p className="mt-1 text-[#3a322b]">
                          {order.shippingLine1}
                          {order.shippingLine2 ? `, ${order.shippingLine2}` : ""}
                        </p>
                        <p>
                          {order.shippingCity}, {order.shippingState}{" "}
                          <span className="font-mono font-medium">
                            {order.shippingPincode}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Customer Notes / Gift Message */}
                    {order.notes && (
                      <div
                        className={`rounded-2xl p-4 text-[13px] leading-[1.7] ${
                          isGift
                            ? "border border-[#2e4a36]/25 bg-[#eef6f0] text-[#24422e]"
                            : "border border-[#ded3c5] bg-[#f6eee2] text-[#554b41]"
                        }`}
                      >
                        <p className="flex items-center gap-1.5 font-medium uppercase tracking-[0.16em] text-[10px] text-[#4f6853]">
                          {isGift ? <Gift size={13} /> : <FileText size={13} />}
                          <span>
                            {isGift ? "Gift Card Message & Notes" : "Order Notes"}
                          </span>
                        </p>
                        <p className="mt-2 whitespace-pre-line font-serif text-[15px]">
                          {order.notes}
                        </p>
                      </div>
                    )}

                    {/* Ordered Items List */}
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#8a7d6e] mb-3">
                        Items Ordered ({order.items.length})
                      </p>
                      <div className="space-y-3">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3.5 rounded-xl border border-[#e4d9cb] bg-white p-3"
                          >
                            {item.product?.image ? (
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#f0e6d8]">
                                <Image
                                  src={item.product.image}
                                  alt={item.product.title}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#f0e6d8] text-[#8a7d6e]">
                                <ShoppingBag size={20} />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-[14px] text-[#1d1916]">
                                {item.product?.title || "Product"}
                              </p>
                              {item.variantSummary && (
                                <p className="mt-0.5 truncate text-[12px] text-[#6b6055]">
                                  {item.variantSummary}
                                </p>
                              )}
                              {item.selectedOptionsJson &&
                                Object.keys(item.selectedOptionsJson).length >
                                  0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {Object.entries(
                                      item.selectedOptionsJson,
                                    ).map(([k, v]) => (
                                      <span
                                        key={k}
                                        className="rounded bg-[#f4efe8] px-1.5 py-0.5 text-[10px] text-[#554b41]"
                                      >
                                        {k}: {v}
                                      </span>
                                    ))}
                                  </div>
                                )}
                            </div>

                            <div className="text-right">
                              <p className="font-semibold text-[13px] text-[#1d1916]">
                                {formatPrice(
                                  item.unitPriceAmount * item.quantity * 100,
                                  order.currency,
                                )}
                              </p>
                              <p className="text-[11px] text-[#8a7d6e]">
                                Qty: {item.quantity}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Financials, Shipment, Status Actions */}
                  <div className="space-y-5 rounded-2xl bg-[#f2e9dc] p-5">
                    {/* Financial Summary */}
                    <div className="border-b border-[#ded3c5] pb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] uppercase tracking-[0.16em] text-[#8a7d6e]">
                          Total Paid Amount
                        </span>
                        <span className="font-serif text-[24px] font-semibold text-[#1d1916]">
                          {formatPrice(order.totalAmount, order.currency)}
                        </span>
                      </div>
                      {order.razorpayPaymentId && (
                        <div className="mt-2 flex items-center justify-between text-[11px] text-[#6b6055]">
                          <span>Razorpay Payment ID:</span>
                          <span className="font-mono font-medium text-[#2e4a36]">
                            {order.razorpayPaymentId}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Shipping & Courier Info */}
                    <div className="border-b border-[#ded3c5] pb-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a7d6e]">
                        Fulfillment & Dispatch
                      </p>
                      <div className="mt-2 space-y-1.5 text-[12px] text-[#4f453a]">
                        {order.courierName && (
                          <div className="flex justify-between">
                            <span className="text-[#7d7164]">Courier:</span>
                            <span className="font-medium text-[#1d1916]">
                              {order.courierName}
                            </span>
                          </div>
                        )}
                        {order.awbCode && (
                          <div className="flex justify-between">
                            <span className="text-[#7d7164]">AWB Tracking:</span>
                            <span className="font-mono font-medium text-[#1d1916]">
                              {order.awbCode}
                            </span>
                          </div>
                        )}
                        {order.trackingUrl && (
                          <div className="mt-1 text-right">
                            <a
                              href={order.trackingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2e4a36] underline hover:text-[#1e3425]"
                            >
                              <span>Track on Carrier Website</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        )}
                        {order.shipmentError && (
                          <p className="mt-2 rounded-lg bg-[#fce8e6] p-2 text-[11px] text-[#9f4332]">
                            Last Error: {order.shipmentError}
                          </p>
                        )}
                      </div>

                      {/* Shiprocket Push Button */}
                      {canShiprocketPush && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => pushToShiprocket(order.id)}
                          className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[#2e4a36] text-[11px] font-medium uppercase tracking-[0.16em] text-[#f4efe8] transition hover:bg-[#23382b] disabled:opacity-50"
                        >
                          <Truck size={14} />
                          <span>Push to Shiprocket</span>
                        </button>
                      )}
                    </div>

                    {/* Status Management Dropdowns */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a7d6e]">
                        Update Order Statuses
                      </p>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        {/* Order / Lead Status */}
                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.14em] text-[#7d7164] mb-1">
                            Order Status
                          </label>
                          <select
                            value={order.status}
                            disabled={isPending}
                            onChange={(e) =>
                              updateOrderStatus(order.id, {
                                status: e.target.value as LeadStatus,
                              })
                            }
                            className="w-full rounded-xl border border-[#cdbfae] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#2d2824] outline-none focus:border-[#2e4a36]"
                          >
                            <option value="NEW">NEW</option>
                            <option value="REVIEWED">REVIEWED</option>
                            <option value="CONTACTED">CONTACTED</option>
                            <option value="CLOSED">CLOSED</option>
                          </select>
                        </div>

                        {/* Payment Status */}
                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.14em] text-[#7d7164] mb-1">
                            Payment
                          </label>
                          <select
                            value={order.paymentStatus}
                            disabled={isPending}
                            onChange={(e) =>
                              updateOrderStatus(order.id, {
                                paymentStatus: e.target.value as PaymentStatus,
                              })
                            }
                            className="w-full rounded-xl border border-[#cdbfae] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#2d2824] outline-none focus:border-[#2e4a36]"
                          >
                            <option value="CREATED">CREATED</option>
                            <option value="PAID">PAID</option>
                            <option value="FAILED">FAILED</option>
                            <option value="REFUNDED">REFUNDED</option>
                          </select>
                        </div>

                        {/* Shipment Status */}
                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.14em] text-[#7d7164] mb-1">
                            Shipment
                          </label>
                          <select
                            value={order.shipmentStatus}
                            disabled={isPending}
                            onChange={(e) =>
                              updateOrderStatus(order.id, {
                                shipmentStatus: e.target.value as ShipmentStatus,
                              })
                            }
                            className="w-full rounded-xl border border-[#cdbfae] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#2d2824] outline-none focus:border-[#2e4a36]"
                          >
                            <option value="NOT_CREATED">NOT CREATED</option>
                            <option value="PUSHED">PUSHED</option>
                            <option value="PICKED_UP">PICKED UP</option>
                            <option value="IN_TRANSIT">IN TRANSIT</option>
                            <option value="OUT_FOR_DELIVERY">
                              OUT FOR DELIVERY
                            </option>
                            <option value="DELIVERED">DELIVERED</option>
                            <option value="CANCELLED">CANCELLED</option>
                            <option value="RTO">RTO</option>
                            <option value="FAILED">FAILED</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#ded3c5]">
                      {/* Print Packing Slip */}
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForSlip(order)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#cdbfae] bg-white px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#3a3129] transition hover:bg-[#eae0d1]"
                      >
                        <Printer size={13} />
                        <span>Packing Slip</span>
                      </button>

                      {/* Resend Confirmation Email */}
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => resendConfirmationEmail(order.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#cdbfae] bg-white px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#3a3129] transition hover:bg-[#eae0d1] disabled:opacity-50"
                      >
                        <Send size={12} />
                        <span>Resend Email</span>
                      </button>

                      {/* Edit Notes & Tracking */}
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForEdit(order)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#cdbfae] bg-white px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#3a3129] transition hover:bg-[#eae0d1]"
                      >
                        <Edit3 size={12} />
                        <span>Edit Details</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Edit Order Tracking & Notes Dialog */}
      {selectedOrderForEdit && (
        <EditOrderModal
          order={selectedOrderForEdit}
          onClose={() => setSelectedOrderForEdit(null)}
          onSave={async (updates) => {
            await updateOrderStatus(selectedOrderForEdit.id, updates);
            setSelectedOrderForEdit(null);
          }}
        />
      )}

      {/* MODAL 2: Printable Packing Slip / Receipt */}
      {selectedOrderForSlip && (
        <PackingSlipModal
          order={selectedOrderForSlip}
          onClose={() => setSelectedOrderForSlip(null)}
        />
      )}
    </div>
  );
}

// ─── Modal 1: Edit Order Notes & Shipping Details ──────────────────────────────

function EditOrderModal({
  order,
  onClose,
  onSave,
}: {
  order: AdminOrder;
  onClose: () => void;
  onSave: (updates: {
    notes?: string;
    awbCode?: string;
    courierName?: string;
    trackingUrl?: string;
    shippingLine1?: string;
    shippingLine2?: string;
    shippingCity?: string;
    shippingState?: string;
    shippingPincode?: string;
  }) => Promise<void>;
}) {
  const [notes, setNotes] = useState(order.notes ?? "");
  const [awbCode, setAwbCode] = useState(order.awbCode ?? "");
  const [courierName, setCourierName] = useState(order.courierName ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl ?? "");
  const [line1, setLine1] = useState(order.shippingLine1 ?? "");
  const [line2, setLine2] = useState(order.shippingLine2 ?? "");
  const [city, setCity] = useState(order.shippingCity ?? "");
  const [state, setState] = useState(order.shippingState ?? "");
  const [pincode, setPincode] = useState(order.shippingPincode ?? "");
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[28px] border border-[#d8cec1] bg-[#faf7f1] p-6 sm:p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-[#7a6d5f] hover:bg-[#eee3d5]"
        >
          <X size={18} />
        </button>

        <h3 className="font-serif text-[24px] text-[#1d1916]">
          Edit Order #{order.id}
        </h3>
        <p className="mt-1 text-[13px] text-[#6b6055]">
          Update notes, dispatch tracking details, or delivery address.
        </p>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setIsSaving(true);
            try {
              await onSave({
                notes,
                awbCode: awbCode || undefined,
                courierName: courierName || undefined,
                trackingUrl: trackingUrl || undefined,
                shippingLine1: line1 || undefined,
                shippingLine2: line2 || undefined,
                shippingCity: city || undefined,
                shippingState: state || undefined,
                shippingPincode: pincode || undefined,
              });
            } finally {
              setIsSaving(false);
            }
          }}
          className="mt-6 space-y-4"
        >
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7d7164] mb-1">
              Order Notes & Instructions
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-[#cfc3b4] bg-white p-3 text-[13px] text-[#2f2924] outline-none focus:border-[#2e4a36]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7d7164] mb-1">
                Courier Name
              </label>
              <input
                type="text"
                placeholder="e.g. Bluedart, Delhivery"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                className="w-full rounded-xl border border-[#cfc3b4] bg-white p-2.5 text-[13px] text-[#2f2924] outline-none focus:border-[#2e4a36]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7d7164] mb-1">
                AWB Tracking #
              </label>
              <input
                type="text"
                placeholder="e.g. 123456789"
                value={awbCode}
                onChange={(e) => setAwbCode(e.target.value)}
                className="w-full rounded-xl border border-[#cfc3b4] bg-white p-2.5 text-[13px] text-[#2f2924] outline-none focus:border-[#2e4a36]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7d7164] mb-1">
                Carrier URL
              </label>
              <input
                type="text"
                placeholder="https://..."
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                className="w-full rounded-xl border border-[#cfc3b4] bg-white p-2.5 text-[13px] text-[#2f2924] outline-none focus:border-[#2e4a36]"
              />
            </div>
          </div>

          <div className="border-t border-[#e2d7c7] pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7d7164] mb-2">
              Shipping Address
            </p>
            <div className="grid gap-2.5">
              <input
                type="text"
                placeholder="Address Line 1"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                className="w-full rounded-xl border border-[#cfc3b4] bg-white p-2.5 text-[13px] text-[#2f2924] outline-none focus:border-[#2e4a36]"
              />
              <input
                type="text"
                placeholder="Address Line 2 (optional)"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                className="w-full rounded-xl border border-[#cfc3b4] bg-white p-2.5 text-[13px] text-[#2f2924] outline-none focus:border-[#2e4a36]"
              />
              <div className="grid grid-cols-3 gap-2.5">
                <input
                  type="text"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border border-[#cfc3b4] bg-white p-2.5 text-[13px] text-[#2f2924] outline-none focus:border-[#2e4a36]"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full rounded-xl border border-[#cfc3b4] bg-white p-2.5 text-[13px] text-[#2f2924] outline-none focus:border-[#2e4a36]"
                />
                <input
                  type="text"
                  placeholder="Pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full rounded-xl border border-[#cfc3b4] bg-white p-2.5 text-[13px] text-[#2f2924] outline-none focus:border-[#2e4a36]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#e2d7c7]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#cdbfae] px-5 py-2 text-[12px] font-medium text-[#4a3f36] hover:bg-[#eae0d1]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-[#2e4a36] px-6 py-2 text-[12px] font-medium uppercase tracking-[0.16em] text-[#f4efe8] hover:bg-[#23382b] disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal 2: Printable Packing Slip ──────────────────────────────────────────

function PackingSlipModal({
  order,
  onClose,
}: {
  order: AdminOrder;
  onClose: () => void;
}) {
  const isGift = isGiftOrder(order);

  function triggerPrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm print:p-0 print:bg-white print:fixed">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-[28px] border border-[#d8cec1] bg-white p-8 sm:p-10 shadow-2xl print:border-none print:shadow-none print:max-h-none print:w-full print:p-0">
        <div className="flex items-center justify-between border-b border-[#e5ddd2] pb-5 print:hidden">
          <span className="font-serif text-[20px] text-[#1d1916]">
            Packing Slip & Receipt
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={triggerPrint}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#2e4a36] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white hover:bg-[#23382b]"
            >
              <Printer size={13} />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-[#7a6d5f] hover:bg-[#eee3d5]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Packing Slip Area */}
        <div className="mt-6 space-y-8 font-sans text-[#2f2924]">
          {/* Brand Header */}
          <div className="flex items-start justify-between border-b border-black/10 pb-6">
            <div>
              <h1 className="font-serif text-[32px] tracking-tight text-[#1d1916]">
                SEIJAKU
              </h1>
              <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-[#7a6d5f]">
                Quiet Structure · Studio Kolkata
              </p>
            </div>
            <div className="text-right text-[12px]">
              <p className="font-mono font-semibold text-[14px]">#{order.id}</p>
              <p className="text-[#6c6157] mt-0.5">
                Date: {formatDate(order.createdAt)}
              </p>
              <p className="mt-1 font-medium text-[#2e4a36]">
                Payment: {order.paymentStatus}
              </p>
            </div>
          </div>

          {/* Gift Box Notice */}
          {isGift && (
            <div className="rounded-xl border border-[#2e4a36] bg-[#f0f6f2] p-4 text-[13px] text-[#24422e]">
              <div className="flex items-center gap-2 font-semibold uppercase tracking-[0.16em] text-[11px]">
                <Gift size={14} />
                <span>Curated Festive Gift Box Order</span>
              </div>
              <p className="mt-1 text-[12px] leading-[1.6]">
                Assemble all items inside the signature Seijaku festive gift box
                with protective wrapping and include handwritten card.
              </p>
            </div>
          )}

          {/* Recipient / Shipping Info */}
          <div className="grid grid-cols-2 gap-8 border-b border-black/10 pb-6 text-[13px]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8a7d6e]">
                Ship To
              </p>
              <p className="mt-2 font-serif text-[17px] font-medium text-[#1d1916]">
                {order.name}
              </p>
              <p className="mt-1 text-[#4f453a] leading-[1.6]">
                {order.shippingLine1}
                {order.shippingLine2 && `, ${order.shippingLine2}`}
                <br />
                {order.shippingCity}, {order.shippingState} -{" "}
                <span className="font-mono font-semibold">
                  {order.shippingPincode}
                </span>
                <br />
                India
              </p>
              {order.phone && <p className="mt-1">Contact: {order.phone}</p>}
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8a7d6e]">
                Order Details
              </p>
              <p className="mt-2 text-[#4f453a] leading-[1.6]">
                Customer: {order.name} ({order.email})
                <br />
                Razorpay ID: {order.razorpayPaymentId || "—"}
                <br />
                Status: {order.status}
              </p>
              {order.awbCode && (
                <p className="mt-2 font-mono text-[12px]">
                  AWB: {order.awbCode} ({order.courierName || "Shiprocket"})
                </p>
              )}
            </div>
          </div>

          {/* Handwritten Card Message Note */}
          {order.notes && (
            <div className="rounded-xl border border-dashed border-[#cdbfae] bg-[#faf7f1] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8a7d6e]">
                Handwritten Note / Special Instructions
              </p>
              <p className="mt-2 whitespace-pre-line font-serif text-[15px] italic text-[#2f2924]">
                &ldquo;{order.notes}&rdquo;
              </p>
            </div>
          )}

          {/* Items Table */}
          <div>
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-black/10 text-[10px] uppercase tracking-[0.2em] text-[#8a7d6e]">
                  <th className="py-2.5">Item Description</th>
                  <th className="py-2.5 text-center">Qty</th>
                  <th className="py-2.5 text-right">Price</th>
                  <th className="py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-[#1d1916]">
                        {item.product?.title || "Product"}
                      </p>
                      {item.variantSummary && (
                        <p className="mt-0.5 text-[11px] text-[#6b6055]">
                          {item.variantSummary}
                        </p>
                      )}
                    </td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right">
                      {formatPrice(item.unitPriceAmount * 100, order.currency)}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {formatPrice(
                        item.unitPriceAmount * item.quantity * 100,
                        order.currency,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-black/15 font-semibold text-[14px]">
                  <td colSpan={3} className="pt-4 text-right">
                    Total Amount:
                  </td>
                  <td className="pt-4 text-right font-serif text-[16px] text-[#1d1916]">
                    {formatPrice(order.totalAmount, order.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="border-t border-black/10 pt-6 text-center text-[11px] text-[#7a6d5f]">
            <p>Thank you for shopping with Seijaku.</p>
            <p className="mt-0.5">
              Queries: lifeatseijaku@gmail.com · +91 9432804418
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
