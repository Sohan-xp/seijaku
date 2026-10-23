"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Trash2, Search, X, Check, ExternalLink, Sparkles } from "lucide-react";
import AdminCard from "@/src/components/admin/AdminCard";
import {
  adminButtonClassName,
  adminSecondaryButtonClassName,
  adminInputClassName,
} from "@/src/components/admin/AdminField";
import type { ProductSummary } from "@/src/lib/admin-types";

type GiftStepKey = "scarves-and-squares" | "perfumes" | "dokra-ornaments" | "diffusers";

type StepDefinition = {
  key: GiftStepKey;
  label: string;
  description: string;
  tag: string;
};

const SECTIONS: StepDefinition[] = [
  {
    key: "scarves-and-squares",
    label: "Scarves & Squares",
    description: "Modal silk scarves, pocket squares, and quiet textiles.",
    tag: "Textiles",
  },
  {
    key: "perfumes",
    label: "Perfumes",
    description: "Botanical fragrances, botanical oils, and scents.",
    tag: "Fragrance",
  },
  {
    key: "dokra-ornaments",
    label: "Dokra Ornaments",
    description: "Lost-wax brass brooches and handcrafted ritual anchors.",
    tag: "Brass Objects",
  },
  {
    key: "diffusers",
    label: "Diffusers",
    description: "Stone, reed, brass diffusers, and botanical room oils.",
    tag: "Atmosphere",
  },
];

type BuildGiftManagerProps = {
  initialProducts: ProductSummary[];
};

function getBuildGiftMeta(product: ProductSummary): { enabled: boolean; section: GiftStepKey } {
  const meta = (product.metadata?.buildGift ?? product.metadata?.build_gift) as
    | { enabled?: boolean; section?: GiftStepKey }
    | undefined;
  return {
    enabled: Boolean(meta?.enabled),
    section: meta?.section || "scarves-and-squares",
  };
}

