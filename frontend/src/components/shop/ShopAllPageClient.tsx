"use client";

import { PanelLeftOpen, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  getShopMaterials,
  getShopTypes,
  getShopPrices,
  matchesShopMaterialFilter,
  matchesShopTypeFilter,
  matchesShopPriceFilter,
  sortOptions,
  type ShopMaterialFilterOption,
  type ShopSortOption,
  type ShopTypeFilterOption,
  type ShopUseCase,
  type ShopPriceFilterOption,
} from "@/src/lib/shop-taxonomy";
import {
  collectUseCases,
  getShopProductUseCase,
  type ProductView,
} from "@/src/lib/product-types";

import ActiveFilterChips from "./ActiveFilterChips";
import CompactProductCard from "./CompactProductCard";
import ShopFilterDrawer from "./ShopFilterDrawer";
import ShopFilterRail from "./ShopFilterRail";

const INITIAL_BATCH_SIZE = 8;
const LOAD_MORE_STEP = 8;
const RAIL_COLLAPSE_STORAGE_KEY = "seijaku.shopFilterRail.collapsed";

function sortProducts(items: ProductView[], sortBy: ShopSortOption) {
  const list = [...items];

  if (sortBy === "Newest") {
    const fallback = "2026-01-01";
    return list.sort(
      (a, b) =>
        new Date(b.releaseDate ?? fallback).getTime() -
        new Date(a.releaseDate ?? fallback).getTime(),
    );
  }

  if (sortBy === "Price low to high") {
    return list.sort((a, b) => a.price - b.price);
  }

  if (sortBy === "Price high to low") {
    return list.sort((a, b) => b.price - a.price);
  }

  return list;
}

