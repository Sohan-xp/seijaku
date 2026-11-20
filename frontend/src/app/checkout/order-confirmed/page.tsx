import Link from "next/link";

import { getBackendBaseUrl } from "@/src/lib/backend";
import { canonicalShopRoutes } from "@/src/lib/shop-routes";

export const dynamic = "force-dynamic";

type ConfirmedOrder = {
  id: string;
  paymentStatus: "CREATED" | "PAID" | "FAILED" | "REFUNDED";
  totalAmount: number;
  currency: string;
  razorpayPaymentId: string | null;
  source?: string | null;
};

async function fetchOrder(orderId: string): Promise<ConfirmedOrder | null> {
  // Bypass the public BFF proxy for SSR — we're already on the server.
  const base = getBackendBaseUrl();
  try {
    const res = await fetch(`${base}/payments/orders/${encodeURIComponent(orderId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { item?: ConfirmedOrder };
    return body.item ?? null;
  } catch {
    return null;
  }
}

function maskPaymentId(id: string | null | undefined): string {
  if (!id || id.length < 7) return id ?? "—";
  return `${id.slice(0, 4)}…${id.slice(-3)}`;
}

function formatAmount(amountPaise: number, currency: string): string {
  const amount = (amountPaise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${currency} ${amount}`;
}

export default async function OrderConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; gift?: string }>;
}) {
  const { order: orderId, gift } = await searchParams;
  const order = orderId ? await fetchOrder(orderId) : null;
  const isGiftOrder = gift === "true" || order?.source === "frontend-gift-checkout";

  return (
    <main className="min-h-screen bg-[#f3efe7] pt-[72px] text-[#3a3a3a] sm:pt-[76px]">
      <section className="section-primary pt-24 sm:pt-28">
        <div className="page-container max-w-[760px] rounded-[30px] border border-[#d8cec1] bg-[#faf7f1] px-8 py-12 sm:px-12 sm:py-16">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#9a785d]">
            {isGiftOrder ? "Curated Gift Box Confirmed" : "Order confirmed"}
          </p>
          <h1 className="mt-5 max-w-[18ch] font-serif text-[clamp(34px,3.6vw,48px)] leading-[1.06] tracking-[-0.025em] text-[#1d1a17]">
            {isGiftOrder
              ? "Thank you. Your Seijaku Gift Box is being prepared."
              : "Thank you. Your Seijaku order is being prepared."}
          </h1>
          <p className="mt-6 max-w-[52ch] text-[15px] leading-[1.85] text-[#5f584f]">
            {isGiftOrder
              ? "Your chosen objects are being assembled into our signature festive gift packaging along with your handwritten card. We will email tracking details as soon as it departs."
              : "We'll be in touch by email with fulfillment details and tracking. If you have a question in the meantime, simply reply to that email."}
          </p>

          {isGiftOrder && (
            <div className="mt-8 rounded-[20px] border border-[#2e4a36]/20 bg-[#eef5f0] p-5">
              <div className="flex items-start gap-3.5">
                <span className="text-[24px]">🎁</span>
                <div>
                  <p className="font-serif text-[16px] font-medium text-[#1d1a17]">
                    Festive Gift Packaging & Handwritten Note
                  </p>
                  <p className="mt-1 text-[13px] leading-[1.65] text-[#4b5849]">
                    Complimentary gift packaging is included with this order. Each item will be nested carefully in our gift box.
                  </p>
                </div>
              </div>
            </div>
          )}

          {order ? (
            <dl className="mt-10 grid gap-4 rounded-[20px] bg-[#f2eadf] px-6 py-5 text-[14px] text-[#4b433b]">
              <div className="flex items-center justify-between">
                <dt className="uppercase tracking-[0.18em] text-[10px] text-[#8f7a65]">Order</dt>
                <dd className="font-mono text-[12px]">{order.id}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="uppercase tracking-[0.18em] text-[10px] text-[#8f7a65]">Payment</dt>
                <dd className="font-mono text-[12px]">{maskPaymentId(order.razorpayPaymentId)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="uppercase tracking-[0.18em] text-[10px] text-[#8f7a65]">Status</dt>
                <dd>{order.paymentStatus}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="uppercase tracking-[0.18em] text-[10px] text-[#8f7a65]">Total</dt>
                <dd>{formatAmount(order.totalAmount, order.currency)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-10 rounded-[18px] border border-[#d8cec1] bg-[#f2eadf] px-5 py-4 text-[13px] leading-[1.7] text-[#5f584f]">
              We couldn&apos;t pull your order details just now, but your payment has been received.
              You&apos;ll receive an email confirmation shortly.
            </p>
          )}

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href={canonicalShopRoutes.shopAll}
              className="inline-flex items-center justify-center rounded-full bg-[#2e4a36] px-6 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#f4efe8] hover:bg-[#243c2c]"
            >
              Continue exploring
            </Link>
            <Link
              href="/"
              className="text-[12px] uppercase tracking-[0.2em] text-[#4f473f] underline decoration-black/10 underline-offset-4 hover:opacity-70"
            >
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
