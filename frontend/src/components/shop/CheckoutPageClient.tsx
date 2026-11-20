"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ShoppingBag, ArrowLeft, ShieldCheck, Gift } from "lucide-react";

import { loadRazorpayCheckout, type RazorpayPaymentResponse } from "@/src/lib/razorpay";
import { canonicalShopRoutes } from "@/src/lib/shop-routes";
import {
  normalizeBackendProduct,
  type BackendProduct,
  type ProductView,
} from "@/src/lib/product-types";
import {
  getGiftCheckoutBundle,
  clearGiftCheckoutBundle,
  clearStoredGiftItems,
  type GiftCheckoutBundle,
} from "@/src/app/build-gift/utils";

import { useShopState } from "./ShopStateProvider";

type CreateOrderResponse = {
  orderId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
};

type CheckoutLineItem = {
  productSlug: string;
  title: string;
  unitPrice: number;
  priceLabel?: string;
  quantity: number;
  image?: string;
  shortDescription?: string;
  variantLabel?: string | null;
  selectedOptions?: Record<string, string> | null;
  categoryName?: string;
  weightGrams?: number | null;
  lengthCm?: number | null;
  breadthCm?: number | null;
  heightCm?: number | null;
};

type FormField =
  | "name"
  | "email"
  | "phone"
  | "shippingLine1"
  | "shippingCity"
  | "shippingState"
  | "shippingPincode";

function isValidEmail(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
    trimmed
  );
}

