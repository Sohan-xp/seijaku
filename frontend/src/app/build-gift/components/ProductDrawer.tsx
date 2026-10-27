"use client";

import { PanelLeftOpen, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
    getShopPrices,
    getShopTypes,
    matchesShopPriceFilter,
    matchesShopTypeFilter,
    sortOptions,
    type ShopPriceFilterOption,
    type ShopSortOption,
    type ShopTypeFilterOption,
} from "@/src/lib/shop-taxonomy";
import type { ProductView } from "@/src/lib/product-types";

import ActiveFilterChips from "./ActiveFilterChips";
import CompactProductCard from "./CompactProductCard";
import ProductDetailDrawer from "./ProductDetailDrawer";
import ShopFilterDrawer from "./ShopFilterDrawer";
import ShopFilterRail from "./ShopFilterRail";
import type { ProductSelectionPayload } from "../utils";

const INITIAL_BATCH_SIZE = 8;
const LOAD_MORE_STEP = 8;
const RAIL_COLLAPSE_STORAGE_KEY = "seijaku.shopFilterRail.collapsed";

function matchesSearch(item: ProductView, query: string) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;

    return [item.title, item.shortDescription, item.material, item.type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized);
}

function sortProducts(items: ProductView[], sortBy: ShopSortOption) {
    const sorted = [...items];

    if (sortBy === "Newest") {
        return sorted.sort(
            (a, b) =>
                new Date(b.releaseDate ?? 0).getTime() -
                new Date(a.releaseDate ?? 0).getTime(),
        );
    }

    if (sortBy === "Price low to high") {
        return sorted.sort((a, b) => a.price - b.price);
    }

    if (sortBy === "Price high to low") {
        return sorted.sort((a, b) => b.price - a.price);
    }

    return sorted;
}

type ProductDrawerProps = {
    products: ProductView[];
    selectedCountsByProductId: Record<string, number>;
    canAddMore: boolean;
    onAddProduct: (product: ProductView, selection?: ProductSelectionPayload) => void;
    onRemoveProduct: (product: ProductView) => void;
};

