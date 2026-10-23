"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import AddMediaDialog from "@/src/components/admin/AddMediaDialog";
import AdminCard from "@/src/components/admin/AdminCard";
import AdminStatusBadge from "@/src/components/admin/AdminStatusBadge";
import {
  AdminField,
  adminButtonClassName,
  adminDangerButtonClassName,
  adminInputClassName,
  adminSecondaryButtonClassName,
  adminTextareaClassName,
} from "@/src/components/admin/AdminField";
import MediaGallery, { type GalleryItem } from "@/src/components/admin/MediaGallery";
import RichTextarea from "@/src/components/admin/RichTextarea";
import type {
  BridgePage,
  CollectionSummary,
  MediaAsset,
  ProductCategory,
  ProductSummary,
  ProductWorkflowStatus,
} from "@/src/lib/admin-types";
import { defaultBridgeSlugForProductType } from "@/src/lib/shop-taxonomy";

type ProductEditorProps = {
  product: ProductSummary | null;
  media: MediaAsset[];
  categories: ProductCategory[];
  collections: CollectionSummary[];
  bridgePages: BridgePage[];
  canDelete: boolean;
};

type ProductOptionDraft = {
  id: string;
  code: string;
  label: string;
  selectionMode: "SINGLE" | "MULTI";
  required: boolean;
  sortOrder: number;
  values: Array<{
    id: string;
    value: string;
    label: string;
    priceDeltaAmount: number;
    sortOrder: number;
  }>;
};

const stockStatusOptions = [
  "IN_STOCK",
  "LIMITED_EDITION",
  "UPCOMING",
  "OPEN_FOR_BOOKING",
  "SOLD_OUT",
  "WAITLIST",
  "BOOKING_OPEN",
];

function buildCoreState(product: ProductSummary | null) {
  return {
    slug: product?.slug ?? "",
    title: product?.title ?? "",
    shortDescription: product?.shortDescription ?? "",
    longDescription: product?.longDescription ?? "",
    type: product?.type ?? "",
    material: product?.material ?? "",
    useCase: product?.useCase ?? "",
    priceAmount: product?.priceAmount ?? 0,
    currency: product?.currency ?? "INR",
    status: product?.status ?? "IN_STOCK",
    workflowStatus: (product?.workflowStatus ?? "DRAFT") as ProductWorkflowStatus,
    releaseDate: product?.releaseDate ? product.releaseDate.slice(0, 16) : "",
    seoTitle: product?.seoTitle ?? "",
    seoDescription: product?.seoDescription ?? "",
    imageAlt: product?.imageAlt ?? "",
    ctaLabel: product?.ctaLabel ?? "",
    // Shipping dimensions. Stored as empty string in the form when null
    // so the inputs render uncontrolled-friendly text; coerced back to
    // number-or-null at submit time.
    weightGrams: product?.weightGrams != null ? String(product.weightGrams) : "",
    lengthCm: product?.lengthCm != null ? String(product.lengthCm) : "",
    breadthCm: product?.breadthCm != null ? String(product.breadthCm) : "",
    heightCm: product?.heightCm != null ? String(product.heightCm) : "",
    hsnCode: product?.hsnCode ?? "",
  };
}

function buildAdvancedState(product: ProductSummary | null) {
  return {
    metadata: product?.metadata ? JSON.stringify(product.metadata, null, 2) : "",
  };
}

function buildBuildGiftState(product: ProductSummary | null) {
  const meta = (product?.metadata?.buildGift ?? product?.metadata?.build_gift) as
    | { enabled?: boolean; section?: string }
    | undefined;
  return {
    enabled: Boolean(meta?.enabled),
    section: meta?.section || "scarves-and-squares",
  };
}

function buildMediaState(product: ProductSummary | null): {
  primaryImageId: string;
  items: GalleryItem[];
} {
  return {
    primaryImageId: product?.primaryImage?.id ?? "",
    items:
      product?.media.map((item) => ({
        mediaAssetId: item.asset.id,
        sortOrder: item.sortOrder,
        mediaType: item.type,
      })) ?? [],
  };
}

function buildAssignmentState(entries: Array<{ id: string; sortOrder: number }>) {
  return entries.map((entry) => ({ id: entry.id, sortOrder: entry.sortOrder }));
}

function buildOptionsState(product: ProductSummary | null): ProductOptionDraft[] {
  return (
    product?.options.map((option) => ({
      id: option.id,
      code: option.code,
      label: option.label,
      selectionMode: option.selectionMode,
      required: option.required,
      sortOrder: option.sortOrder,
      values: option.values.map((value) => ({
        id: value.id,
        value: value.value,
        label: value.label,
        priceDeltaAmount: value.priceDeltaAmount,
        sortOrder: value.sortOrder,
      })),
    })) ?? []
  );
}