export default function CheckoutPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    checkoutItemSlug,
    checkoutVariantLabel,
    checkoutSelectedOptions,
    cart,
    clearCart,
    clearCheckout,
  } = useShopState();

  const isGiftParam = searchParams.get("gift") === "true";
  const [giftBundle, setGiftBundle] = useState<GiftCheckoutBundle | null>(null);
  const [giftNote, setGiftNote] = useState<string>("");

  useEffect(() => {
    const bundle = getGiftCheckoutBundle();
    if (bundle && (isGiftParam || (!searchParams.get("item") && !checkoutItemSlug))) {
      setGiftBundle(bundle);
    }
  }, [isGiftParam, searchParams, checkoutItemSlug]);

  const isGiftMode = Boolean(isGiftParam || (giftBundle && giftBundle.items.length > 0 && !searchParams.get("item")));

  const querySlug = searchParams.get("item");
  const activeSlug = useMemo(
    () => {
      if (isGiftMode) return null;
      return querySlug && querySlug.length > 0 ? querySlug : checkoutItemSlug;
    },
    [isGiftMode, querySlug, checkoutItemSlug],
  );

  const [singleItem, setSingleItem] = useState<ProductView | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(Boolean(activeSlug));
  const [selectedOptionsState, setSelectedOptionsState] = useState<Record<string, string>>(() => {
    return checkoutSelectedOptions ?? {};
  });

  useEffect(() => {
    if (checkoutSelectedOptions && Object.keys(checkoutSelectedOptions).length > 0) {
      setSelectedOptionsState(checkoutSelectedOptions);
    }
  }, [checkoutSelectedOptions]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [shippingLine1, setShippingLine1] = useState("");
  const [shippingLine2, setShippingLine2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPincode, setShippingPincode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormField, string>>>({});

  const clearFieldError = (field: FormField) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setError(null);
  };

  const validateForm = () => {
    const errors: Partial<Record<FormField, string>> = {};

    // Name
    if (!name.trim()) {
      errors.name = "Please enter your full name.";
    } else if (name.trim().length < 2) {
      errors.name = "Full name must be at least 2 characters.";
    }

    // Email
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = "Please enter your email address.";
    } else if (!isValidEmail(trimmedEmail)) {
      errors.email = "Please enter a valid email address (e.g. name@example.com).";
    }

    // Phone
    const trimmedPhone = phone.trim();
    const phoneDigits = trimmedPhone.replace(/\D/g, "");
    if (!trimmedPhone) {
      errors.phone = "Please enter your phone number.";
    } else if (phoneDigits.length < 10) {
      errors.phone = "Please enter a valid 10-digit phone number.";
    }

    // Shipping address line 1
    if (!shippingLine1.trim()) {
      errors.shippingLine1 = "Please enter your delivery address (Flat, House, Street).";
    }

    // City
    if (!shippingCity.trim()) {
      errors.shippingCity = "Please enter your city.";
    }

    // State
    if (!shippingState.trim()) {
      errors.shippingState = "Please enter your state.";
    }

    // Pincode
    const trimmedPincode = shippingPincode.trim();
    if (!trimmedPincode) {
      errors.shippingPincode = "Please enter your 6-digit pincode.";
    } else if (!/^[0-9]{6}$/.test(trimmedPincode)) {
      errors.shippingPincode = "Pincode must be exactly 6 digits.";
    }

    return errors;
  };
  const [isPending, startTransition] = useTransition();
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState<string | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

  // If a single slug is active (Buy Now), load it from backend
  useEffect(() => {
    if (!activeSlug) {
      setSingleItem(null);
      setIsInitialLoading(false);
      return;
    }
    setIsInitialLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/catalog/products/${encodeURIComponent(activeSlug)}`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { item: BackendProduct };
        const view = normalizeBackendProduct(body.item);
        if (!cancelled) setSingleItem(view);
      } catch {
        if (!cancelled) setSingleItem(null);
      } finally {
        if (!cancelled) setIsInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSlug]);

  const activeVariantLabel = useMemo(() => {
    if (Object.keys(selectedOptionsState).length > 0) {
      return Object.values(selectedOptionsState).filter(Boolean).join(" · ");
    }
    return checkoutVariantLabel;
  }, [selectedOptionsState, checkoutVariantLabel]);

  // Determine line items for checkout (gift bundle, single item, or full cart)
  const lineItems = useMemo<CheckoutLineItem[]>(() => {
    if (isGiftMode && giftBundle && giftBundle.items.length > 0) {
      return giftBundle.items;
    }
    if (singleItem) {
      let unitPrice = singleItem.price;
      if (singleItem.customizationOptions) {
        for (const opt of singleItem.customizationOptions) {
          const chosen = selectedOptionsState[opt.label];
          if (chosen && opt.valuesWithPricing) {
            const match = opt.valuesWithPricing.find((vp) => vp.label === chosen);
            if (match && match.priceDelta) {
              unitPrice += match.priceDelta;
            }
          }
        }
      }

      return [
        {
          productSlug: singleItem.slug,
          title: singleItem.title,
          unitPrice,
          priceLabel: `₹${unitPrice.toLocaleString("en-IN")}`,
          quantity: 1,
          image: singleItem.image,
          shortDescription: singleItem.shortDescription,
          variantLabel: activeVariantLabel,
          selectedOptions: Object.keys(selectedOptionsState).length > 0 ? selectedOptionsState : null,
          weightGrams: singleItem.weightGrams,
          lengthCm: singleItem.lengthCm,
          breadthCm: singleItem.breadthCm,
          heightCm: singleItem.heightCm,
        },
      ];
    }
    if (cart.length > 0) {
      return cart;
    }
    return [];
  }, [isGiftMode, giftBundle, singleItem, activeVariantLabel, selectedOptionsState, cart]);

  const itemsSubtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [lineItems]
  );

  const totalWithShipping = useMemo(
    () => (shippingCost !== null ? itemsSubtotal + shippingCost : itemsSubtotal),
    [itemsSubtotal, shippingCost]
  );

  // Calculate combined shipping when address is complete
  useEffect(() => {
    if (
      lineItems.length === 0 ||
      !shippingPincode ||
      shippingPincode.length !== 6 ||
      !shippingCity.trim() ||
      !shippingState.trim()
    ) {
      setShippingCost(null);
      setEstimatedDeliveryDays(null);
      return;
    }

    setIsCalculatingShipping(true);
    let cancelled = false;

    (async () => {
      try {
        const totalWeightGrams = lineItems.reduce(
          (sum, item) => sum + (item.weightGrams ?? 300) * item.quantity,
          0
        );
        const maxLengthCm = Math.max(...lineItems.map((item) => item.lengthCm ?? 15), 15);
        const maxBreadthCm = Math.max(...lineItems.map((item) => item.breadthCm ?? 10), 10);
        const maxHeightCm = Math.max(...lineItems.map((item) => item.heightCm ?? 8), 8);

        const res = await fetch("/api/public/shipping/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pincode: shippingPincode,
            weightKg: Math.max(totalWeightGrams / 1000, 0.1),
            lengthCm: maxLengthCm,
            breadthCm: maxBreadthCm,
            heightCm: maxHeightCm,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          shippingCost: number;
          estimatedDeliveryDays: string;
        };

        if (!cancelled) {
          setShippingCost(data.shippingCost);
          setEstimatedDeliveryDays(data.estimatedDeliveryDays);
        }
      } catch {
        if (!cancelled) {
          setShippingCost(100);
          setEstimatedDeliveryDays("5-7");
        }
      } finally {
        if (!cancelled) setIsCalculatingShipping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lineItems, shippingPincode, shippingCity, shippingState]);

  if (isInitialLoading) {
    return (
      <main className="min-h-screen bg-[#f3efe7] pt-[72px] text-[#3a3a3a] sm:pt-[76px]">
        <div className="page-container max-w-[900px] rounded-[30px] border border-[#d8cec1] mt-24 sm:mt-28 bg-[#faf7f1] px-8 py-12 text-center">
          <p className="text-[14px] leading-[1.85] text-[#625b53]">Loading your order details…</p>
        </div>
      </main>
    );
  }

  if (lineItems.length === 0) {
    return (
      <main className="min-h-screen bg-[#f3efe7] pt-[72px] text-[#3a3a3a] sm:pt-[76px]">
        <section className="section-primary pt-24 sm:pt-28">
          <div className="page-container max-w-[900px] rounded-[30px] border border-[#d8cec1] bg-[#faf7f1] px-8 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ebdcd0]/70 text-[#9a785d]">
              <ShoppingBag size={28} strokeWidth={1.5} />
            </div>
            <h1 className="mt-5 font-serif text-[32px] leading-[1.12] tracking-[-0.02em] text-[#1f1a16]">
              No items are ready for checkout yet.
            </h1>
            <p className="mx-auto mt-3 max-w-[38ch] text-[15px] leading-[1.85] text-[#625b53]">
              Add objects to your shopping bag or choose Buy Now from any product card to arrive here ready to complete.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={canonicalShopRoutes.cart}
                className="inline-flex items-center justify-center rounded-full border border-[#2e4a36]/30 bg-white px-6 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[#2e4a36] hover:bg-[#2e4a36] hover:text-[#f4efe8]"
              >
                View Shopping Bag
              </Link>
              <Link
                href={canonicalShopRoutes.shopAll}
                className="inline-flex items-center justify-center rounded-full bg-[#2e4a36] px-7 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[#f4efe8] hover:bg-[#243c2c]"
              >
                Browse Shop All
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3efe7] pt-[72px] text-[#3a3a3a] sm:pt-[76px]">
      <section className="section-primary pt-20 sm:pt-24 pb-16">
        <div className="page-container grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Column: Order Items Overview */}
          <div className="space-y-6">
            <div className="rounded-[30px] border border-[#d8cec1] bg-[#faf7f1] p-8 sm:p-10">
              <div className="flex items-center justify-between">
                {isGiftMode ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2e4a36]/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] font-medium text-[#2e4a36]">
                    <Gift size={12} />
                    <span>Curated Gift Box Order</span>
                  </span>
                ) : (
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#9a785d]">Direct Checkout</p>
                )}
                <Link
                  href={isGiftMode ? "/build-gift" : canonicalShopRoutes.cart}
                  className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#7a6448] hover:underline"
                >
                  <ArrowLeft size={12} />
                  <span>{isGiftMode ? "Modify Gift Box" : "Modify Bag"}</span>
                </Link>
              </div>
              <h1 className="mt-4 max-w-[14ch] text-[clamp(34px,3.8vw,48px)] leading-[1.06] tracking-[-0.025em] text-[#1d1a17]">
                {isGiftMode ? "Complete your Seijaku Gift Box." : "Complete your Seijaku order."}
              </h1>
              <p className="mt-4 max-w-[46ch] text-[14px] leading-[1.8] text-[#5f584f]">
                {isGiftMode
                  ? `Reviewing your ${lineItems.length} curated objects. All items will be beautifully packaged together in our festive gift box with a complimentary handwritten card.`
                  : lineItems.length === 1
                    ? "Your selected object is held here ready for swift, secure completion."
                    : `Reviewing ${lineItems.length} items from your shopping bag.`}
              </p>

              {isGiftMode && (
                <div className="mt-6 rounded-[22px] border border-[#2e4a36]/20 bg-[#eef5f0] p-4 sm:p-5">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2e4a36] text-[#faf7f1]">
                      <Gift size={20} />
                    </div>
                    <div>
                      <p className="font-serif text-[16px] font-medium text-[#1d1a17]">
                        Festive Gift Packaging & Handwritten Card Included
                      </p>
                      <p className="mt-1 text-[12px] leading-[1.65] text-[#4b5849]">
                        Every product in this bundle will be nestled in a premium Seijaku gift box. You can include a custom message for your recipient in the gift card section on the right.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Line Items List */}
              <div className="mt-8 space-y-4">
                {lineItems.map((line) => (
                  <div
                    key={line.productSlug + (line.variantLabel || "")}
                    className="flex gap-4 rounded-[20px] bg-[#f2eadf] p-4 sm:p-5"
                  >
                    {line.image ? (
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-white/60">
                        <Image
                          src={line.image}
                          alt={line.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    ) : null}

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-serif text-[18px] leading-[1.2] text-[#1f1a16]">
                            {line.title}
                          </p>
                          {line.quantity > 1 && (
                            <span className="text-[12px] font-medium text-[#7a6448]">
                              Qty: {line.quantity}
                            </span>
                          )}
                        </div>
                        <p className="text-[15px] font-semibold text-[#2f2924]">
                          INR {(line.unitPrice * line.quantity).toLocaleString("en-IN")}
                        </p>
                      </div>

                      {line.categoryName && (
                        <span className="mt-1.5 inline-block rounded-full bg-[#2e4a36]/10 px-2.5 py-0.5 text-[10px] font-medium text-[#2e4a36]">
                          Gift Box · {line.categoryName}
                        </span>
                      )}

                      {line.variantLabel && (
                        <p className="mt-1 text-[12px] text-[#655b4f]">
                          Option: {line.variantLabel}
                        </p>
                      )}

                      {line.selectedOptions && Object.keys(line.selectedOptions).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(line.selectedOptions).map(([k, v]) => (
                            <span
                              key={k}
                              className="rounded bg-[#faf7f1] px-1.5 py-0.5 text-[10px] text-[#554a3e]"
                            >
                              {k}: {v}
                            </span>
                          ))}
                        </div>
                      )}

                      {singleItem?.slug === line.productSlug &&
                        singleItem?.customizationOptions &&
                        singleItem.customizationOptions.length > 0 && (
                          <div className="mt-4 border-t border-[#d8cec1]/60 pt-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8d7d6d]">
                                Select Options & Variants
                              </p>
                              <span className="text-[10px] text-[#9a785d] italic">
                                Required before checkout
                              </span>
                            </div>
                            <div className="space-y-3">
                              {singleItem.customizationOptions.map((opt) => (
                                <div key={opt.label}>
                                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                                    <span className="font-medium text-[#4b4238] uppercase tracking-[0.14em]">
                                      {opt.label}:
                                    </span>
                                    {selectedOptionsState[opt.label] ? (
                                      <span className="font-medium text-[#2e4a36]">
                                        {selectedOptionsState[opt.label]}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-[#9a785d] font-medium">
                                        Selection required
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {opt.values.map((val) => {
                                      const isSelected = selectedOptionsState[opt.label] === val;
                                      const pricingInfo = opt.valuesWithPricing?.find((vp) => vp.label === val);
                                      const delta = pricingInfo?.priceDelta ?? 0;
                                      return (
                                        <button
                                          key={val}
                                          type="button"
                                          onClick={() =>
                                            setSelectedOptionsState((prev) => ({
                                              ...prev,
                                              [opt.label]: val,
                                            }))
                                          }
                                          className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                                            isSelected
                                              ? "bg-[#2e4a36] text-[#faf7f1] shadow-sm ring-1 ring-[#2e4a36]/20"
                                              : "border border-[#d8cec1] bg-white text-[#4a4238] hover:border-[#2e4a36]"
                                          }`}
                                        >
                                          <span>{val}</span>
                                          {delta !== 0 && (
                                            <span className="ml-1 text-[10px] opacity-80">
                                              ({delta > 0 ? `+₹${delta}` : `-₹${Math.abs(delta)}`})
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assurance Box */}
            <div className="rounded-[24px] border border-[#d8cec1] bg-[#faf7f1] p-6 text-[13px] text-[#635b51]">
              <div className="flex items-center gap-2.5 font-medium text-[#1d1a17]">
                <ShieldCheck size={16} className="text-[#2e4a36]" />
                <span>Secure Checkout Assurance</span>
              </div>
              <p className="mt-2 text-[12px] leading-[1.7]">
                Every Seijaku formulation and handcrafted object is insured during transit and dispatched directly from our studio in Kolkata, India.
              </p>
            </div>
          </div>

          {/* Right Column: Address, Summary & Razorpay */}
          <div className="rounded-[30px] border border-[#d8cec1] bg-[#eae3d8] p-8 sm:p-10">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#8d7d6d]">Order Summary</p>
            <div className="mt-6 space-y-4 text-[14px] leading-[1.8] text-[#5d554b]">
              <div className="flex items-center justify-between gap-4">
                <span>Items Subtotal</span>
                <div className="text-right">
                  <div className="font-semibold text-[#1d1a17]">
                    INR {itemsSubtotal.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[12px] text-[#8d7d6d]">Included GST</div>
                </div>
              </div>

              {isGiftMode && (
                <div className="flex items-center justify-between gap-4 text-[13px]">
                  <span className="text-[#3b342e]">Festive Gift Box & Handwritten Card</span>
                  <span className="font-medium text-[#2e4a36]">Free (Complimentary)</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <span>Shipping Charges</span>
                <span>
                  {isCalculatingShipping ? (
                    <span className="text-[12px] text-[#8d7d6d]">Calculating...</span>
                  ) : shippingCost !== null ? (
                    <div className="text-right">
                      <div>INR {shippingCost.toLocaleString("en-IN")}</div>
                      <div className="text-[12px] text-[#8d7d6d]">Est. {estimatedDeliveryDays} days</div>
                    </div>
                  ) : (
                    <span className="text-[13px] text-[#8d7d6d]">Enter address to calculate</span>
                  )}
                </span>
              </div>

              <div className="h-px bg-black/8" />

              <div className="flex items-center justify-between gap-4 text-[17px] font-semibold text-[#1f1a16]">
                <span>Total Amount</span>
                <span>INR {totalWithShipping.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Customer & Address Form */}
            <div className="mt-8 space-y-4">
              <div className="grid gap-3.5">
                <div>
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      clearFieldError("name");
                    }}
                    onBlur={() => {
                      if (!name.trim()) {
                        setFieldErrors((prev) => ({ ...prev, name: "Please enter your full name." }));
                      } else if (name.trim().length < 2) {
                        setFieldErrors((prev) => ({ ...prev, name: "Full name must be at least 2 characters." }));
                      }
                    }}
                    className={`w-full rounded-[18px] border px-4 py-3 text-[14px] text-[#2f2924] outline-none transition-colors ${
                      fieldErrors.name
                        ? "border-[#c53929] bg-[#fff8f6] focus:border-[#c53929] focus:ring-2 focus:ring-[#c53929]/15"
                        : "border-[#cfc3b4] bg-[#faf7f1] focus:border-[#2e4a36] focus:ring-2 focus:ring-[#2e4a36]/15"
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="mt-1 px-1 text-[11px] font-medium text-[#c53929]">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      clearFieldError("email");
                    }}
                    onBlur={() => {
                      const trimmed = email.trim();
                      if (!trimmed) {
                        setFieldErrors((prev) => ({ ...prev, email: "Please enter your email address." }));
                      } else if (!isValidEmail(trimmed)) {
                        setFieldErrors((prev) => ({ ...prev, email: "Please enter a valid email address (e.g. name@example.com)." }));
                      }
                    }}
                    className={`w-full rounded-[18px] border px-4 py-3 text-[14px] text-[#2f2924] outline-none transition-colors ${
                      fieldErrors.email
                        ? "border-[#c53929] bg-[#fff8f6] focus:border-[#c53929] focus:ring-2 focus:ring-[#c53929]/15"
                        : "border-[#cfc3b4] bg-[#faf7f1] focus:border-[#2e4a36] focus:ring-2 focus:ring-[#2e4a36]/15"
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 px-1 text-[11px] font-medium text-[#c53929]">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <input
                    type="tel"
                    placeholder="Phone number (+91...)"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      clearFieldError("phone");
                    }}
                    onBlur={() => {
                      const trimmed = phone.trim();
                      const digits = trimmed.replace(/\D/g, "");
                      if (!trimmed) {
                        setFieldErrors((prev) => ({ ...prev, phone: "Please enter your phone number." }));
                      } else if (digits.length < 10) {
                        setFieldErrors((prev) => ({ ...prev, phone: "Please enter a valid 10-digit phone number." }));
                      }
                    }}
                    className={`w-full rounded-[18px] border px-4 py-3 text-[14px] text-[#2f2924] outline-none transition-colors ${
                      fieldErrors.phone
                        ? "border-[#c53929] bg-[#fff8f6] focus:border-[#c53929] focus:ring-2 focus:ring-[#c53929]/15"
                        : "border-[#cfc3b4] bg-[#faf7f1] focus:border-[#2e4a36] focus:ring-2 focus:ring-[#2e4a36]/15"
                    }`}
                  />
                  {fieldErrors.phone && (
                    <p className="mt-1 px-1 text-[11px] font-medium text-[#c53929]">
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>

                <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-[#8d7d6d]">Shipping Address</p>

                <div>
                  <input
                    type="text"
                    placeholder="Address line 1 (Flat, House, Street)"
                    value={shippingLine1}
                    onChange={(event) => {
                      setShippingLine1(event.target.value);
                      clearFieldError("shippingLine1");
                    }}
                    onBlur={() => {
                      if (!shippingLine1.trim()) {
                        setFieldErrors((prev) => ({ ...prev, shippingLine1: "Please enter your delivery address." }));
                      }
                    }}
                    className={`w-full rounded-[18px] border px-4 py-3 text-[14px] text-[#2f2924] outline-none transition-colors ${
                      fieldErrors.shippingLine1
                        ? "border-[#c53929] bg-[#fff8f6] focus:border-[#c53929] focus:ring-2 focus:ring-[#c53929]/15"
                        : "border-[#cfc3b4] bg-[#faf7f1] focus:border-[#2e4a36] focus:ring-2 focus:ring-[#2e4a36]/15"
                    }`}
                  />
                  {fieldErrors.shippingLine1 && (
                    <p className="mt-1 px-1 text-[11px] font-medium text-[#c53929]">
                      {fieldErrors.shippingLine1}
                    </p>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Address line 2 (Landmark, Area - optional)"
                    value={shippingLine2}
                    onChange={(event) => setShippingLine2(event.target.value)}
                    className="w-full rounded-[18px] border border-[#cfc3b4] bg-[#faf7f1] px-4 py-3 text-[14px] text-[#2f2924] outline-none focus:border-[#2e4a36] focus:ring-2 focus:ring-[#2e4a36]/15"
                  />
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div>
                    <input
                      type="text"
                      placeholder="City"
                      value={shippingCity}
                      onChange={(event) => {
                        setShippingCity(event.target.value);
                        clearFieldError("shippingCity");
                      }}
                      onBlur={() => {
                        if (!shippingCity.trim()) {
                          setFieldErrors((prev) => ({ ...prev, shippingCity: "Please enter your city." }));
                        }
                      }}
                      className={`w-full rounded-[18px] border px-4 py-3 text-[14px] text-[#2f2924] outline-none transition-colors ${
                        fieldErrors.shippingCity
                          ? "border-[#c53929] bg-[#fff8f6] focus:border-[#c53929] focus:ring-2 focus:ring-[#c53929]/15"
                          : "border-[#cfc3b4] bg-[#faf7f1] focus:border-[#2e4a36] focus:ring-2 focus:ring-[#2e4a36]/15"
                      }`}
                    />
                    {fieldErrors.shippingCity && (
                      <p className="mt-1 px-1 text-[11px] font-medium text-[#c53929]">
                        {fieldErrors.shippingCity}
                      </p>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="State"
                      value={shippingState}
                      onChange={(event) => {
                        setShippingState(event.target.value);
                        clearFieldError("shippingState");
                      }}
                      onBlur={() => {
                        if (!shippingState.trim()) {
                          setFieldErrors((prev) => ({ ...prev, shippingState: "Please enter your state." }));
                        }
                      }}
                      className={`w-full rounded-[18px] border px-4 py-3 text-[14px] text-[#2f2924] outline-none transition-colors ${
                        fieldErrors.shippingState
                          ? "border-[#c53929] bg-[#fff8f6] focus:border-[#c53929] focus:ring-2 focus:ring-[#c53929]/15"
                          : "border-[#cfc3b4] bg-[#faf7f1] focus:border-[#2e4a36] focus:ring-2 focus:ring-[#2e4a36]/15"
                      }`}
                    />
                    {fieldErrors.shippingState && (
                      <p className="mt-1 px-1 text-[11px] font-medium text-[#c53929]">
                        {fieldErrors.shippingState}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Pincode (6 digits)"
                      value={shippingPincode}
                      onChange={(event) => {
                        setShippingPincode(event.target.value.replace(/[^0-9]/g, ""));
                        clearFieldError("shippingPincode");
                      }}
                      onBlur={() => {
                        const trimmed = shippingPincode.trim();
                        if (!trimmed) {
                          setFieldErrors((prev) => ({ ...prev, shippingPincode: "Please enter your 6-digit pincode." }));
                        } else if (!/^[0-9]{6}$/.test(trimmed)) {
                          setFieldErrors((prev) => ({ ...prev, shippingPincode: "Pincode must be exactly 6 digits." }));
                        }
                      }}
                      className={`w-full rounded-[18px] border px-4 py-3 text-[14px] text-[#2f2924] outline-none transition-colors ${
                        fieldErrors.shippingPincode
                          ? "border-[#c53929] bg-[#fff8f6] focus:border-[#c53929] focus:ring-2 focus:ring-[#c53929]/15"
                          : "border-[#cfc3b4] bg-[#faf7f1] focus:border-[#2e4a36] focus:ring-2 focus:ring-[#2e4a36]/15"
                      }`}
                    />
                    {fieldErrors.shippingPincode && (
                      <p className="mt-1 px-1 text-[11px] font-medium text-[#c53929]">
                        {fieldErrors.shippingPincode}
                      </p>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      value="India"
                      readOnly
                      aria-readonly
                      className="w-full rounded-[18px] border border-[#cfc3b4] bg-[#ece5d9] px-4 py-3 text-[14px] text-[#736a5f] outline-none"
                    />
                  </div>
                </div>
                {isGiftMode && (
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8d7d6d]">
                      <Gift size={12} className="text-[#2e4a36]" />
                      <span>Handwritten Card Message (Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Message to be handwritten on the gift card for your recipient..."
                      value={giftNote}
                      onChange={(event) => setGiftNote(event.target.value)}
                      className="w-full rounded-[18px] border border-[#cfc3b4] bg-[#faf7f1] px-4 py-3 text-[13px] leading-[1.7] text-[#2f2924] outline-none focus:border-[#2e4a36] focus:ring-2 focus:ring-[#2e4a36]/15"
                    />
                  </div>
                )}
                <textarea
                  rows={3}
                  placeholder="Notes or special delivery instructions (optional)..."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="w-full rounded-[18px] border border-[#cfc3b4] bg-[#faf7f1] px-4 py-3 text-[14px] leading-[1.8] text-[#2f2924] outline-none focus:border-[#2e4a36] focus:ring-2 focus:ring-[#2e4a36]/15"
                />
              </div>

              {notice ? <p className="rounded-[18px] border border-[#cde0d2] bg-[#eef8f0] px-4 py-3 text-[13px] text-[#2c6541]">{notice}</p> : null}
              {error ? <p className="rounded-[18px] border border-[#e7c1ba] bg-[#fff1ee] px-4 py-3 text-[13px] text-[#9f4332]">{error}</p> : null}

              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    setNotice(null);
                    setError(null);

                    const validationErrors = validateForm();
                    const errorKeys = Object.keys(validationErrors) as FormField[];
                    if (errorKeys.length > 0) {
                      setFieldErrors(validationErrors);
                      const firstError = validationErrors[errorKeys[0]];
                      setError(firstError || "Please check the highlighted details.");
                      return;
                    }

                    if (singleItem?.customizationOptions && singleItem.customizationOptions.length > 0) {
                      const unselectedOption = singleItem.customizationOptions.find(
                        (opt) => !selectedOptionsState[opt.label]
                      );
                      if (unselectedOption) {
                        setError(`Please select an option for "${unselectedOption.label}" above before proceeding.`);
                        return;
                      }
                    }

                    const formattedNotes = isGiftMode
                      ? [
                          `[Seijaku Curated Gift Box - ${lineItems.length} Products in Festive Packaging]`,
                          giftNote.trim() ? `Recipient Gift Message: "${giftNote.trim()}"` : `Recipient Gift Message: None requested`,
                          notes.trim() ? `Delivery Instructions: ${notes.trim()}` : "",
                        ]
                          .filter(Boolean)
                          .join("\n")
                      : notes.trim() || undefined;

                    const orderItemsPayload = lineItems.map((item) => {
                      const selectedOptions = isGiftMode
                        ? {
                            ...(item.selectedOptions ?? {}),
                            "Gift Packaging": "Festive Gift Box",
                            ...(item.categoryName ? { "Gift Category": item.categoryName } : {}),
                          }
                        : item.selectedOptions ?? undefined;

                      const variantSummary = isGiftMode
                        ? item.variantLabel || (item.categoryName ? `[Gift Box · ${item.categoryName}]` : "[Gift Box Item]")
                        : item.variantLabel ?? undefined;

                      return {
                        productSlug: item.productSlug,
                        quantity: item.quantity,
                        selectedOptions,
                        variantSummary,
                      };
                    });

                    // 1. Create the Razorpay order on our backend.
                    let orderRes: Response;
                    try {
                      orderRes = await fetch("/api/public/payments/orders", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name,
                          email,
                          phone,
                          notes: formattedNotes,
                          source: isGiftMode ? "frontend-gift-checkout" : "frontend-checkout",
                          shippingLine1,
                          shippingLine2: shippingLine2 || undefined,
                          shippingCity,
                          shippingState,
                          shippingPincode,
                          shippingCountry: "IN",
                          items: orderItemsPayload,
                        }),
                      });
                    } catch {
                      setError("Couldn't reach our servers. Check your connection and try again.");
                      return;
                    }

                    if (!orderRes.ok) {
                      const data = (await orderRes.json().catch(() => null)) as {
                        error?: string;
                        issues?: {
                          fieldErrors?: Record<string, string[]>;
                        };
                      } | null;

                      if (data?.issues?.fieldErrors) {
                        const backendFieldErrors: Partial<Record<FormField, string>> = {};
                        for (const [key, msgs] of Object.entries(data.issues.fieldErrors)) {
                          if (msgs && msgs.length > 0) {
                            if (key === "email") backendFieldErrors.email = "Please enter a valid email address.";
                            else if (key === "name") backendFieldErrors.name = "Please enter your full name.";
                            else if (key === "phone") backendFieldErrors.phone = "Please enter a valid phone number.";
                            else if (key === "shippingLine1") backendFieldErrors.shippingLine1 = "Please enter your delivery address.";
                            else if (key === "shippingCity") backendFieldErrors.shippingCity = "Please enter your city.";
                            else if (key === "shippingState") backendFieldErrors.shippingState = "Please enter your state.";
                            else if (key === "shippingPincode") backendFieldErrors.shippingPincode = msgs[0] || "Pincode must be exactly 6 digits.";
                          }
                        }
                        if (Object.keys(backendFieldErrors).length > 0) {
                          setFieldErrors((prev) => ({ ...prev, ...backendFieldErrors }));
                          const firstMsg = Object.values(backendFieldErrors)[0] || "Please check the highlighted details.";
                          setError(firstMsg);
                          return;
                        }
                      }

                      if (data?.error === "Validation failed") {
                        setError("Please verify all details and enter a valid email address and phone number.");
                      } else {
                        setError(data?.error ?? "Unable to start payment. Please try again.");
                      }
                      return;
                    }
                    const order = (await orderRes.json()) as CreateOrderResponse;

                    // 2. Load Razorpay Checkout SDK.
                    let Razorpay;
                    try {
                      Razorpay = await loadRazorpayCheckout();
                    } catch {
                      setError("Payment provider didn't load. Refresh and try again.");
                      return;
                    }

                    // 3. Open Razorpay Checkout.
                    const rzp = new Razorpay({
                      key: order.keyId,
                      order_id: order.razorpayOrderId,
                      amount: order.amount,
                      currency: order.currency,
                      name: "Seijaku",
                      description: isGiftMode
                        ? `Seijaku Gift Box (${lineItems.length} products in festive packaging)`
                        : lineItems.length === 1
                          ? lineItems[0].title
                          : `Seijaku Order (${lineItems.length} items)`,
                      prefill: { name, email, contact: phone },
                      theme: { color: "#2e4a36" },
                      handler: async (response: RazorpayPaymentResponse) => {
                        try {
                          const verifyRes = await fetch("/api/public/payments/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(response),
                          });
                          if (verifyRes.ok) {
                            if (isGiftMode) {
                              clearGiftCheckoutBundle();
                              clearStoredGiftItems();
                            }
                            clearCheckout();
                            clearCart();
                            setName("");
                            setEmail("");
                            setPhone("");
                            setNotes("");
                            setGiftNote("");
                            setShippingLine1("");
                            setShippingLine2("");
                            setShippingCity("");
                            setShippingState("");
                            setShippingPincode("");
                            setFieldErrors({});
                            router.push(`/checkout/order-confirmed?order=${order.orderId}${isGiftMode ? "&gift=true" : ""}`);
                          } else {
                            setError(
                              "Payment was received but verification failed. If you were charged, our team will reconcile via webhook within minutes — you'll receive an email.",
                            );
                          }
                        } catch {
                          setError(
                            "Payment was received but verification couldn't reach our servers. The webhook will reconcile shortly.",
                          );
                        }
                      },
                      modal: {
                        ondismiss: () => undefined,
                      },
                    });
                    rzp.open();
                  });
                }}
                className="inline-flex w-full items-center justify-center rounded-full bg-[#2e4a36] px-7 py-4 text-[12px] font-medium uppercase tracking-[0.18em] text-[#f4efe8] hover:bg-[#243c2c] disabled:cursor-not-allowed disabled:bg-[#a8a095]"
              >
                {isPending ? "Opening Payment" : `Pay Now • INR ${totalWithShipping.toLocaleString("en-IN")}`}
              </button>
              <p className="text-[12px] leading-[1.8] text-[#6c6257]">
                Secure checkout via Razorpay. You'll be charged once payment is confirmed.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