export default function BuildGiftManager({ initialProducts }: BuildGiftManagerProps) {
  const [products, setProducts] = useState<ProductSummary[]>(initialProducts);
  const [activeDialogSection, setActiveDialogSection] = useState<GiftStepKey | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Group products by gift section
  const sectionProductsMap = useMemo(() => {
    const map = new Map<GiftStepKey, ProductSummary[]>();
    for (const sec of SECTIONS) {
      map.set(sec.key, []);
    }
    for (const product of products) {
      const { enabled, section } = getBuildGiftMeta(product);
      if (enabled && map.has(section)) {
        map.get(section)!.push(product);
      }
    }
    return map;
  }, [products]);

  // Candidates for "+ Add Product" modal (published products not already in the target section)
  const candidateProducts = useMemo(() => {
    if (!activeDialogSection) return [];
    const currentInThisSection = new Set(
      (sectionProductsMap.get(activeDialogSection) ?? []).map((p) => p.id)
    );
    const q = searchQuery.toLowerCase().trim();

    return products.filter((p) => {
      if (currentInThisSection.has(p.id)) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q)
      );
    });
  }, [activeDialogSection, sectionProductsMap, products, searchQuery]);

  // Update product's buildGift metadata on the backend
  async function updateProductGiftMeta(
    productId: string,
    enabled: boolean,
    section: GiftStepKey
  ) {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    const existingMeta = (targetProduct.metadata ?? {}) as Record<string, unknown>;
    const updatedMetadata = {
      ...existingMeta,
      buildGift: {
        enabled,
        section,
      },
    };

    // Optimistic local update
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, metadata: updatedMetadata } : p))
    );

    try {
      const res = await fetch(`/api/admin/proxy/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: updatedMetadata }),
      });

      if (!res.ok) {
        throw new Error("Failed to save changes.");
      }

      setNotice(
        enabled
          ? `Added "${targetProduct.title}" to ${SECTIONS.find((s) => s.key === section)?.label}.`
          : `Removed "${targetProduct.title}" from gift builder.`
      );
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving product");
      // Revert optimistic update
      setProducts(initialProducts);
      setTimeout(() => setError(null), 5000);
    }
  }

  function handleAdd(productId: string) {
    if (!activeDialogSection) return;
    startTransition(async () => {
      await updateProductGiftMeta(productId, true, activeDialogSection);
    });
  }

  function handleRemove(productId: string, section: GiftStepKey) {
    startTransition(async () => {
      await updateProductGiftMeta(productId, false, section);
    });
  }

  function handleMove(productId: string, newSection: GiftStepKey) {
    startTransition(async () => {
      await updateProductGiftMeta(productId, true, newSection);
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      {notice && (
        <div className="flex items-center gap-2 rounded-xl bg-[#2d5a3f]/10 border border-[#2d5a3f]/20 px-4 py-3 text-[13px] text-[#2d5a3f]">
          <Check className="h-4 w-4" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-[#8c2e2e]/10 border border-[#8c2e2e]/20 px-4 py-3 text-[13px] text-[#8c2e2e]">
          {error}
        </div>
      )}

      {/* Intro info bar with link to view page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-[#f7f2ea] border border-[#e2d7c7] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-[#2d2824] p-2 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[15px] font-medium text-[#2d2824]">
              Build-A-Gift Curated Catalog
            </h3>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[#7b7064]">
              Only products explicitly selected in the 4 sections below will appear in the customer-facing Build-A-Gift box builder.
            </p>
          </div>
        </div>

        <Link
          href="/build-gift"
          target="_blank"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg bg-white px-3.5 py-2 text-[12px] font-medium text-[#2d2824] border border-[#e2d7c7] shadow-sm hover:bg-[#ece4d6] transition-colors"
        >
          <span>Preview Live Gift Builder</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* 4 Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SECTIONS.map((sec) => {
          const sectionItems = sectionProductsMap.get(sec.key) ?? [];
          return (
            <AdminCard key={sec.key}>
              <div className="flex items-start justify-between border-b border-[#e2d7c7] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[17px] font-medium text-[#2d2824]">{sec.label}</h2>
                    <span className="rounded-full bg-[#e8decf] px-2.5 py-0.5 text-[11px] font-semibold text-[#6a5d50]">
                      {sectionItems.length}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-[#7b7064]">{sec.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDialogSection(sec.key);
                    setSearchQuery("");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2d2824] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#463f39] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Product</span>
                </button>
              </div>

              {/* Product list */}
              <div className="mt-4 divide-y divide-[#ece4d6]">
                {sectionItems.length === 0 ? (
                  <div className="py-8 text-center text-[13px] text-[#8a8075]">
                    <p>No products assigned to this section yet.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDialogSection(sec.key);
                        setSearchQuery("");
                      }}
                      className="mt-2 text-[12px] font-medium text-[#2d2824] underline hover:text-black"
                    >
                      Click here to add products
                    </button>
                  </div>
                ) : (
                  sectionItems.map((prod) => {
                    const primaryImg = prod.primaryImage?.url || "/images/Home Page hero image 1.png";
                    return (
                      <div
                        key={prod.id}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-[#efe6d4] border border-[#e2d7c7]">
                            <Image
                              src={primaryImg}
                              alt={prod.title}
                              fill
                              sizes="48px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/products/${prod.id}`}
                              className="block truncate text-[13px] font-medium text-[#2d2824] hover:underline"
                            >
                              {prod.title}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#7b7064]">
                              <span>₹{prod.priceAmount.toLocaleString("en-IN")}</span>
                              <span>•</span>
                              <span className="capitalize">{prod.status.toLowerCase().replace(/_/g, " ")}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select
                            value={sec.key}
                            onChange={(e) => handleMove(prod.id, e.target.value as GiftStepKey)}
                            disabled={isPending}
                            className="rounded border border-[#d7cec1] bg-white px-2 py-1 text-[11px] text-[#554b42]"
                            title="Move to another section"
                          >
                            {SECTIONS.map((s) => (
                              <option key={s.key} value={s.key}>
                                Move to {s.label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRemove(prod.id, sec.key)}
                            disabled={isPending}
                            title="Remove from Gift Box"
                            className="rounded p-1 text-[#8a8075] hover:bg-[#edd8d8] hover:text-[#8c2e2e] transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </AdminCard>
          );
        })}
      </div>

      {/* Add Product Modal Dialog */}
      {activeDialogSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl bg-[#efe7db] border border-[#d7cec1] p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#e2d7c7] pb-4">
              <div>
                <h3 className="text-[18px] font-medium text-[#2d2824]">
                  Add Products to {SECTIONS.find((s) => s.key === activeDialogSection)?.label}
                </h3>
                <p className="text-[12px] text-[#7b7064] mt-0.5">
                  Select products from the catalog to include in this gift builder section.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDialogSection(null)}
                className="rounded-lg p-1.5 text-[#7b7064] hover:bg-[#e2d7c7] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8a8075]" />
              <input
                type="text"
                placeholder="Search products by title, slug, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${adminInputClassName} pl-9`}
                autoFocus
              />
            </div>

            {/* Candidate Products List */}
            <div className="mt-4 flex-1 overflow-y-auto divide-y divide-[#e2d7c7] pr-1">
              {candidateProducts.length === 0 ? (
                <div className="py-12 text-center text-[13px] text-[#8a8075]">
                  No matching products available to add.
                </div>
              ) : (
                candidateProducts.map((p) => {
                  const img = p.primaryImage?.url || "/images/Home Page hero image 1.png";
                  const { enabled: currentlyEnabled, section: currentSection } = getBuildGiftMeta(p);

                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-[#efe6d4] border border-[#d7cec1]">
                          <Image
                            src={img}
                            alt={p.title}
                            fill
                            sizes="44px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-[#2d2824]">
                            {p.title}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-[#7b7064]">
                            <span>₹{p.priceAmount.toLocaleString("en-IN")}</span>
                            <span>•</span>
                            <span className="capitalize">{p.type || "Product"}</span>
                            {currentlyEnabled && (
                              <>
                                <span>•</span>
                                <span className="text-[#a46427] font-medium">
                                  Currently in {SECTIONS.find((s) => s.key === currentSection)?.label}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAdd(p.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#2d2824] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#463f39] transition-colors flex-shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#e2d7c7] flex justify-end">
              <button
                type="button"
                onClick={() => setActiveDialogSection(null)}
                className={adminSecondaryButtonClassName}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