export default function ProductEditor({
  product,
  media,
  categories,
  collections,
  bridgePages,
  canDelete,
}: ProductEditorProps) {
  const router = useRouter();
  // Re-mount via key in the page component would be the "correct" way to reset
  // state when product changes, but we keep the old useEffect-sync pattern to
  // preserve behavior (e.g. staying on the same route after save + refresh).
  const [core, setCore] = useState(buildCoreState(product));
  const [advanced, setAdvanced] = useState(buildAdvancedState(product));
  const [buildGift, setBuildGift] = useState(buildBuildGiftState(product));
  const [mediaState, setMediaState] = useState(buildMediaState(product));
  const [categoryAssignments, setCategoryAssignments] = useState(buildAssignmentState(product?.categories ?? []));
  const [collectionAssignments, setCollectionAssignments] = useState(buildAssignmentState(product?.collections ?? []));
  const [bridgeAssignments, setBridgeAssignments] = useState(buildAssignmentState(product?.bridgePages ?? []));
  const [options, setOptions] = useState<ProductOptionDraft[]>(buildOptionsState(product));
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Server-returned Zod field errors, keyed by payload field name. Cleared on
  // every save attempt and repopulated from `issues.fieldErrors` on 400.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [addMediaOpen, setAddMediaOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isExistingProduct = Boolean(product?.id);
  const productId = product?.id ?? null;

  // Re-sync local state when the server component passes in a new product
  // snapshot (after router.refresh()). eslint flags setState-in-effect; the
  // cleaner fix would be a key-based remount on the parent, which is a
  // larger refactor deferred for now.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setCore(buildCoreState(product));
    setAdvanced(buildAdvancedState(product));
    setBuildGift(buildBuildGiftState(product));
    setMediaState(buildMediaState(product));
    setCategoryAssignments(buildAssignmentState(product?.categories ?? []));
    setCollectionAssignments(buildAssignmentState(product?.collections ?? []));
    setBridgeAssignments(buildAssignmentState(product?.bridgePages ?? []));
    setOptions(buildOptionsState(product));
  }, [product]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const assetIndex = useMemo(() => {
    const map = new Map<string, MediaAsset>();
    for (const asset of media) map.set(asset.id, asset);
    // Also index assets referenced by the current product in case they aren't
    // in the paginated library (shouldn't happen today, but future-proof).
    if (product) {
      if (product.primaryImage) {
        map.set(product.primaryImage.id, {
          id: product.primaryImage.id,
          url: product.primaryImage.url,
          altText: product.primaryImage.altText,
          kind: "IMAGE",
          width: null,
          height: null,
          createdAt: "",
        });
      }
      for (const m of product.media) {
        if (!map.has(m.asset.id)) {
          map.set(m.asset.id, {
            id: m.asset.id,
            url: m.asset.url,
            altText: m.asset.altText,
            kind: m.asset.kind as MediaAsset["kind"],
            width: null,
            height: null,
            createdAt: "",
          });
        }
      }
    }
    return map;
  }, [media, product]);

  const selectedMediaIds = useMemo(() => new Set(mediaState.items.map((i) => i.mediaAssetId)), [mediaState.items]);
  const selectedCategoryIds = useMemo(() => new Set(categoryAssignments.map((i) => i.id)), [categoryAssignments]);
  const selectedCollectionIds = useMemo(() => new Set(collectionAssignments.map((i) => i.id)), [collectionAssignments]);
  const selectedBridgePageIds = useMemo(() => new Set(bridgeAssignments.map((i) => i.id)), [bridgeAssignments]);

  // --- PERSIST HANDLERS ---

  const persistCore = (overrides?: { workflowStatus?: ProductWorkflowStatus }) => {
    startTransition(async () => {
      setNotice(null);
      setError(null);
      setFieldErrors({});

      let metadata: Record<string, unknown> = {};
      if (advanced.metadata.trim()) {
        try {
          metadata = JSON.parse(advanced.metadata) as Record<string, unknown>;
        } catch {
          setError("Metadata JSON is invalid.");
          setFieldErrors({ metadata: "Metadata must be valid JSON." });
          return;
        }
      }

      metadata.buildGift = {
        enabled: buildGift.enabled,
        section: buildGift.section,
      };

      // Strip thousands-commas from the price input ("4,499" → 4499) so users
      // can type naturally without tripping the server's integer validation.
      const priceRaw = String(core.priceAmount).replace(/,/g, "").trim();
      const priceAmount = priceRaw === "" ? NaN : Number(priceRaw);
      if (!Number.isFinite(priceAmount) || priceAmount < 0 || !Number.isInteger(priceAmount)) {
        setError("Price must be a whole number (e.g. 4499).");
        setFieldErrors({ priceAmount: "Price must be a whole number (e.g. 4499)." });
        return;
      }

      const effectiveWorkflow = overrides?.workflowStatus ?? core.workflowStatus;

      // Shipping dimensions are stored as text in the form so the inputs
      // can render an empty placeholder. Coerce back to number-or-null
      // for the wire payload; blank → null (use default at dispatch).
      const dimensionField = (raw: string): number | null => {
        const trimmed = raw.trim();
        if (!trimmed) return null;
        const n = Number(trimmed);
        return Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : null;
      };

      const payload = {
        ...core,
        workflowStatus: effectiveWorkflow,
        priceAmount,
        releaseDate: core.releaseDate ? new Date(core.releaseDate).toISOString() : null,
        metadata,
        primaryImageId: mediaState.primaryImageId || null,
        weightGrams: dimensionField(core.weightGrams),
        lengthCm: dimensionField(core.lengthCm),
        breadthCm: dimensionField(core.breadthCm),
        heightCm: dimensionField(core.heightCm),
        hsnCode: core.hsnCode.trim() || null,
      };

      const res = await fetch(isExistingProduct ? `/api/admin/proxy/products/${productId}` : "/api/admin/proxy/products", {
        method: isExistingProduct ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as
        | {
            error?: string;
            item?: { id: string };
            issues?: { fieldErrors?: Record<string, string[]> };
          }
        | null;

      if (!res.ok) {
        // Surface Zod per-field errors if the server provided them (400);
        // fall back to a single generic message otherwise (409 slug collision
        // maps the message onto the `slug` field so users see it in place).
        const nextFieldErrors: Record<string, string> = {};
        if (data?.issues?.fieldErrors) {
          for (const [field, messages] of Object.entries(data.issues.fieldErrors)) {
            if (messages && messages.length > 0) {
              nextFieldErrors[field] = messages[0];
            }
          }
        }
        if (res.status === 409 && data?.error) {
          nextFieldErrors.slug = data.error;
        }
        setFieldErrors(nextFieldErrors);
        setError(data?.error ?? "Unable to save product.");
        return;
      }

      // Local state gets the new workflow pill immediately; the effect above
      // will refresh it when the server snapshot returns.
      setCore((c) => ({ ...c, workflowStatus: effectiveWorkflow }));
      setNotice(isExistingProduct ? "Saved." : "Product created. Now configure media and relationships.");

      if (!isExistingProduct && data?.item?.id) {
        router.push(`/admin/products/${data.item.id}`);
      }

      router.refresh();
    });
  };

  const persistMedia = (nextState: { primaryImageId: string; items: GalleryItem[] } = mediaState) => {
    if (!productId) return;
    startTransition(async () => {
      setNotice(null);
      setError(null);

      const res = await fetch(`/api/admin/proxy/products/${productId}/media`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryImageId: nextState.primaryImageId || null,
          items: nextState.items,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Unable to save media.");
        return;
      }

      setNotice("Media saved.");
      router.refresh();
    });
  };

  const persistAssignments = async (
    path: string,
    assignments: Array<{ id: string; sortOrder: number }>,
    key: "categoryId" | "collectionId" | "bridgePageId",
    successMessage: string
  ) => {
    if (!productId) return;
    const res = await fetch(`/api/admin/proxy/products/${productId}/${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignments: assignments.map((e) => ({ [key]: e.id, sortOrder: e.sortOrder })),
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? `Unable to save ${path}.`);
    }
    setNotice(successMessage);
  };

  const persistSimpleAssignments = (
    path: string,
    assignments: Array<{ id: string; sortOrder: number }>,
    key: "categoryId" | "collectionId" | "bridgePageId",
    message: string
  ) => {
    startTransition(async () => {
      setNotice(null);
      setError(null);
      try {
        await persistAssignments(path, assignments, key, message);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to save assignments.");
      }
    });
  };

  // --- OPTIONS HANDLERS (unchanged from previous version) ---

  const updateOption = async (option: ProductOptionDraft) => {
    if (!productId) return;
    const res = await fetch(`/api/admin/proxy/product-options/${option.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        code: option.code,
        label: option.label,
        selectionMode: option.selectionMode,
        required: option.required,
        sortOrder: option.sortOrder,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Unable to save option.");
    }
  };

  const createOption = async () => {
    if (!productId) return;
    const res = await fetch("/api/admin/proxy/product-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        code: `option-${options.length + 1}`,
        label: "New Option",
        selectionMode: "SINGLE",
        required: false,
        sortOrder: options.length,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Unable to create option.");
    }
  };

  const deleteOption = async (optionId: string) => {
    const res = await fetch(`/api/admin/proxy/product-options/${optionId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Unable to delete option.");
    }
  };

  const createValue = async (optionId: string, index: number) => {
    const res = await fetch("/api/admin/proxy/product-option-values", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productOptionId: optionId,
        value: `value-${index + 1}`,
        label: "New Value",
        priceDeltaAmount: 0,
        sortOrder: index,
        isActive: true,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Unable to create option value.");
    }
  };

  const updateValue = async (value: ProductOptionDraft["values"][number], optionId: string) => {
    const res = await fetch(`/api/admin/proxy/product-option-values/${value.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productOptionId: optionId,
        value: value.value,
        label: value.label,
        priceDeltaAmount: value.priceDeltaAmount,
        sortOrder: value.sortOrder,
        isActive: true,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Unable to save option value.");
    }
  };

  const deleteValue = async (valueId: string) => {
    const res = await fetch(`/api/admin/proxy/product-option-values/${valueId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Unable to delete option value.");
    }
  };

  const removeProduct = () => {
    if (!productId) return;
    if (!window.confirm("Permanently delete this product? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/proxy/products/${productId}`, { method: "DELETE" });
      // if (!res.ok) {
      //   const data = (await res.json().catch(() => null)) as { error?: string } | null;
      //   setError(data?.error ?? "Unable to delete product.");
      //   return;
      // }
      router.push("/admin/products");
      router.refresh();
    });
  };

  // --- GALLERY HELPERS ---

  const attachMedia = (mediaAssetId: string) => {
    const next = {
      primaryImageId: mediaState.primaryImageId || mediaAssetId, // first attached becomes featured if none set
      items: [
        ...mediaState.items,
        {
          mediaAssetId,
          sortOrder: mediaState.items.length,
          mediaType: "GALLERY",
        },
      ],
    };
    setMediaState(next);
    persistMedia(next);
  };

  const removeFromGallery = (mediaAssetId: string) => {
    const next = {
      primaryImageId: mediaState.primaryImageId === mediaAssetId ? "" : mediaState.primaryImageId,
      items: mediaState.items
        .filter((i) => i.mediaAssetId !== mediaAssetId)
        .map((i, idx) => ({ ...i, sortOrder: idx })),
    };
    setMediaState(next);
    persistMedia(next);
  };

  const setPrimary = (mediaAssetId: string) => {
    const next = { ...mediaState, primaryImageId: mediaAssetId };
    setMediaState(next);
    persistMedia(next);
  };

  const reorderGallery = (items: GalleryItem[]) => {
    const next = { ...mediaState, items };
    setMediaState(next);
    persistMedia(next);
  };

  const changeMediaType = (mediaAssetId: string, mediaType: string) => {
    const next = {
      ...mediaState,
      items: mediaState.items.map((i) => (i.mediaAssetId === mediaAssetId ? { ...i, mediaType } : i)),
    };
    setMediaState(next);
    persistMedia(next);
  };

  // --- RENDER ---

  const primaryAsset = mediaState.primaryImageId ? assetIndex.get(mediaState.primaryImageId) : undefined;

  return (
    <div className="space-y-6">
      {notice ? (
        <p className="rounded-2xl border border-[#cde0d2] bg-[#eef8f0] px-4 py-3 text-[14px] text-[#2c6541]">{notice}</p>
      ) : null}
      {error ? (
        <p className="rounded-2xl border border-[#e7c1ba] bg-[#fff1ee] px-4 py-3 text-[14px] text-[#9f4332]">{error}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ─── MAIN COLUMN ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Title + descriptions */}
          <AdminCard>
            <h2 className="text-[18px] font-medium text-[#1d1916]">Product</h2>
            <div className="mt-4 grid gap-4">
              <AdminField label="Title" error={fieldErrors.title}>
                <input
                  value={core.title}
                  onChange={(e) => setCore((c) => ({ ...c, title: e.target.value }))}
                  className={`${adminInputClassName} text-[18px] font-medium`}
                  placeholder="Product title"
                />
              </AdminField>
              <AdminField
                label="Slug"
                hint="URL-safe identifier. Used in /shop/<slug>."
                error={fieldErrors.slug}
              >
                <input
                  value={core.slug}
                  onChange={(e) => setCore((c) => ({ ...c, slug: e.target.value }))}
                  className={adminInputClassName}
                  placeholder="product-slug"
                />
              </AdminField>
              <AdminField label="Short description">
                <textarea
                  rows={3}
                  value={core.shortDescription}
                  onChange={(e) => setCore((c) => ({ ...c, shortDescription: e.target.value }))}
                  className={adminTextareaClassName}
                />
              </AdminField>
              <AdminField label="Long description">
                <RichTextarea
                  value={core.longDescription}
                  onChange={(val) => setCore((c) => ({ ...c, longDescription: val }))}
                />
              </AdminField>
            </div>
          </AdminCard>

          {/* Taxonomy-ish fields */}
          <AdminCard>
            <h2 className="text-[18px] font-medium text-[#1d1916]">Classification</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <AdminField label="Type" error={fieldErrors.type}>
                <input
                  value={core.type}
                  onChange={(e) => setCore((c) => ({ ...c, type: e.target.value }))}
                  className={adminInputClassName}
                />
                {!isExistingProduct && defaultBridgeSlugForProductType(core.type) ? (
                  <p className="mt-2 text-[12px] leading-[1.6] text-[#6b6259]">
                    On save this will auto-assign to{" "}
                    <span className="font-medium text-[#2d2a26]">
                      /shop/{defaultBridgeSlugForProductType(core.type)}
                    </span>
                    . You can add or remove bridge pages below after the product is created.
                  </p>
                ) : null}
              </AdminField>
              <AdminField label="Material" error={fieldErrors.material}>
                <input
                  value={core.material}
                  onChange={(e) => setCore((c) => ({ ...c, material: e.target.value }))}
                  className={adminInputClassName}
                />
              </AdminField>
              <AdminField
                label="Use case"
                error={fieldErrors.useCase}
                hint="Used to group perfumes on /shop/perfumes."
              >
                <select
                  value={core.useCase}
                  onChange={(e) => setCore((c) => ({ ...c, useCase: e.target.value }))}
                  className={adminInputClassName}
                >
                  <option value="">—</option>
                  <option value="skin">skin</option>
                  <option value="cloth">cloth</option>
                  <option value="diffusion objects">diffusion objects</option>
                </select>
              </AdminField>
              <AdminField label="Release date">
                <input
                  type="datetime-local"
                  value={core.releaseDate}
                  onChange={(e) => setCore((c) => ({ ...c, releaseDate: e.target.value }))}
                  className={adminInputClassName}
                />
              </AdminField>
            </div>
          </AdminCard>

          {/* Product gallery */}
          <AdminCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-medium text-[#1d1916]">Product gallery</h2>
                <p className="mt-1 text-[12px] text-[#8a8075]">
                  Drag tiles to reorder. The featured image is used on the shop card.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddMediaOpen(true)}
                disabled={!isExistingProduct}
                className={adminSecondaryButtonClassName}
                title={isExistingProduct ? "" : "Save the product first to attach media."}
              >
                Add media
              </button>
            </div>
            <div className="mt-4">
              {isExistingProduct ? (
                <MediaGallery
                  items={mediaState.items}
                  assets={assetIndex}
                  primaryImageId={mediaState.primaryImageId}
                  onReorder={reorderGallery}
                  onRemove={removeFromGallery}
                  onSetPrimary={setPrimary}
                  onChangeType={changeMediaType}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-[#d7cec1] bg-[#fbf8f3] px-4 py-6 text-center text-[13px] text-[#8a8075]">
                  Save the product first, then you can attach media.
                </div>
              )}
            </div>
          </AdminCard>

          {/* Options — collapsible */}
          {isExistingProduct ? (
            <AdminCard>
              <details open={options.length > 0}>
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[18px] font-medium text-[#1d1916]">
                      Options &amp; variants
                      <span className="ml-2 text-[12px] font-normal text-[#8a8075]">({options.length})</span>
                    </h2>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        startTransition(async () => {
                          setNotice(null);
                          setError(null);
                          try {
                            await createOption();
                            setNotice("Option created.");
                            router.refresh();
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Unable to create option.");
                          }
                        });
                      }}
                      className={adminSecondaryButtonClassName}
                    >
                      Add option
                    </button>
                  </div>
                </summary>

                <div className="mt-4 space-y-4">
                  {options.length === 0 ? (
                    <p className="text-[13px] text-[#8a8075]">No options configured.</p>
                  ) : (
                    options.map((option, optionIndex) => (
                      <OptionEditor
                        key={option.id}
                        option={option}
                        optionIndex={optionIndex}
                        setOptions={setOptions}
                        canDelete={canDelete}
                        isPending={isPending}
                        onSaveOption={() =>
                          startTransition(async () => {
                            setNotice(null);
                            setError(null);
                            try {
                              await updateOption(option);
                              setNotice("Option saved.");
                              router.refresh();
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Unable to save option.");
                            }
                          })
                        }
                        onAddValue={() =>
                          startTransition(async () => {
                            setNotice(null);
                            setError(null);
                            try {
                              await createValue(option.id, option.values.length);
                              setNotice("Value created.");
                              router.refresh();
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Unable to create value.");
                            }
                          })
                        }
                        onDeleteOption={() =>
                          startTransition(async () => {
                            setNotice(null);
                            setError(null);
                            try {
                              await deleteOption(option.id);
                              setNotice("Option deleted.");
                              router.refresh();
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Unable to delete option.");
                            }
                          })
                        }
                        onSaveValue={(value) =>
                          startTransition(async () => {
                            setNotice(null);
                            setError(null);
                            try {
                              await updateValue(value, option.id);
                              setNotice("Value saved.");
                              router.refresh();
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Unable to save value.");
                            }
                          })
                        }
                        onDeleteValue={(valueId) =>
                          startTransition(async () => {
                            setNotice(null);
                            setError(null);
                            try {
                              await deleteValue(valueId);
                              setNotice("Value deleted.");
                              router.refresh();
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Unable to delete value.");
                            }
                          })
                        }
                      />
                    ))
                  )}
                </div>
              </details>
            </AdminCard>
          ) : null}

          {/* SEO — collapsible */}
          <AdminCard>
            <details>
              <summary className="cursor-pointer list-none">
                <h2 className="text-[18px] font-medium text-[#1d1916]">SEO &amp; call-to-action</h2>
              </summary>
              <div className="mt-4 grid gap-4">
                <AdminField label="SEO title">
                  <input
                    value={core.seoTitle}
                    onChange={(e) => setCore((c) => ({ ...c, seoTitle: e.target.value }))}
                    className={adminInputClassName}
                  />
                </AdminField>
                <AdminField label="SEO description">
                  <textarea
                    rows={3}
                    value={core.seoDescription}
                    onChange={(e) => setCore((c) => ({ ...c, seoDescription: e.target.value }))}
                    className={adminTextareaClassName}
                  />
                </AdminField>
                <AdminField label="Featured image alt">
                  <input
                    value={core.imageAlt}
                    onChange={(e) => setCore((c) => ({ ...c, imageAlt: e.target.value }))}
                    className={adminInputClassName}
                  />
                </AdminField>
                <AdminField label="CTA label">
                  <input
                    value={core.ctaLabel}
                    onChange={(e) => setCore((c) => ({ ...c, ctaLabel: e.target.value }))}
                    className={adminInputClassName}
                  />
                </AdminField>
              </div>
            </details>
          </AdminCard>

          {/* Advanced — collapsible */}
          <AdminCard>
            <details>
              <summary className="cursor-pointer list-none">
                <h2 className="text-[18px] font-medium text-[#1d1916]">Advanced metadata (JSON)</h2>
              </summary>
              <p className="mt-2 text-[12px] text-[#8a8075]">
                For catalog fields not yet modeled in the structured editor. Must be valid JSON.
              </p>
              <div className="mt-4">
                <textarea
                  rows={10}
                  value={advanced.metadata}
                  onChange={(e) => setAdvanced({ metadata: e.target.value })}
                  className={adminTextareaClassName}
                  placeholder="{}"
                />
              </div>
            </details>
          </AdminCard>
        </div>

        {/* ─── SIDEBAR ─────────────────────────────────────────────────── */}
        <aside className="space-y-6">
          {/* Publish panel */}
          <AdminCard>
            <h2 className="text-[14px] font-medium uppercase tracking-[0.16em] text-[#6a5d50]">Publish</h2>
            <div className="mt-3 flex items-center gap-2 text-[13px]">
              <span className="text-[#62574c]">Status</span>
              <AdminStatusBadge value={core.workflowStatus} />
            </div>
            {product?.publishedAt ? (
              <p className="mt-2 text-[11px] text-[#8a8075]">
                First published {new Date(product.publishedAt).toLocaleString()}
              </p>
            ) : null}

            <div className="mt-4 flex flex-col gap-2">
              {isExistingProduct ? (
                <>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => persistCore({ workflowStatus: "PUBLISHED" })}
                    className={adminButtonClassName}
                  >
                    {core.workflowStatus === "PUBLISHED" ? "Update" : "Publish"}
                  </button>
                  {core.workflowStatus === "PUBLISHED" ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => persistCore({ workflowStatus: "DRAFT" })}
                      className={adminSecondaryButtonClassName}
                    >
                      Move to draft
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => persistCore({ workflowStatus: "DRAFT" })}
                      className={adminSecondaryButtonClassName}
                    >
                      Save draft
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => persistCore({ workflowStatus: "DRAFT" })}
                  className={adminButtonClassName}
                >
                  Create as draft
                </button>
              )}

              {isExistingProduct && canDelete ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={removeProduct}
                  className={adminDangerButtonClassName}
                >
                  Delete product
                </button>
              ) : null}
            </div>

            {isExistingProduct && core.workflowStatus === "PUBLISHED" ? (
              <a
                href={`/shop/${core.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block text-center text-[12px] text-[#2e4a36] hover:underline"
              >
                View on storefront →
              </a>
            ) : null}
          </AdminCard>

          {/* Stock / price panel */}
          <AdminCard>
            <h2 className="text-[14px] font-medium uppercase tracking-[0.16em] text-[#6a5d50]">Stock &amp; price</h2>
            <div className="mt-4 space-y-4">
              <AdminField label="Stock status">
                <select
                  value={core.status}
                  onChange={(e) => setCore((c) => ({ ...c, status: e.target.value }))}
                  className={adminInputClassName}
                >
                  {stockStatusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </AdminField>
              <div className="grid grid-cols-[1fr_90px] gap-3">
                <AdminField label="Price" error={fieldErrors.priceAmount}>
                  <input
                    type="number"
                    value={core.priceAmount}
                    onChange={(e) => setCore((c) => ({ ...c, priceAmount: Number(e.target.value) }))}
                    className={adminInputClassName}
                  />
                </AdminField>
                <AdminField label="Currency">
                  <input
                    value={core.currency}
                    onChange={(e) => setCore((c) => ({ ...c, currency: e.target.value }))}
                    className={adminInputClassName}
                  />
                </AdminField>
              </div>
            </div>
          </AdminCard>

          {/* Shipping dimensions (Shiprocket). Leaving any field blank
              uses the default in /admin/shipping at dispatch time. */}
          <AdminCard>
            <h2 className="text-[14px] font-medium uppercase tracking-[0.16em] text-[#6a5d50]">Shipping dimensions</h2>
            <p className="mt-2 text-[12px] leading-[1.7] text-[#8a8075]">
              Used by Shiprocket when an order ships. Blank fields fall back to the defaults in <span className="font-mono">/admin/shipping</span>.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <AdminField label="Weight (grams)">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={core.weightGrams}
                  onChange={(e) => setCore((c) => ({ ...c, weightGrams: e.target.value }))}
                  className={adminInputClassName}
                />
              </AdminField>
              <AdminField label="HSN code">
                <input
                  value={core.hsnCode}
                  onChange={(e) => setCore((c) => ({ ...c, hsnCode: e.target.value }))}
                  className={adminInputClassName}
                />
              </AdminField>
              <AdminField label="Length (cm)">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={core.lengthCm}
                  onChange={(e) => setCore((c) => ({ ...c, lengthCm: e.target.value }))}
                  className={adminInputClassName}
                />
              </AdminField>
              <AdminField label="Breadth (cm)">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={core.breadthCm}
                  onChange={(e) => setCore((c) => ({ ...c, breadthCm: e.target.value }))}
                  className={adminInputClassName}
                />
              </AdminField>
              <AdminField label="Height (cm)">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={core.heightCm}
                  onChange={(e) => setCore((c) => ({ ...c, heightCm: e.target.value }))}
                  className={adminInputClassName}
                />
              </AdminField>
            </div>
          </AdminCard>

          {/* Featured image */}
          {isExistingProduct ? (
            <AdminCard>
              <h2 className="text-[14px] font-medium uppercase tracking-[0.16em] text-[#6a5d50]">Featured image</h2>
              <div className="mt-4">
                {primaryAsset ? (
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#efe6d4]">
                    <Image
                      src={primaryAsset.url}
                      alt={primaryAsset.altText ?? core.imageAlt}
                      fill
                      sizes="300px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-[#d7cec1] bg-[#fbf8f3] text-[12px] text-[#8a8075]">
                    No featured image
                  </div>
                )}
              </div>
              <p className="mt-2 text-[11px] text-[#8a8075]">
                Set via &quot;Set featured&quot; on any gallery tile.
              </p>
            </AdminCard>
          ) : null}

          {/* Build-A-Gift Inclusion */}
          <AdminCard>
            <h2 className="text-[14px] font-medium uppercase tracking-[0.16em] text-[#6a5d50]">Build-A-Gift Page</h2>
            <p className="mt-1 text-[12px] text-[#8a8075]">
              Choose whether this product appears on the /build-gift builder and in which section.
            </p>
            <label className="mt-4 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={buildGift.enabled}
                onChange={(e) => setBuildGift((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="h-4 w-4 rounded border-[#d7cec1] text-[#2d2824] focus:ring-0"
              />
              <span className="text-[13px] font-medium text-[#2d2824]">Show in Build-A-Gift page</span>
            </label>
            {buildGift.enabled ? (
              <div className="mt-3">
                <AdminField label="Section in Gift Box">
                  <select
                    value={buildGift.section}
                    onChange={(e) => setBuildGift((prev) => ({ ...prev, section: e.target.value }))}
                    className={adminInputClassName}
                  >
                    <option value="scarves-and-squares">Scarves &amp; Squares</option>
                    <option value="perfumes">Perfumes</option>
                    <option value="dokra-ornaments">Dokra Ornaments</option>
                    <option value="diffusers">Diffusers</option>
                  </select>
                </AdminField>
              </div>
            ) : null}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => persistCore()}
                disabled={isPending}
                className={adminButtonClassName}
              >
                {isPending ? "Saving..." : "Save gift setting"}
              </button>
            </div>
          </AdminCard>

          {/* Assignments: categories / collections / bridge pages */}
          {isExistingProduct ? (
            <>
              <AssignmentPanel
                title="Categories"
                items={categories.map((c) => ({ id: c.id, label: c.name, sublabel: c.kind.replaceAll("_", " ") }))}
                setAssignments={setCategoryAssignments}
                selectedIds={selectedCategoryIds}
                onSave={() => persistSimpleAssignments("categories", categoryAssignments, "categoryId", "Categories saved.")}
                isPending={isPending}
              />
              <AssignmentPanel
                title="Collections"
                items={collections.map((c) => ({ id: c.id, label: c.name, sublabel: c.kind.replaceAll("_", " ") }))}
                setAssignments={setCollectionAssignments}
                selectedIds={selectedCollectionIds}
                onSave={() => persistSimpleAssignments("collections", collectionAssignments, "collectionId", "Collections saved.")}
                isPending={isPending}
              />
              <AssignmentPanel
                title="Bridge pages"
                items={bridgePages.map((p) => ({ id: p.id, label: p.navLabel, sublabel: p.slug }))}
                setAssignments={setBridgeAssignments}
                selectedIds={selectedBridgePageIds}
                onSave={() => persistSimpleAssignments("bridge-pages", bridgeAssignments, "bridgePageId", "Bridge pages saved.")}
                isPending={isPending}
              />
            </>
          ) : null}
        </aside>
      </div>

      <div className="flex items-center justify-between">
        <Link href="/admin/products" className={adminSecondaryButtonClassName}>
          ← Back to products
        </Link>
      </div>

      <AddMediaDialog
        open={addMediaOpen}
        onClose={() => setAddMediaOpen(false)}
        library={media}
        alreadySelectedIds={selectedMediaIds}
        onSelect={attachMedia}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components (kept in this file to limit PR surface area)
// ────────────────────────────────────────────────────────────────────────────

function AssignmentPanel({
  title,
  items,
  setAssignments,
  selectedIds,
  onSave,
  isPending,
}: {
  title: string;
  items: Array<{ id: string; label: string; sublabel: string }>;
  setAssignments: (updater: (current: Array<{ id: string; sortOrder: number }>) => Array<{ id: string; sortOrder: number }>) => void;
  selectedIds: Set<string>;
  onSave: () => void;
  isPending: boolean;
}) {
  return (
    <AdminCard>
      <details open={selectedIds.size > 0}>
        <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-medium uppercase tracking-[0.16em] text-[#6a5d50]">
              {title}
              <span className="ml-2 text-[11px] normal-case tracking-normal text-[#8a8075]">({selectedIds.size})</span>
            </h2>
          </div>
        </summary>
        <div className="mt-4 space-y-2">
          {items.map((item) => {
            const checked = selectedIds.has(item.id);
            return (
              <label key={item.id} className="flex items-start gap-2 rounded-lg border border-[#ece2d2] bg-white px-3 py-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    setAssignments((current) =>
                      e.target.checked
                        ? [...current, { id: item.id, sortOrder: current.length }]
                        : current.filter((entry) => entry.id !== item.id)
                    )
                  }
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-[#1d1916]">{item.label}</div>
                  <div className="truncate text-[11px] text-[#8a8075]">{item.sublabel}</div>
                </div>
              </label>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className={`${adminSecondaryButtonClassName} mt-3 w-full`}
        >
          Save {title.toLowerCase()}
        </button>
      </details>
    </AdminCard>
  );
}

function OptionEditor({
  option,
  optionIndex,
  setOptions,
  canDelete,
  isPending,
  onSaveOption,
  onAddValue,
  onDeleteOption,
  onSaveValue,
  onDeleteValue,
}: {
  option: ProductOptionDraft;
  optionIndex: number;
  setOptions: React.Dispatch<React.SetStateAction<ProductOptionDraft[]>>;
  canDelete: boolean;
  isPending: boolean;
  onSaveOption: () => void;
  onAddValue: () => void;
  onDeleteOption: () => void;
  onSaveValue: (value: ProductOptionDraft["values"][number]) => void;
  onDeleteValue: (valueId: string) => void;
}) {
  const updateOptionField = <K extends keyof ProductOptionDraft>(field: K, value: ProductOptionDraft[K]) => {
    setOptions((current) => current.map((entry, i) => (i === optionIndex ? { ...entry, [field]: value } : entry)));
  };

  const updateValueField = <K extends keyof ProductOptionDraft["values"][number]>(
    valueIndex: number,
    field: K,
    value: ProductOptionDraft["values"][number][K]
  ) => {
    setOptions((current) =>
      current.map((entry, i) =>
        i === optionIndex
          ? {
              ...entry,
              values: entry.values.map((v, vi) => (vi === valueIndex ? { ...v, [field]: value } : v)),
            }
          : entry
      )
    );
  };

  return (
    <div className="rounded-2xl border border-[#ece2d2] bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminField label="Code">
          <input
            value={option.code}
            onChange={(e) => updateOptionField("code", e.target.value)}
            className={adminInputClassName}
          />
        </AdminField>
        <AdminField label="Label">
          <input
            value={option.label}
            onChange={(e) => updateOptionField("label", e.target.value)}
            className={adminInputClassName}
          />
        </AdminField>
        <AdminField label="Mode">
          <select
            value={option.selectionMode}
            onChange={(e) => updateOptionField("selectionMode", e.target.value as "SINGLE" | "MULTI")}
            className={adminInputClassName}
          >
            <option value="SINGLE">Single</option>
            <option value="MULTI">Multi</option>
          </select>
        </AdminField>
        <AdminField label="Sort">
          <input
            type="number"
            value={option.sortOrder}
            onChange={(e) => updateOptionField("sortOrder", Number(e.target.value))}
            className={adminInputClassName}
          />
        </AdminField>
      </div>
      <label className="mt-3 flex items-center gap-2 text-[12px] text-[#62574c]">
        <input
          type="checkbox"
          checked={option.required}
          onChange={(e) => updateOptionField("required", e.target.checked)}
        />
        Required selection
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onSaveOption} disabled={isPending} className={adminButtonClassName}>
          Save option
        </button>
        <button type="button" onClick={onAddValue} disabled={isPending} className={adminSecondaryButtonClassName}>
          Add value
        </button>
        {canDelete ? (
          <button type="button" onClick={onDeleteOption} disabled={isPending} className={adminDangerButtonClassName}>
            Delete option
          </button>
        ) : null}
      </div>

      {option.values.length > 0 ? (
        <div className="mt-4 space-y-3">
          {option.values.map((value, valueIndex) => (
            <div key={value.id} className="rounded-xl border border-[#ece2d2] bg-[#fbf8f3] p-3">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <AdminField label="Value">
                  <input
                    value={value.value}
                    onChange={(e) => updateValueField(valueIndex, "value", e.target.value)}
                    className={adminInputClassName}
                  />
                </AdminField>
                <AdminField label="Label">
                  <input
                    value={value.label}
                    onChange={(e) => updateValueField(valueIndex, "label", e.target.value)}
                    className={adminInputClassName}
                  />
                </AdminField>
                <AdminField label="Δ price">
                  <input
                    type="number"
                    value={value.priceDeltaAmount}
                    onChange={(e) => updateValueField(valueIndex, "priceDeltaAmount", Number(e.target.value))}
                    className={adminInputClassName}
                  />
                </AdminField>
                <AdminField label="Sort">
                  <input
                    type="number"
                    value={value.sortOrder}
                    onChange={(e) => updateValueField(valueIndex, "sortOrder", Number(e.target.value))}
                    className={adminInputClassName}
                  />
                </AdminField>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => onSaveValue(value)} disabled={isPending} className={adminButtonClassName}>
                  Save value
                </button>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => onDeleteValue(value.id)}
                    disabled={isPending}
                    className={adminDangerButtonClassName}
                  >
                    Delete value
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
