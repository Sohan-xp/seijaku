"use client";

import Image from "next/image";
import { Heart } from "lucide-react";

import { hasVariantSelector, type ProductView } from "@/src/lib/product-types";
import { useShopState } from "@/src/components/shop/ShopStateProvider";
import type { ProductSelectionPayload } from "../utils";

type CompactProductCardProps = {
    item: ProductView;
    selectedCountForProduct: number;
    canAddMore: boolean;
    onAddGiftProduct: (item: ProductView, selection?: ProductSelectionPayload) => void;
    onRemoveGiftProduct: (item: ProductView) => void;
    onViewDetails: (slug: string) => void;
};

export default function CompactProductCard({
    item,
    selectedCountForProduct,
    canAddMore,
    onAddGiftProduct,
    onRemoveGiftProduct,
    onViewDetails,
}: CompactProductCardProps) {
    const { isCollected } = useShopState();
    const collected = isCollected(item.slug);
    const requiresVariants = hasVariantSelector(item);
    const isSelected = selectedCountForProduct > 0;

    return (
        <article
            className={`group relative overflow-hidden rounded-[24px] border bg-[linear-gradient(180deg,#fbf8f2_0%,#f7f1e8_100%)] shadow-[0_10px_24px_rgba(44,37,28,0.03)] transition-all duration-300 hover:-translate-y-[1px] hover:shadow-[0_16px_30px_rgba(44,37,28,0.045)] ${
                isSelected
                    ? "border-[#4A6350] ring-1 ring-[#4A6350]/20"
                    : "border-[rgba(111,100,86,0.11)] hover:border-[rgba(111,100,86,0.18)]"
            }`}
        >
            <button
                type="button"
                onClick={(event) => event.stopPropagation()}
                aria-label={
                    collected
                        ? `Remove ${item.title} from wishlist`
                        : `Add ${item.title} to wishlist`
                }
                className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8c7b68] ${
                    collected
                        ? "scale-105 bg-[#294536] text-[#f4efe8] shadow-md"
                        : "bg-white/80 text-[#5d5449] shadow-sm hover:bg-white hover:text-[#1d1a17]"
                }`}
            >
                <Heart
                    size={14}
                    fill={collected ? "currentColor" : "none"}
                    strokeWidth={2.2}
                />
            </button>

            <button
                type="button"
                onClick={() => onViewDetails(item.slug)}
                className="block w-full text-left focus-visible:outline-none"
            >
                <div className="relative aspect-[4/4.45] overflow-hidden bg-[#e7dfd1]">
                    <Image
                        src={item.image}
                        alt={item.imageAlt ?? item.title}
                        fill
                        sizes="(min-width: 1280px) 18vw, (min-width: 768px) 28vw, 48vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(28,24,20,0)_58%,rgba(28,24,20,0.08)_100%)]" />
                </div>
            </button>

            <div className="px-4 pb-4 pt-4">
                <p className="text-[9px] uppercase tracking-[0.22em] text-[#91806d]">
                    {item.type}
                </p>

                <h2 className="mt-2 font-serif text-[18px] leading-[1.12] tracking-[-0.022em] text-[#1f1a16]">
                    {item.title}
                </h2>

                {/* <p className="mt-2 line-clamp-2 min-h-[2.9rem] text-[13px] leading-[1.68] text-[#625a51]">
                    {item.shortDescription || "Quietly composed Seijaku object."}
                </p> */}

                <div className="mt-2">
                    {/* <p className="text-[9px] uppercase tracking-[0.18em] text-[#8f7a65]">
                        Price
                    </p> */}
                    <p className="mt-1 text-[14px] text-[#2f2924]">
                        {item.priceLabel}
                    </p>
                </div>

                <div className="mt-4 border-t border-[#e6ddd0] pt-4">
                    {requiresVariants ? (
                        isSelected ? (
                            <div className="flex items-center justify-between gap-2">
                                <span className="rounded-md border border-[#4A6350]/30 bg-[#4A6350]/15 px-2.5 py-1 font-sans text-[11px] font-medium text-[#2B3B2F]">
                                    In Gift ({selectedCountForProduct})
                                </span>
                                <div className="flex items-center gap-1.5 font-sans">
                                    <button
                                        type="button"
                                        disabled={!canAddMore}
                                        onClick={() => onViewDetails(item.slug)}
                                        className="rounded-lg border border-[#4A6350] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-[#2B3B2F] transition-colors hover:bg-[#4A6350] hover:text-[#F6EEE4] disabled:cursor-not-allowed disabled:opacity-40"
                                        title={canAddMore ? "Add another with options" : "Gift box is full"}
                                    >
                                        + Options
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveGiftProduct(item)}
                                        className="rounded-lg border border-[#8A483B]/30 px-2 py-1 text-[10px] uppercase tracking-wider text-[#8A483B] transition-colors hover:bg-[#8A483B]/10"
                                        title="Remove one from gift"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                disabled={!canAddMore}
                                onClick={() => onViewDetails(item.slug)}
                                className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#d8cdc0] bg-[#e8ded0]/60 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#4c4238] transition-all hover:bg-[#e8ded0] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <span>{canAddMore ? "Select Options" : "Gift Box Full"}</span>
                                <span aria-hidden>→</span>
                            </button>
                        )
                    ) : isSelected ? (
                        <div className="flex items-center justify-between gap-2 font-sans">
                            <span className="rounded-md border border-[#4A6350]/30 bg-[#4A6350]/15 px-2.5 py-1 text-[11px] font-medium text-[#2B3B2F]">
                                In Gift ({selectedCountForProduct})
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => onRemoveGiftProduct(item)}
                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[#8A483B]/40 text-[13px] font-bold text-[#8A483B] transition-colors hover:bg-[#8A483B]/10"
                                    title="Remove one"
                                >
                                    −
                                </button>
                                <button
                                    type="button"
                                    disabled={!canAddMore}
                                    onClick={() => onAddGiftProduct(item)}
                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[#4A6350] bg-[#4A6350] text-[13px] font-bold text-[#F6EEE4] transition-colors hover:bg-[#3D5242] disabled:cursor-not-allowed disabled:opacity-40"
                                    title={canAddMore ? "Add another" : "Gift box is full"}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            disabled={!canAddMore}
                            onClick={() => onAddGiftProduct(item)}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#EFE5D8] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#2B3B2F] transition-all hover:bg-[#E2D4C3] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <span>
                                {canAddMore ? "+ Add to Gift Box" : "Gift Box Full"}
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}
