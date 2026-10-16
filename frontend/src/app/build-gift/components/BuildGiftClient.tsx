"use client";
import type { ProductView } from "@/src/lib/product-types";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import ProductDrawer from "./ProductDrawer";
import { useShopState } from "@/src/components/shop/ShopStateProvider";
import {
    DEFAULT_MAX_GIFT_PRODUCTS,
    DEFAULT_MIN_GIFT_PRODUCTS,
    clearStoredGiftItems,
    generateInstanceId,
    getGiftCheckoutBundle,
    getStoredGiftItems,
    setStoredGiftItems,
    setGiftCheckoutBundle,
    type GiftCheckoutBundle,
    type GiftCheckoutItem,
    type GiftItemSelection,
    type GiftStepKey,
    type ProductSelectionPayload,
} from "../utils";
const GIFT_STORAGE_KEY = "seijaku-bag";
const PACKAGING_BOX_IMAGE = "/images/packging box.png";
const REVIEW_LABEL = "Review";
type StepConfig = {
    key: GiftStepKey;
    label: string;
    shortLabel: string;
    routeSlug: string;
    title: [string, string];
    description: string;
    tagline: string[];
};
type ResolvedGiftItem = GiftItemSelection & {
    product: ProductView | null;
    stepConfig: StepConfig;
};
const STEPS: StepConfig[] = [
    {
        key: "scarves-and-squares",
        label: "Scarves & Squares",
        shortLabel: "Textiles",
        routeSlug: "scarves-and-squares",
        title: ["Choose", "Your Scarf & Square"],
        description:
            "Modal silk scarves and pocket squares crafted with quiet colour stories, soft drape, and hand-rolled finishes.",
        tagline: ["Cloth.", "Colour. A", "quieter gesture."],
    },
    {
        key: "perfumes",
        label: "Perfumes",
        shortLabel: "Perfumes",
        routeSlug: "perfumes",
        title: ["Choose", "Your Scent"],
        description:
            "Natural perfumes and botanical fragrance oils composed for skin, cloth, and quiet contemplation.",
        tagline: ["Scent.", "Memory.", "A slower you."],
    },
    {
        key: "dokra-ornaments",
        label: "Dokra Ornaments",
        shortLabel: "Dokra",
        routeSlug: "dokra-ornaments",
        title: ["Choose", "Your Dokra"],
        description:
            "Handcrafted lost-wax brass brooches from West Bengal — tactile ritual anchors for everyday stillness.",
        tagline: ["Small object.", "Bigger stories."],
    },
    {
        key: "diffusers",
        label: "Diffusers",
        shortLabel: "Diffusers",
        routeSlug: "diffusers",
        title: ["Choose", "Your Diffuser"],
        description:
            "Stone, reed, and brass diffusers with botanical fragrance refills to gently shape your room atmosphere.",
        tagline: ["Vessel.", "Diffusion.", "Still air."],
    },
];
const REVIEW_FEATURES = [
    { icon: "/images/Leaf Icon.png", label: "Artisanal & Ethical" },
    { icon: "/images/Gift Box Icon.png", label: "Festive Gift Packaging" },
    { icon: "/images/India Icon.png", label: "Made in India" },
    { icon: "/images/Heart.png", label: "Gifts with Meaning" },
] as const;
function formatPrice(amount: number) {
    return `₹${amount.toLocaleString("en-IN")}`;
}
function isProductForStep(product: ProductView, stepKey: GiftStepKey): boolean {
    if (product.bridgeCategory === stepKey) {
        return true;
    }
    const typeStr = (product.type || "").toLowerCase();
    const materialStr = (product.material || "").toLowerCase();
    const slugStr = (product.slug || "").toLowerCase();
    const titleStr = (product.title || "").toLowerCase();
    const descStr = (product.shortDescription || "").toLowerCase();
    const allText = `${typeStr} ${materialStr} ${slugStr} ${titleStr} ${descStr}`;
    switch (stepKey) {
        case "scarves-and-squares":
            return (
                typeStr.includes("scarf") ||
                typeStr.includes("square") ||
                slugStr.includes("scarf") ||
                slugStr.includes("square") ||
                slugStr.includes("modal-silk") ||
                materialStr.includes("textile")
            );
        case "perfumes":
            if (
                slugStr.includes("diffuser") ||
                typeStr.includes("diffuser") ||
                typeStr.includes("wax melt")
            ) {
                return false;
            }
            return (
                typeStr.includes("perfume") ||
                typeStr.includes("fragrance") ||
                slugStr.includes("perfume") ||
                slugStr.includes("trilogy") ||
                slugStr.includes("textile-oil") ||
                slugStr.includes("breath-of-pines") ||
                slugStr.includes("summer-held-close") ||
                slugStr.includes("morning-desk") ||
                materialStr.includes("botanical fragrance")
            );
        case "dokra-ornaments":
            return (
                typeStr.includes("dokra") ||
                typeStr.includes("ornament") ||
                materialStr.includes("dokra") ||
                slugStr.includes("dokra") ||
                slugStr.includes("brooch") ||
                slugStr.includes("handfan") ||
                slugStr.includes("bell-brooch") ||
                slugStr.includes("conch-brooch") ||
                allText.includes("dokra")
            );
        case "diffusers":
            return (
                typeStr.includes("diffuser") ||
                typeStr.includes("wax melt") ||
                slugStr.includes("diffuser") ||
                slugStr.includes("wax-melt") ||
                slugStr.includes("vessel") ||
                slugStr.includes("room-stone") ||
                slugStr.includes("stone-oil")
            );
    }
}
function productsForStep(products: ProductView[], step: GiftStepKey): ProductView[] {
    const matches = products.filter((product) => isProductForStep(product, step));
    return matches.length > 0 ? matches : products;
}
function Stepper({
    current,
    countsByStep,
    canAccessReview,
    onGo,
}: {
    current: number;
    countsByStep: Record<GiftStepKey, number>;
    canAccessReview: boolean;
    onGo: (index: number) => void;
}) {
    const stepsWithReview = [
        ...STEPS.map((step, idx) => ({
            label: step.shortLabel,
            fullLabel: step.label,
            isReview: false,
            count: countsByStep[step.key] ?? 0,
            index: idx,
        })),
        {
            label: REVIEW_LABEL,
            fullLabel: REVIEW_LABEL,
            isReview: true,
            count: 0,
            index: STEPS.length,
        },
    ];
    return (
        <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 sm:gap-x-3">
            {stepsWithReview.map((item, index) => {
                const active = index === current;
                const hasSelections = !item.isReview && item.count > 0;
                const isClickable = !item.isReview || canAccessReview || current === STEPS.length;
                const content = (
                    <span className="flex items-center gap-1.5">
                        <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full font-sans text-[10px] font-medium transition-all duration-300 ${
                                active
                                    ? "bg-[#2B3B2F] text-[#F6EEE4] ring-4 ring-[#2B3B2F]/15"
                                    : hasSelections
                                        ? "bg-[#4A6350] text-[#F6EEE4]"
                                        : "bg-[#E8DDCD] text-[#8C7A6E]"
                            }`}
                        >
                            {hasSelections ? `${item.count}` : index + 1}
                        </span>
                        <span
                            className={`hidden font-sans text-[10px] tracking-wide sm:inline ${
                                active
                                    ? "font-medium text-[#2A1D1B]"
                                    : isClickable
                                        ? "text-[#54433D]"
                                        : "text-[#8C7A6E]/70"
                            }`}
                        >
                            {item.label}
                            {hasSelections && ` (${item.count})`}
                        </span>
                    </span>
                );
                return (
                    <Fragment key={item.label}>
                        {index > 0 && (
                            <span
                                aria-hidden
                                className={`h-px w-2.5 sm:w-4 ${
                                    index <= current
                                        ? "bg-[#4A6350]"
                                        : "bg-[#D8C8B7]"
                                }`}
                            />
                        )}
                        <li>
                            {isClickable ? (
                                <button
                                    type="button"
                                    onClick={() => onGo(index)}
                                    className={`transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A6350] rounded-full ${
                                        active ? "cursor-default" : "cursor-pointer"
                                    }`}
                                    aria-label={`Go to ${item.fullLabel}`}
                                >
                                    {content}
                                </button>
                            ) : (
                                <span className="opacity-55 cursor-not-allowed">
                                    {content}
                                </span>
                            )}
                        </li>
                    </Fragment>
                );
            })}
        </ol>
    );
}
function GiftHeader({
    isReview,
    stepIndex,
    step,
    selectedCount,
    minProducts,
    maxProducts,
}: {
    isReview: boolean;
    stepIndex: number;
    step: StepConfig;
    selectedCount: number;
    minProducts: number;
    maxProducts: number;
}) {
    return (
        <header className={isReview
            ? "mx-auto mt-8 max-w-3xl text-center sm:mt-12"
            : "min-w-0 text-left xl:border-r xl:border-[#E7DDD1] xl:pr-5 2xl:pr-7"}
        >
            <p className="font-sans text-[11px] font-medium tracking-[0.06em] text-[#917A67]">
                {isReview
                    ? `Review & Checkout · ${selectedCount} of max ${maxProducts} Items Chosen`
                    : `Section ${stepIndex + 1} of ${STEPS.length} · ${selectedCount}/${maxProducts} items chosen (min. ${minProducts})`}
            </p>
            <h1 className={isReview
                ? "mt-4 text-[34px] font-normal leading-[1.05] sm:text-[46px] lg:text-[56px]"
                : "mt-3 max-w-[14ch] text-[34px] font-normal leading-[1.05] text-[#51392F] sm:text-[42px] xl:text-[36px] 2xl:text-[46px]"}
            >
                {isReview ? (
                    <>
                        Your Seijaku{" "}
                        <span className="italic text-[#4A6350]">Gift Box</span>
                    </>
                ) : (
                    <>
                        {step.title[0]}{" "}
                        <span className="italic text-[#4A6350]">{step.title[1]}</span>
                    </>
                )}
            </h1>
            <p className={isReview
                ? "mx-auto mt-5 max-w-xl text-[15px] leading-[1.65] text-[#3A2B28] sm:text-[16px]"
                : "mt-5 max-w-[35ch] text-[14px] leading-[1.6] text-[#594A42]"}
            >
                {isReview
                    ? "Carefully composed objects in festive packaging. Update or remove any item before checkout."
                    : step.description}
            </p>
            {!isReview && (
                <div className="mt-7 flex items-center gap-3 xl:mt-10 xl:block">
                    <svg aria-hidden="true" className="h-12 w-12 shrink-0 text-[#AA9179] xl:h-16 xl:w-16" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
                        <path d="M31 59V15M31 45C18 44 13 33 13 25c11 1 18 8 18 20ZM31 35c12-1 20-9 20-19-11 1-20 9-20 19ZM31 24C22 22 20 16 20 10c7 1 11 6 11 14ZM31 52c8-2 15-7 18-15-10 1-16 5-18 15Z" />
                        <path d="M24 56c-6-3-12-9-13-16M37 57c7-4 12-11 14-16" />
                    </svg>
                    <p className="max-w-[22ch] font-sans text-[10px] font-medium uppercase leading-[1.75] tracking-[0.17em] text-[#897768] xl:mt-5">
                        {step.tagline.join("  ·  ")}
                    </p>
                </div>
            )}
            {isReview && <div className="mx-auto mt-8 h-px w-16 bg-[#C9B9A6]" />}
        </header>
    );
}
function GiftSidebar({
    items,
    currentStepIndex,
    selectedCount,
    minProducts,
    maxProducts,
    total,
    onContinue,
    onGoToStep,
    onRemoveItem,
    onProceedToReview,
}: {
    items: ResolvedGiftItem[];
    currentStepIndex: number;
    selectedCount: number;
    minProducts: number;
    maxProducts: number;
    total: number;
    onContinue: () => void;
    onGoToStep: (index: number) => void;
    onRemoveItem: (instanceId: string) => void;
    onProceedToReview: () => void;
}) {
    const currentStepConfig = STEPS[currentStepIndex];
    const canReview = selectedCount >= minProducts;
    const isFull = selectedCount >= maxProducts;
    return (
        <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
            <div className="overflow-hidden rounded-sm border border-[#E9DED1] bg-[#FBF8F2] shadow-sm">
                <div className="flex items-center justify-between border-b border-[#E8DCCE] bg-[#F0E9DF] px-4 py-3">
                    <h3 className="text-[18px] font-normal">Your Gift Box</h3>
                    <span
                        className={`font-sans text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            canReview
                                ? "bg-[#4A6350]/15 text-[#2B3B2F]"
                                : "bg-[#8A483B]/10 text-[#8A483B]"
                        }`}
                    >
                        {selectedCount}/{maxProducts} items {isFull ? "(Full)" : `(min. ${minProducts})`}
                    </span>
                </div>
                <div className="space-y-3 px-4 py-4">
                    {items.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-[#E3D4C4] p-4 text-center font-sans text-[12px] text-[#7A6A5E]">
                            <p className="font-medium text-[#4C413A]">Box is empty</p>
                            <p className="mt-1 text-[11px]">
                                Add {minProducts} to {maxProducts} products from any section.
                            </p>
                        </div>
                    ) : (
                        items.map((item) => {
                            if (!item.product) return null;
                            const sectionIndex = STEPS.findIndex(
                                (s) => s.key === item.stepKey,
                            );
                            return (
                                <div
                                    key={item.instanceId}
                                    className="group flex items-start gap-3 border-b border-[#EBE1D6] p-2 last:border-b-0 transition-colors hover:bg-[#F2E8DC]/60"
                                >
                                    <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-[#EFE5D8]">
                                        <img
                                            src={item.product.image ?? ""}
                                            alt={item.product.imageAlt ?? item.product.title}
                                            className="absolute inset-0 h-full w-full object-cover"
                                        />
                                    </span>
                                    <div className="min-w-0 flex-1 font-sans">
                                        <p className="truncate text-[12px] font-medium text-[#2A1D1B]">
                                            {item.product.title}
                                        </p>
                                        <p className="truncate text-[10px] text-[#8C7A6E]">
                                            {item.stepConfig.label}
                                            {item.options?.label ? ` · ${item.options.label}` : ""}
                                        </p>
                                        <div className="mt-1 flex items-center gap-2 text-[10px]">
                                            {sectionIndex >= 0 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => onGoToStep(sectionIndex)}
                                                        className="text-[#4A6350] underline hover:text-[#2B3B2F]"
                                                    >
                                                        View Section
                                                    </button>
                                                    <span className="text-[#C9B9A6]">·</span>
                                                </>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => onRemoveItem(item.instanceId)}
                                                className="text-[#8A483B] underline hover:text-[#64291F]"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                    <span className="ml-auto shrink-0 font-sans text-[12px] font-medium text-[#2A1D1B]">
                                        {formatPrice(item.product.price)}
                                    </span>
                                </div>
                            );
                        })
                    )}
                    {!isFull && selectedCount > 0 && (
                        <p className="border-t border-[#E3D4C4]/50 pt-2 text-center font-sans text-[11px] text-[#7A6A5E]">
                            You can add {maxProducts - selectedCount} more product{maxProducts - selectedCount > 1 ? "s" : ""} from any section.
                        </p>
                    )}
                    <dl className="space-y-2 border-t border-[#E3D4C4] pt-3 font-sans text-[12px]">
                        <div className="flex justify-between text-[11px] text-[#6B564E]">
                            <dt>Festive Gift Box & Handwritten Card</dt>
                            <dd className="font-medium text-[#2B3B2F]">Free</dd>
                        </div>
                    </dl>
                </div>
                <div className="border-t border-[#E3D4C4] bg-[#F7EFE5]/50 px-4 py-4">
                    <div className="flex items-center justify-between font-sans text-[13px]">
                        <span>Subtotal</span>
                        <span className="text-[16px] font-medium text-[#2A1D1B]">
                            {formatPrice(total)}
                        </span>
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                        {canReview && (
                            <button
                                type="button"
                                onClick={onProceedToReview}
                                className="flex h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#2B3B2F] font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-[#F6EEE4] transition-all hover:bg-[#1E2B22] shadow-sm"
                            >
                                <span>Review Gift Box ({selectedCount} items)</span>
                                <span aria-hidden>→</span>
                            </button>
                        )}
                        {currentStepIndex < STEPS.length - 1 && (
                            <button
                                type="button"
                                onClick={onContinue}
                                className={`flex h-[42px] w-full items-center justify-center gap-2 rounded-lg font-sans text-[11px] font-medium uppercase tracking-[0.16em] transition-all ${
                                    canReview
                                        ? "border border-[#4A6350] bg-transparent text-[#2B3B2F] hover:bg-[#4A6350]/10"
                                        : "bg-[#4A6350] text-[#F6EEE4] hover:bg-[#3E5544]"
                                }`}
                            >
                                <span>Next: {STEPS[currentStepIndex + 1].shortLabel} →</span>
                            </button>
                        )}
                        {!canReview && (
                            <p className="text-center font-sans text-[10px] text-[#8A483B]">
                                Add {minProducts - selectedCount} more item{minProducts - selectedCount > 1 ? "s" : ""} to proceed to review
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}
function GiftReview({
    items,
    total,
    selectedCount,
    minProducts,
    maxProducts,
    added,
    isSubmitting,
    onAddToBag,
    onCheckout,
    onRemoveItem,
    onGoToStep,
}: {
    items: ResolvedGiftItem[];
    total: number;
    selectedCount: number;
    minProducts: number;
    maxProducts: number;
    added: boolean;
    isSubmitting: boolean;
    onAddToBag: () => void;
    onCheckout: () => void;
    onRemoveItem: (instanceId: string) => void;
    onGoToStep: (index: number) => void;
}) {
    const validItems = items.filter(
        (item): item is ResolvedGiftItem & { product: ProductView } => item.product !== null,
    );
    const canCheckout = selectedCount >= minProducts && selectedCount <= maxProducts;
    const canAddMore = selectedCount < maxProducts;
    const comboItems = [
        ...validItems.map((item) => ({
            instanceId: item.instanceId,
            image: item.product.image ?? "",
            name: item.product.title,
            sub: item.options?.label || item.stepConfig.label,
            stepIndex: STEPS.findIndex((s) => s.key === item.stepKey),
        })),
        {
            instanceId: "packaging",
            image: PACKAGING_BOX_IMAGE,
            name: "Festive Packaging",
            sub: "Seijaku gift box with a handwritten card",
            stepIndex: -1,
        },
    ];
    return (
        <div className="mx-auto mt-8 grid max-w-[1400px] grid-cols-1 gap-8 sm:mt-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
            <section className="min-w-0">
                {/* Visual Combo Presentation */}
                <div className="rounded-2xl border border-[#E3D4C4] bg-[#FAF4EC] p-5 sm:p-8 shadow-sm">
                    <div className="flex flex-wrap items-start justify-center gap-4 sm:flex-nowrap sm:gap-2">
                        {comboItems.map((item, index) => (
                            <Fragment key={item.instanceId}>
                                {index > 0 && (
                                    <span
                                        aria-hidden
                                        className="hidden shrink-0 self-center text-[22px] text-[#B8A898] sm:block"
                                    >
                                        \+
                                    </span>
                                )}
                                <div className="group relative w-full min-w-0 flex-1 basis-[calc(50%-0.5rem)] text-center sm:basis-0">
                                    <span className="relative mx-auto block aspect-square w-full overflow-hidden rounded-lg bg-[#EFE5D8]">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="absolute inset-0 h-full w-full object-cover"
                                        />
                                    </span>
                                    <p className="mt-3 text-[14px] leading-[1.25] text-[#2A1D1B]">
                                        {item.name}
                                    </p>
                                    <p className="mt-1 line-clamp-1 text-[11px] leading-[1.3] text-[#6B564E]">
                                        {item.sub}
                                    </p>
                                    {item.stepIndex >= 0 && (
                                        <div className="mt-2 flex items-center justify-center gap-2 font-sans text-[10px]">
                                            <button
                                                type="button"
                                                onClick={() => onRemoveItem(item.instanceId)}
                                                className="inline-flex items-center gap-1 text-[#8A483B] hover:underline"
                                            >
                                                <Trash2 size={11} />
                                                <span>Remove</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </Fragment>
                        ))}
                    </div>
                </div>
                {/* Add more items if under max limit */}
                {canAddMore && (
                    <div className="mt-6 rounded-2xl border border-dashed border-[#D4C3B2] bg-[#F7EEE3]/70 p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h4 className="font-serif text-[18px] text-[#2A1D1B]">
                                    Want to add more to your gift box?
                                </h4>
                                <p className="font-sans text-[13px] text-[#6B564E]">
                                    Currently {selectedCount} of {maxProducts} items selected. You can select multiple items from any category.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {STEPS.map((step, idx) => (
                                    <button
                                        key={step.key}
                                        type="button"
                                        onClick={() => onGoToStep(idx)}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-[#4A6350] bg-[#FAF4EC] px-3.5 py-1.5 font-sans text-[11px] font-medium text-[#2B3B2F] hover:bg-[#4A6350] hover:text-[#F6EEE4] transition-colors"
                                    >
                                        <Plus size={12} />
                                        <span>Add from {step.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {/* Brand features */}
                <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {REVIEW_FEATURES.map((feature) => (
                        <li
                            key={feature.label}
                            className="flex flex-col items-center gap-2 text-center"
                        >
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F0E6D6]">
                                <img
                                    src={feature.icon}
                                    alt=""
                                    className="h-5 w-5 object-contain"
                                />
                            </span>
                            <span className="text-[12px] leading-[1.3] text-[#3A2B28]">
                                {feature.label}
                            </span>
                        </li>
                    ))}
                </ul>
            </section>
            {/* Order Summary & Actions */}
            <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
                <div className="overflow-hidden rounded-2xl border border-[#E3D4C4] bg-[#FAF4EC] shadow-sm">
                    <h3 className="border-b border-[#E3D4C4] px-5 py-4 text-[17px] font-normal">
                        Order Summary
                    </h3>
                    <dl className="space-y-3.5 px-5 py-5 font-sans text-[12px]">
                        {validItems.map((item) => (
                            <div
                                key={item.instanceId}
                                className="flex items-start justify-between gap-3 border-b border-[#E3D4C4]/50 pb-3 last:border-b-0 last:pb-0"
                            >
                                <img
                                    src={item.product.image ?? ""}
                                    alt={item.product.imageAlt ?? item.product.title}
                                    className="h-12 w-12 shrink-0 rounded-md object-cover bg-[#EFE5D8]"
                                />
                                <div className="min-w-0 flex-1">
                                    <dt className="truncate font-medium text-[#2A1D1B]">
                                        {item.product.title}
                                    </dt>
                                    <dd className="text-[10px] text-[#8C7A6E]">
                                        {item.stepConfig.label}
                                    </dd>
                                    {item.options?.label ? (
                                        <dd className="mt-0.5 truncate text-[11px] font-medium text-[#4A6350]">
                                            {item.options.label}
                                        </dd>
                                    ) : null}
                                    <div className="mt-1 flex items-center gap-2 text-[10px]">
                                        <button
                                            type="button"
                                            onClick={() => onRemoveItem(item.instanceId)}
                                            className="text-[#8A483B] underline hover:text-[#64291F]"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                                <dd className="shrink-0 font-medium">
                                    {formatPrice(item.product.price)}
                                </dd>
                            </div>
                        ))}
                        <div className="flex justify-between gap-3 border-t border-[#E3D4C4] pt-3">
                            <dt className="text-[#4C413A]">
                                Festive Box & Handwritten Note
                            </dt>
                            <dd className="font-medium text-[#2B3B2F]">Free</dd>
                        </div>
                    </dl>
                    <div className="flex items-center justify-between border-t border-[#E3D4C4] px-5 py-4 font-sans text-[13px]">
                        <span>Subtotal</span>
                        <span className="text-[18px] font-medium text-[#2A1D1B]">
                            {formatPrice(total)}
                        </span>
                    </div>
                    <div className="flex flex-col gap-2.5 px-5 pb-5">
                        {!canCheckout && (
                            <div className="rounded-lg border border-[#8A483B]/30 bg-[#8A483B]/10 p-3 text-center font-sans text-[11px] text-[#64291F]">
                                <p className="font-medium">
                                    {selectedCount < minProducts
                                        ? `Minimum ${minProducts} items required`
                                        : `Maximum ${maxProducts} items allowed`}
                                </p>
                                <p className="mt-0.5 text-[10px] text-[#7A3F33]">
                                    Currently {selectedCount} selected.
                                    {selectedCount < minProducts &&
                                        ` Please add at least ${minProducts - selectedCount} more item.`}
                                </p>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={onCheckout}
                            disabled={!canCheckout || isSubmitting}
                            className="flex h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[#2B3B2F] font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-[#F6EEE4] transition-all hover:bg-[#1F2C23] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span>
                                {isSubmitting ? "Processing..." : "Proceed to Checkout"}
                            </span>
                            <span aria-hidden>→</span>
                        </button>
                        <button
                            type="button"
                            onClick={onAddToBag}
                            disabled={!canCheckout || isSubmitting || added}
                            className="flex h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[#2B3B2F] bg-transparent font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-[#2B3B2F] transition-all hover:bg-[#2B3B2F]/5 disabled:cursor-default disabled:opacity-50"
                        >
                            {added ? "Added to bag ✓" : "Add to bag"}
                        </button>
                        <p className="mt-2 text-center font-sans text-[10px] text-[#6B564E]">
                            Free delivery across India · Usually ships in 3 to 5 working days
                        </p>
                    </div>
                </div>
            </aside>
        </div>
    );
}
export default function BuildGiftClient({
    products,
    minProducts = DEFAULT_MIN_GIFT_PRODUCTS,
    maxProducts = DEFAULT_MAX_GIFT_PRODUCTS,
}: {
    products: ProductView[];
    minProducts?: number;
    maxProducts?: number;
}) {
    const router = useRouter();
    const { addToCart, openCart, clearCheckout } = useShopState();
    const [stepIndex, setStepIndex] = useState(0);
    const [giftItems, setGiftItems] = useState<GiftItemSelection[]>([]);
    const [savedLoaded, setSavedLoaded] = useState(false);
    const [added, setAdded] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isReview = stepIndex === STEPS.length;
    const step = STEPS[Math.min(stepIndex, STEPS.length - 1)];
    const productsById = useMemo(
        () => new Map(products.map((product) => [product.id, product])),
        [products],
    );
    /*
     * Hydrate saved selections once from storage.
     */
    useEffect(() => {
        if (savedLoaded || products.length === 0) return;
        let stored = getStoredGiftItems();
        // Discard any items with unknown product IDs
        let valid = stored.filter((item) => productsById.has(item.productId));
        // Fallback: If draft was empty, recover selections from active gift checkout bundle
        if (valid.length === 0) {
            const bundle = getGiftCheckoutBundle();
            if (bundle && bundle.items && bundle.items.length > 0) {
                const recovered: GiftItemSelection[] = [];
                for (const bItem of bundle.items) {
                    const matchProduct = products.find((p) => p.slug === bItem.productSlug);
                    if (matchProduct) {
                        const stepKey =
                            STEPS.find((s) => s.label === bItem.categoryName)?.key ?? "scarves-and-squares";
                        recovered.push({
                            instanceId: generateInstanceId(),
                            productId: matchProduct.id,
                            stepKey,
                            options: bItem.selectedOptions
                                ? { label: bItem.variantLabel, options: bItem.selectedOptions }
                                : null,
                        });
                    }
                }
                if (recovered.length > 0) {
                    valid = recovered;
                }
            }
        }
        setGiftItems(valid);
        if (valid.length >= minProducts) {
            setStepIndex(STEPS.length); // Open directly on Review screen so user sees their gift box
        }
        setSavedLoaded(true);
    }, [products, productsById, savedLoaded, minProducts, maxProducts]);
    /*
     * Keep storage in sync with active gift items.
     */
    useEffect(() => {
        if (!savedLoaded) return;
        setStoredGiftItems(giftItems);
    }, [savedLoaded, giftItems]);
    const selectedCount = giftItems.length;
    const canAddMore = selectedCount < maxProducts;
    const canAccessReview = selectedCount >= minProducts;
    const countsByStep = useMemo(() => {
        const counts: Record<GiftStepKey, number> = {
            "scarves-and-squares": 0,
            perfumes: 0,
            "dokra-ornaments": 0,
            diffusers: 0,
        };
        for (const item of giftItems) {
            if (counts[item.stepKey] !== undefined) {
                counts[item.stepKey]++;
            }
        }
        return counts;
    }, [giftItems]);
    const countsByProductId = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const item of giftItems) {
            counts[item.productId] = (counts[item.productId] ?? 0) + 1;
        }
        return counts;
    }, [giftItems]);
    const resolvedGiftItems: ResolvedGiftItem[] = useMemo(() => {
        return giftItems.map((item) => {
            const product = productsById.get(item.productId) ?? null;
            const stepConfig =
                STEPS.find((s) => s.key === item.stepKey) ?? STEPS[0];
            return {
                ...item,
                product,
                stepConfig,
            };
        });
    }, [giftItems, productsById]);
    const total = useMemo(() => {
        return resolvedGiftItems.reduce(
            (sum, item) => sum + (item.product?.price ?? 0),
            0,
        );
    }, [resolvedGiftItems]);
    const visibleProducts = productsForStep(products, step.key);
    // Read-only preview for the reference-inspired layout. Selection is still
    // exclusively managed by the existing ProductDrawer and its handlers.
    const previewProduct =
        [...resolvedGiftItems].reverse().find(
            (item) => item.stepKey === step.key && item.product !== null,
        )?.product ?? visibleProducts[0] ?? null;
    function addProduct(
        product: ProductView,
        selection?: ProductSelectionPayload,
    ) {
        if (giftItems.length >= maxProducts) return;
        const newItem: GiftItemSelection = {
            instanceId: generateInstanceId(),
            productId: product.id,
            stepKey: step.key,
            options: selection ?? null,
        };
        setGiftItems((prev) => [...prev, newItem]);
        setAdded(false);
    }
    function removeProductOne(product: ProductView) {
        // Remove the most recently added instance of this product
        setGiftItems((prev) => {
            const lastIndex = prev
                .map((item) => item.productId)
                .lastIndexOf(product.id);
            if (lastIndex === -1) return prev;
            const next = [...prev];
            next.splice(lastIndex, 1);
            return next;
        });
        setAdded(false);
    }
    function removeItemByInstanceId(instanceId: string) {
        setGiftItems((prev) => prev.filter((i) => i.instanceId !== instanceId));
        setAdded(false);
    }
    function goTo(index: number) {
        if (index < 0 || index > STEPS.length) return;
        setStepIndex(index);
        setAdded(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    function continueToNextStep() {
        if (stepIndex < STEPS.length - 1) {
            goTo(stepIndex + 1);
        } else if (canAccessReview) {
            goTo(STEPS.length);
        }
    }
    function buildGiftCheckoutItems(validItems: (ResolvedGiftItem & { product: ProductView })[]): GiftCheckoutItem[] {
        return validItems.map((item) => {
            const categoryLabel = item.stepConfig.label;
            const optionLabel = item.options?.label;
            const variantLabel = optionLabel
                ? `[Gift Box · ${categoryLabel}] ${optionLabel}`
                : `[Gift Box · ${categoryLabel}]`;
            const selectedOptions: Record<string, string> = {
                ...(item.options?.options || {}),
                "Gift Category": categoryLabel,
                "Gift Packaging": "Festive Gift Box & Handwritten Card",
            };
            return {
                productSlug: item.product.slug,
                title: item.product.title,
                unitPrice: item.product.price,
                priceLabel: item.product.priceLabel,
                quantity: 1,
                image: item.product.image,
                shortDescription: item.product.shortDescription,
                variantLabel,
                selectedOptions,
                categoryName: categoryLabel,
                weightGrams: item.product.weightGrams,
                lengthCm: item.product.lengthCm,
                breadthCm: item.product.breadthCm,
                heightCm: item.product.heightCm,
            };
        });
    }
    async function addToBag() {
        if (!canAccessReview) return;
        setIsSubmitting(true);
        try {
            const validItems = resolvedGiftItems.filter(
                (item): item is ResolvedGiftItem & { product: ProductView } => item.product !== null,
            );
            if (validItems.length < minProducts) {
                throw new Error(`Minimum ${minProducts} products required for a gift.`);
            }
            const checkoutItems = buildGiftCheckoutItems(validItems);
            for (const item of checkoutItems) {
                addToCart(
                    {
                        productSlug: item.productSlug,
                        title: item.title,
                        unitPrice: item.unitPrice,
                        priceLabel: item.priceLabel,
                        quantity: 1,
                        image: item.image,
                        shortDescription: item.shortDescription,
                        variantLabel: item.variantLabel,
                        selectedOptions: item.selectedOptions,
                    },
                    { openDrawer: false },
                );
            }
            clearStoredGiftItems();
            setAdded(true);
            openCart();
        } catch (error) {
            console.error("Unable to save gift bundle to bag.", error);
        } finally {
            setIsSubmitting(false);
        }
    }
    async function proceedToCheckout() {
        if (!canAccessReview) return;
        setIsSubmitting(true);
        try {
            const validItems = resolvedGiftItems.filter(
                (item): item is ResolvedGiftItem & { product: ProductView } => item.product !== null,
            );
            if (validItems.length < minProducts) {
                throw new Error(`Minimum ${minProducts} products required for a gift.`);
            }
            const checkoutItems = buildGiftCheckoutItems(validItems);
            const bundle: GiftCheckoutBundle = {
                isGift: true,
                packaging: "festive",
                packagingTitle: "Festive Gift Box Packaging & Handwritten Card",
                total,
                items: checkoutItems,
            };
            // 1. Store gift bundle for checkout
            setGiftCheckoutBundle(bundle);
            // 2. Clear stale single-item Buy Now checkout state
            clearCheckout();
            if (typeof window !== "undefined") {
                try {
                    window.localStorage.removeItem("seijaku-checkout-item");
                    window.localStorage.removeItem("seijaku-checkout-variant");
                    window.localStorage.removeItem("seijaku-checkout-options");
                } catch {}
            }
            // 3. Sync to cart as well with gift labels
            for (const item of checkoutItems) {
                addToCart(
                    {
                        productSlug: item.productSlug,
                        title: item.title,
                        unitPrice: item.unitPrice,
                        priceLabel: item.priceLabel,
                        quantity: 1,
                        image: item.image,
                        shortDescription: item.shortDescription,
                        variantLabel: item.variantLabel,
                        selectedOptions: item.selectedOptions,
                    },
                    { openDrawer: false },
                );
            }
            // 4. Keep builder draft preserved so navigating back to /build-gift maintains all selections
            // 5. Navigate to checkout with gift query parameter
            router.push("/checkout?gift=true");
        } catch (error) {
            console.error("Failed to proceed to checkout.", error);
        } finally {
            setIsSubmitting(false);
        }
    }
    return (
        <main
            className="min-h-screen w-full bg-[#F9F5EE] px-4 pb-16 pt-24 text-[#2A1D1B] sm:px-6 sm:pt-28 xl:px-8 2xl:px-12"
            style={{
                fontFamily: "'EB Garamond', 'Cormorant Garamond', Georgia, serif",
            }}
        >
            <div className="mx-auto max-w-[1750px]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7DCCD] pb-4">
                    <span className="font-sans text-[11px] tracking-[0.08em] text-[#8D7B69]">
                        Build Your Gift
                    </span>
                    <Stepper
                        current={stepIndex}
                        countsByStep={countsByStep}
                        canAccessReview={canAccessReview}
                        onGo={goTo}
                    />
                    <span className="hidden font-serif text-[12px] italic text-[#9A8574] 2xl:block">
                        Small objects. Deeper connections.
                    </span>
                </div>

                {isReview ? (
                    <>
                        <GiftHeader
                            isReview={isReview}
                            stepIndex={stepIndex}
                            step={step}
                            selectedCount={selectedCount}
                            minProducts={minProducts}
                            maxProducts={maxProducts}
                        />
                        <GiftReview
                            items={resolvedGiftItems}
                            total={total}
                            selectedCount={selectedCount}
                            minProducts={minProducts}
                            maxProducts={maxProducts}
                            added={added}
                            isSubmitting={isSubmitting}
                            onAddToBag={addToBag}
                            onCheckout={proceedToCheckout}
                            onRemoveItem={removeItemByInstanceId}
                            onGoToStep={goTo}
                        />
                    </>
                ) : (
                    <div className="mt-7 grid grid-cols-1 items-start gap-6 md:gap-7 xl:grid-cols-[180px_minmax(0,1fr)_290px] 2xl:grid-cols-[210px_minmax(0,1fr)_305px] 2xl:gap-8">
                        {/* Left: reference-style introduction */}
                        <GiftHeader
                            isReview={isReview}
                            stepIndex={stepIndex}
                            step={step}
                            selectedCount={selectedCount}
                            minProducts={minProducts}
                            maxProducts={maxProducts}
                        />

                        {/* Centre: original ProductDrawer remains the sole selection UI.
                           Its filtering, variants, quantity, detail drawer and callbacks
                           are all retained unchanged. */}
                        <div className="min-w-0">
                            <div className="grid min-w-0 grid-cols-1 gap-5 min-[1700px]:grid-cols-[minmax(0,1fr)_290px]">
                                <section className="min-w-0 overflow-hidden border-t border-[#E7DCCD] pt-1">
                                    <ProductDrawer
                                        key={step.key}
                                        products={visibleProducts}
                                        selectedCountsByProductId={countsByProductId}
                                        canAddMore={canAddMore}
                                        onAddProduct={addProduct}
                                        onRemoveProduct={removeProductOne}
                                    />
                                </section>

                                {/* Read-only preview; clicking/selection behavior is
                                    intentionally left inside ProductDrawer. */}
                                {/* {previewProduct && (
                                    <aside className="min-w-0 border-t border-[#E7DCCD] pt-4 min-[1700px]:pt-0">
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[220px_minmax(0,1fr)] min-[1700px]:grid-cols-1">
                                            <div className="aspect-square overflow-hidden bg-[#EFE6D9]">
                                                {previewProduct.image ? (
                                                    <img
                                                        src={previewProduct.image}
                                                        alt={previewProduct.imageAlt ?? previewProduct.title}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center font-serif text-sm text-[#9D8A76]">Seijaku</div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-[20px] leading-tight text-[#42352E]">
                                                    {previewProduct.title}
                                                </p>
                                                <p className="mt-1 font-sans text-[12px] font-medium text-[#716154]">
                                                    {formatPrice(previewProduct.price)}
                                                </p>
                                                {previewProduct.shortDescription && (
                                                    <p className="mt-3 text-[13px] leading-[1.6] text-[#6D5C50]">
                                                        {previewProduct.shortDescription}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </aside>
                                )} */}
                            </div>
                        </div>

                        {/* Right: existing summary with its original actions */}
                        <GiftSidebar
                            items={resolvedGiftItems}
                            currentStepIndex={stepIndex}
                            selectedCount={selectedCount}
                            minProducts={minProducts}
                            maxProducts={maxProducts}
                            total={total}
                            onContinue={continueToNextStep}
                            onGoToStep={goTo}
                            onRemoveItem={removeItemByInstanceId}
                            onProceedToReview={() => goTo(STEPS.length)}
                        />
                    </div>
                )}
            </div>
        </main>
    );
}