function matchesSearch(item: ProductView, query: string) {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const haystack = [item.title, item.shortDescription, item.material, item.type]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

type ShopAllPageClientProps = {
  products: ProductView[];
};

export default function ShopAllPageClient({ products }: ShopAllPageClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [selectedType, setSelectedType] = useState<ShopTypeFilterOption | "All">("All");
  const [selectedMaterial, setSelectedMaterial] = useState<ShopMaterialFilterOption | "All">("All");
  const [selectedUseCase, setSelectedUseCase] = useState<ShopUseCase | "All">("All");
  const [selectedPrice, setSelectedPrice] = useState<ShopPriceFilterOption | "All">("All");
  const [sortBy, setSortBy] = useState<ShopSortOption>("Recommended");
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
  const [isRailCollapsed, setIsRailCollapsed] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Hydrate collapse preference from localStorage after mount to avoid SSR
  // mismatch. Reads once, writes on each toggle below.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RAIL_COLLAPSE_STORAGE_KEY);
      if (stored === "true") {
        setIsRailCollapsed(true);
      }
    } catch {
      // Private mode or storage disabled — ignore; feature just doesn't persist.
    }
  }, []);

  const updateQuery = (slug?: string) => {
    if (slug) {
      router.push(`/shop/${slug}`);
    }
  };

  const filteredProducts = useMemo(() => {
    const refined = products.filter((item) => {
      const itemUseCase = getShopProductUseCase(item);
      const bySearch = matchesSearch(item, searchValue);
      const byType = matchesShopTypeFilter(item, selectedType);
      const byMaterial = matchesShopMaterialFilter(item, selectedMaterial);
      const byUseCase = selectedUseCase === "All" || itemUseCase === selectedUseCase;
      const byPrice = matchesShopPriceFilter(item, selectedPrice);

      return bySearch && byType && byMaterial && byUseCase && byPrice;
    });

    return sortProducts(refined, sortBy);
  }, [products, searchValue, selectedMaterial, selectedType, selectedUseCase, selectedPrice, sortBy]);

  // `getShopTypes()` / `getShopMaterials()` return static curated filter-chip
  // taxonomies (not derived from the product set) — safe to keep using the
  // static registry exports here. Only `useCases` is derived from actual
  // product data, which now comes from the backend-fetched prop.
  const types = getShopTypes();
  const materials = getShopMaterials();
  const useCases = useMemo(() => collectUseCases(products), [products]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleProducts.length < filteredProducts.length;

  const activeChips = useMemo(() => {
    const chips: Array<{ id: string; label: string }> = [];

    if (searchValue.trim()) {
      chips.push({ id: "search", label: `Search: ${searchValue.trim()}` });
    }

    if (selectedType !== "All") {
      chips.push({ id: "type", label: selectedType });
    }

    if (selectedMaterial !== "All") {
      chips.push({ id: "material", label: selectedMaterial });
    }

    if (selectedUseCase !== "All") {
      chips.push({ id: "useCase", label: selectedUseCase });
    }

    if (selectedPrice !== "All") {
      chips.push({ id: "price", label: selectedPrice });
    }

    return chips;
  }, [searchValue, selectedMaterial, selectedType, selectedUseCase, selectedPrice]);

  const hasActiveFilters = activeChips.length > 0 || sortBy !== "Recommended";

  const resetFilters = () => {
    setSearchValue("");
    setSelectedType("All");
    setSelectedMaterial("All");
    setSelectedUseCase("All");
    setSelectedPrice("All");
    setSortBy("Recommended");
    setVisibleCount(INITIAL_BATCH_SIZE);
  };

  const removeChip = (chipId: string) => {
    if (chipId === "search") {
      setSearchValue("");
    }

    if (chipId === "type") {
      setSelectedType("All");
    }

    if (chipId === "material") {
      setSelectedMaterial("All");
    }

    if (chipId === "useCase") {
      setSelectedUseCase("All");
    }

    if (chipId === "price") {
      setSelectedPrice("All");
    }

    setVisibleCount(INITIAL_BATCH_SIZE);
  };

  const toggleRailCollapsed = (next: boolean) => {
    setIsRailCollapsed(next);
    try {
      window.localStorage.setItem(RAIL_COLLAPSE_STORAGE_KEY, String(next));
    } catch {
      // Ignore storage failures; collapse still works for this session.
    }
  };

  const filterRailProps = {
    searchValue,
    onSearchChange: (value: string) => {
      setSearchValue(value);
      setVisibleCount(INITIAL_BATCH_SIZE);
    },
    selectedType,
    onTypeChange: (value: ShopTypeFilterOption | "All") => {
      setSelectedType(value);
      setVisibleCount(INITIAL_BATCH_SIZE);
    },
    selectedMaterial,
    onMaterialChange: (value: ShopMaterialFilterOption | "All") => {
      setSelectedMaterial(value);
      setVisibleCount(INITIAL_BATCH_SIZE);
    },
    selectedUseCase,
    onUseCaseChange: (value: ShopUseCase | "All") => {
      setSelectedUseCase(value);
      setVisibleCount(INITIAL_BATCH_SIZE);
    },
    selectedPrice,
    onPriceChange: (value: ShopPriceFilterOption | "All") => {
      setSelectedPrice(value);
      setVisibleCount(INITIAL_BATCH_SIZE);
    },
    sortBy,
    onSortChange: (value: ShopSortOption) => {
      setSortBy(value);
      setVisibleCount(INITIAL_BATCH_SIZE);
    },
    types,
    materials,
    useCases,
    prices: getShopPrices(),
    sortOptions,
    onReset: resetFilters,
    hasActiveFilters,
  };

  const gridColumnClasses = isRailCollapsed
    ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    : "grid gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

  return (
    <>
      <main className="min-h-screen bg-[#f3efe7] pt-[72px] text-[#3a3a3a] sm:pt-[76px]">
        {/* <section className="section-primary pb-6 pt-18 sm:pb-7 sm:pt-22"> */}
        <div className="page-container max-w-[1240px] pb-6 pt-18 sm:pb-7 sm:pt-22">
          <div className="max-w-[760px]">
            <p className="text-[9px] uppercase tracking-[0.32em] text-[#9a785d]">Collection</p>
            <h1 className="mt-4 text-[clamp(34px,4.2vw,50px)] leading-[1.04] tracking-[-0.03em] text-[#1d1a17]">Shop All</h1>
            <p className="mt-3 max-w-[44ch] text-[15px] leading-[1.82] text-[#5f584f]">
              A searchable Seijaku catalog designed for quick scanning, quieter comparison, and detail on demand.
            </p>
          </div>
        </div>
        {/* </section> */}

        <section className="pb-20 sm:pb-24">
          <div className="page-container max-w-[1240px]">
            <div
              className={`grid gap-8 ${isRailCollapsed ? "lg:grid-cols-1" : "lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10 xl:gap-12"
                }`}
            >
              {!isRailCollapsed ? (
                <aside className="hidden lg:block">
                  <ShopFilterRail {...filterRailProps} onCollapse={() => toggleRailCollapsed(true)} />
                </aside>
              ) : null}

              <div>
                <div className="flex flex-col gap-3 border-b border-[rgba(76,67,57,0.08)] pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                  <div className="flex items-center gap-3">
                    {isRailCollapsed ? (
                      <button
                        type="button"
                        onClick={() => toggleRailCollapsed(false)}
                        className="hidden items-center gap-2 rounded-full border border-[rgba(111,100,86,0.14)] bg-white px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-[#4f463d] transition-colors duration-200 hover:border-[rgba(96,86,74,0.22)] hover:bg-[#faf7f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8c7b68] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f3efe7] lg:inline-flex"
                      >
                        <PanelLeftOpen aria-hidden size={14} strokeWidth={1.6} />
                        <span>Show Filters</span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setIsFilterDrawerOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-[rgba(111,100,86,0.14)] bg-white px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-[#4f463d] transition-colors duration-200 hover:border-[rgba(96,86,74,0.22)] hover:bg-[#faf7f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8c7b68] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f3efe7] lg:hidden"
                    >
                      <SlidersHorizontal aria-hidden size={14} strokeWidth={1.6} />
                      <span>Filters{activeChips.length > 0 ? ` (${activeChips.length})` : ""}</span>
                    </button>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#7c7368]">{filteredProducts.length} results</p>
                  </div>
                  <ActiveFilterChips chips={activeChips} onRemove={removeChip} onClear={resetFilters} />
                </div>

                {visibleProducts.length === 0 ? (
                  <div className="mt-8 rounded-[28px] border border-[rgba(111,100,86,0.11)] bg-[linear-gradient(180deg,#fbf8f2_0%,#f7f1e8_100%)] px-7 py-10 text-center sm:px-10 sm:py-12">
                    <p className="font-serif text-[30px] leading-[1.14] tracking-[-0.02em] text-[#1f1a16]">No products match this quiet.</p>
                    <p className="mx-auto mt-4 max-w-[34ch] text-[15px] leading-[1.85] text-[#5f5850]">
                      Try broadening the filters or clearing the search to return to the full catalog.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className={`mt-8 ${gridColumnClasses}`}>
                      {visibleProducts.map((item) => (
                        <CompactProductCard key={item.slug} item={item} onViewDetails={updateQuery} />
                      ))}
                    </div>

                    {hasMore ? (
                      <div className="mt-12 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setVisibleCount((count) => count + LOAD_MORE_STEP)}
                          className="inline-flex items-center justify-center rounded-full border border-[rgba(111,100,86,0.14)] bg-[linear-gradient(180deg,#fbf8f2_0%,#f3ede4_100%)] px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] text-[#4c443c] transition-colors duration-200 hover:border-[rgba(96,86,74,0.22)] hover:bg-[#faf7f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8c7b68] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f3efe7]"
                        >
                          Load More
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <ShopFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        {...filterRailProps}
      />
    </>
  );
}