export default function ProductDrawer({
    products,
    selectedCountsByProductId,
    canAddMore,
    onAddProduct,
    onRemoveProduct,
}: ProductDrawerProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [searchValue, setSearchValue] = useState("");
    const [selectedType, setSelectedType] =
        useState<ShopTypeFilterOption | "All">("All");
    const [selectedPrice, setSelectedPrice] =
        useState<ShopPriceFilterOption | "All">("All");
    const [sortBy, setSortBy] = useState<ShopSortOption>("Recommended");
    const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
    const [isRailCollapsed, setIsRailCollapsed] = useState(true);
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

    const detailSlug = searchParams.get("item");
    const detailProduct = detailSlug
        ? products.find((product) => product.slug === detailSlug) ?? null
        : null;

    useEffect(() => {
        try {
            setIsRailCollapsed(
                localStorage.getItem(RAIL_COLLAPSE_STORAGE_KEY) === "true",
            );
        } catch {
            // localStorage can be unavailable in restricted/private browsing.
        }
    }, []);

    const types = useMemo(() => {
        const available = getShopTypes().filter((type) =>
            products.some((product) => matchesShopTypeFilter(product, type)),
        );

        return available.length > 0 ? available : getShopTypes();
    }, [products]);

    const filteredProducts = useMemo(() => {
        const filtered = products.filter(
            (item) =>
                matchesSearch(item, searchValue) &&
                matchesShopTypeFilter(item, selectedType) &&
                matchesShopPriceFilter(item, selectedPrice),
        );

        return sortProducts(filtered, sortBy);
    }, [products, searchValue, selectedPrice, selectedType, sortBy]);

    const visibleProducts = filteredProducts.slice(0, visibleCount);
    const hasMore = visibleCount < filteredProducts.length;

    const activeChips = useMemo(() => {
        const chips: Array<{ id: string; label: string }> = [];

        if (searchValue.trim()) {
            chips.push({ id: "search", label: `Search: ${searchValue.trim()}` });
        }
        if (selectedType !== "All") {
            chips.push({ id: "type", label: selectedType });
        }
        if (selectedPrice !== "All") {
            chips.push({ id: "price", label: selectedPrice });
        }

        return chips;
    }, [searchValue, selectedPrice, selectedType]);

    const hasActiveFilters =
        activeChips.length > 0 || sortBy !== "Recommended";

    function resetVisibleCount() {
        setVisibleCount(INITIAL_BATCH_SIZE);
    }

    function resetFilters() {
        setSearchValue("");
        setSelectedType("All");
        setSelectedPrice("All");
        setSortBy("Recommended");
        resetVisibleCount();
    }

    function removeChip(id: string) {
        if (id === "search") setSearchValue("");
        if (id === "type") setSelectedType("All");
        if (id === "price") setSelectedPrice("All");
        resetVisibleCount();
    }

    function toggleRailCollapsed(collapsed: boolean) {
        setIsRailCollapsed(collapsed);

        try {
            localStorage.setItem(
                RAIL_COLLAPSE_STORAGE_KEY,
                String(collapsed),
            );
        } catch {
            // Persistence is optional; the UI still works for this session.
        }
    }

    function updateQuery(slug?: string) {
        const params = new URLSearchParams(searchParams.toString());

        if (slug) params.set("item", slug);
        else params.delete("item");

        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, {
            scroll: false,
        });
    }

    const filterRailProps = {
        searchValue,
        onSearchChange: (value: string) => {
            setSearchValue(value);
            resetVisibleCount();
        },
        selectedType,
        onTypeChange: (value: ShopTypeFilterOption | "All") => {
            setSelectedType(value);
            resetVisibleCount();
        },
        selectedPrice,
        onPriceChange: (value: ShopPriceFilterOption | "All") => {
            setSelectedPrice(value);
            resetVisibleCount();
        },
        sortBy,
        onSortChange: (value: ShopSortOption) => {
            setSortBy(value);
            resetVisibleCount();
        },
        types,
        prices: getShopPrices(),
        sortOptions,
        onReset: resetFilters,
        hasActiveFilters,
    };

    const gridColumns =
        "grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3";

    return (
        <>
            <div className="w-full text-[#3a3a3a]">
                <section className="pb-16 sm:pb-20">
                    <div className="w-full">
                        <div
                            // className={`grid gap-6 ${
                            //     isRailCollapsed
                            //         ? "lg:grid-cols-1"
                            //         : "lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8"
                            // }`}
                        >
                            {!isRailCollapsed && (
                                <aside className="hidden lg:block">
                                    <ShopFilterRail
                                        {...filterRailProps}
                                        onCollapse={() =>
                                            toggleRailCollapsed(true)
                                        }
                                    />
                                </aside>
                            )}

                            <div>
                                <div className="flex flex-col gap-3 border-b border-[rgba(76,67,57,0.08)] pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                                    <div className="flex items-center gap-3">
                                        {isRailCollapsed && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleRailCollapsed(false)
                                                }
                                                className="hidden items-center gap-2 rounded-full border border-[rgba(111,100,86,0.14)] bg-white px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-[#4f463d] transition-colors hover:bg-[#faf7f1] lg:inline-flex"
                                            >
                                                <PanelLeftOpen
                                                    aria-hidden
                                                    size={14}
                                                    strokeWidth={1.6}
                                                />
                                                Show Filters
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setIsFilterDrawerOpen(true)
                                            }
                                            className="inline-flex items-center gap-2 rounded-full border border-[rgba(111,100,86,0.14)] bg-white px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-[#4f463d] transition-colors hover:bg-[#faf7f1] lg:hidden"
                                        >
                                            <SlidersHorizontal
                                                aria-hidden
                                                size={14}
                                                strokeWidth={1.6}
                                            />
                                            Filters
                                            {activeChips.length > 0 &&
                                                ` (${activeChips.length})`}
                                        </button>

                                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#7c7368]">
                                            {filteredProducts.length} results
                                        </p>
                                    </div>

                                    <ActiveFilterChips
                                        chips={activeChips}
                                        onRemove={removeChip}
                                        onClear={resetFilters}
                                    />
                                </div>

                                {visibleProducts.length === 0 ? (
                                    <div className="mt-8 rounded-[28px] border border-[rgba(111,100,86,0.11)] bg-[linear-gradient(180deg,#fbf8f2_0%,#f7f1e8_100%)] px-7 py-10 text-center sm:px-10 sm:py-12">
                                        <p className="font-serif text-[30px] leading-[1.14] tracking-[-0.02em] text-[#1f1a16]">
                                            No products match this selection.
                                        </p>
                                        <p className="mx-auto mt-4 max-w-[34ch] text-[15px] leading-[1.85] text-[#5f5850]">
                                            Try clearing or broadening the filters.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className={`mt-8 ${gridColumns}`}>
                                            {visibleProducts.map((product) => {
                                                const countForProduct =
                                                    selectedCountsByProductId[
                                                        product.id
                                                    ] ?? 0;
                                                return (
                                                    <CompactProductCard
                                                        key={product.id}
                                                        item={product}
                                                        selectedCountForProduct={
                                                            countForProduct
                                                        }
                                                        canAddMore={canAddMore}
                                                        onAddGiftProduct={
                                                            onAddProduct
                                                        }
                                                        onRemoveGiftProduct={
                                                            onRemoveProduct
                                                        }
                                                        onViewDetails={
                                                            updateQuery
                                                        }
                                                    />
                                                );
                                            })}
                                        </div>

                                        {hasMore && (
                                            <div className="mt-12 flex justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setVisibleCount(
                                                             (count) =>
                                                                count +
                                                                LOAD_MORE_STEP,
                                                        )
                                                    }
                                                    className="inline-flex items-center justify-center rounded-full border border-[rgba(111,100,86,0.14)] bg-[linear-gradient(180deg,#fbf8f2_0%,#f3ede4_100%)] px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] text-[#4c443c] transition-colors hover:bg-[#faf7f1]"
                                                >
                                                    Load More
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <ShopFilterDrawer
                isOpen={isFilterDrawerOpen}
                onClose={() => setIsFilterDrawerOpen(false)}
                {...filterRailProps}
            />

            <ProductDetailDrawer
                item={detailProduct}
                isOpen={Boolean(detailProduct)}
                onClose={() => updateQuery()}
                selectedCountForProduct={
                    detailProduct
                        ? (selectedCountsByProductId[detailProduct.id] ?? 0)
                        : 0
                }
                canAddMore={canAddMore}
                onAddGiftProduct={onAddProduct}
                onRemoveGiftProduct={onRemoveProduct}
            />
        </>
    );
}
