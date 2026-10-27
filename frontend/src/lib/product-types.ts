import { publicBackendJson, type PublicFetchOptions } from "@/src/lib/backend";
import { cacheTags } from "@/src/lib/cache-tags";
import type { ShopBridgeSlug } from "@/src/lib/shop-routes";
import type { ShopItemType, ShopMaterial, ShopUseCase } from "@/src/lib/shop-taxonomy";

// ProductView is the read-only public product shape consumed by every
// frontend rendering surface. Defined inline here — ShopProduct (its former
// source via Omit) was deleted in Phase 4b.final (Decision #26).
export type ProductView = {
  id: string;
  slug: string;
  title: string;
  type: ShopItemType;
  material: ShopMaterial;
  bridgeCategory?: ShopBridgeSlug;
  useCase?: ShopUseCase;
  shortDescription?: string;
  longDescription?: string;
  price: number;
  heightCm: number;
  weightGrams: number;
  lengthCm: number;
  breadthCm: number;
  priceLabel: string;
  image: string;
  imageAlt?: string;
  gallery?: string[];
  videoUrl?: string;
  ctaLabel?: string;
  status?: string;
  releaseDate?: string | null;
  metadata?: Record<string, unknown> | null;
  buildGift?: {
    enabled: boolean;
    section: ShopBridgeSlug;
  };
  // Per-product variant pickers (e.g. colour tone, size, blend).
  customizationOptions?: Array<{
    label: string;
    values: string[];
    valuesWithPricing?: Array<{
      label: string;
      priceDelta: number;
      stock?: number;
    }>;
    required?: boolean;
  }>;
};

export type ProductOptionValueView = {
  label: string;
  priceDelta: number;
  stock?: number;
};

export type ProductCustomizationOptionView = NonNullable<ProductView["customizationOptions"]>[number];

export type BackendProductStatus =
  | "IN_STOCK"
  | "LIMITED_EDITION"
  | "UPCOMING"
  | "OPEN_FOR_BOOKING"
  | "SOLD_OUT"
  | "WAITLIST"
  | "BOOKING_OPEN";

type BackendProductMedia = {
  type: string;
  asset: {
    id: string;
    url: string;
    altText: string | null;
    kind: "IMAGE" | "VIDEO" | "DOCUMENT";
  };
};

type BackendProductOptionValue = {
  id?: string;
  label: string;
  value?: string;
  priceDeltaAmount?: number;
  stock?: number;
  isActive?: boolean;
};

type BackendProductOption = {
  id?: string;
  code?: string;
  label: string;
  required: boolean;
  values: BackendProductOptionValue[];
};

type BackendProductBridgePageRef = { slug: string };

export type BackendProduct = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  longDescription: string | null;
  type: string;
  material: string;
  useCase: string | null;
  priceAmount: number;
  heightCm: number;
  weightGrams: number;
  lengthCm: number;
  breadthCm: number;
  currency: string;
  status: BackendProductStatus;
  workflowStatus: "DRAFT" | "PUBLISHED";
  releaseDate: string | null;
  imageAlt: string | null;
  ctaLabel: string | null;
  primaryImage: { url: string; altText: string | null } | null;
  media: BackendProductMedia[];
  options: BackendProductOption[];
  bridgePages: BackendProductBridgePageRef[];
  metadata?: Record<string, unknown> | null;
};

const STATUS_DISPLAY: Record<BackendProductStatus, string> = {
  IN_STOCK: "In Stock",
  LIMITED_EDITION: "Limited Edition",
  UPCOMING: "Upcoming",
  OPEN_FOR_BOOKING: "Open for Booking",
  SOLD_OUT: "Sold Out",
  WAITLIST: "Waitlist",
  BOOKING_OPEN: "Booking Open",
};

const PLACEHOLDER_IMAGE = "/images/Home Page hero image 1.png";

export function productStatusToDisplay(status: BackendProductStatus): string {
  return STATUS_DISPLAY[status];
}

function formatPriceLabel(amount: number, currency: string): string {
  if (currency === "INR") {
    return `INR ${amount.toLocaleString("en-IN")}`;
  }
  return `${currency} ${amount.toLocaleString()}`;
}

// Drafts return null so caller can filter them out; everything else maps.
// `type`, `material`, `useCase`, `bridgeCategory` are asserted into the
// ProductView unions — free-text values outside the union still render
// correctly in page clients (they read the string verbatim).
export function normalizeBackendProduct(b: BackendProduct): ProductView | null {
  if (b.workflowStatus === "DRAFT") return null;

  const videoAsset = b.media.find((m) => m.asset.kind === "VIDEO")?.asset;
  const gallery = b.media
    .filter((m) => m.asset.kind === "IMAGE" && m.type !== "PRIMARY")
    .map((m) => m.asset.url);

  const image = b.primaryImage?.url ?? gallery[0] ?? PLACEHOLDER_IMAGE;
  const imageAlt = b.primaryImage?.altText ?? b.imageAlt ?? undefined;

  const rawBuildGift = (b.metadata?.buildGift ?? b.metadata?.build_gift) as
    | { enabled?: boolean; section?: string }
    | undefined;

  const buildGift = rawBuildGift?.enabled
    ? {
        enabled: true,
        section: (rawBuildGift.section || b.bridgePages[0]?.slug || "scarves-and-squares") as ShopBridgeSlug,
      }
    : undefined;

  const bridgeCategory = buildGift?.enabled && buildGift.section
    ? buildGift.section
    : ((b.bridgePages[0]?.slug ?? undefined) as ProductView["bridgeCategory"]);

  return {
    id: b.id,
    slug: b.slug,
    title: b.title,
    heightCm: b.heightCm,
    weightGrams: b.weightGrams,
    lengthCm: b.lengthCm,
    breadthCm: b.breadthCm,
    type: b.type as ProductView["type"],
    material: b.material as ProductView["material"],
    useCase: (b.useCase ?? undefined) as ProductView["useCase"],
    bridgeCategory,
    buildGift,
    metadata: b.metadata ?? null,
    shortDescription: b.shortDescription ?? undefined,
    longDescription: b.longDescription ?? undefined,
    price: b.priceAmount,
    priceLabel: formatPriceLabel(b.priceAmount, b.currency),
    image,
    imageAlt,
    gallery: gallery.length > 0 ? gallery : undefined,
    videoUrl: videoAsset?.url,
    ctaLabel: b.ctaLabel ?? undefined,
    status: STATUS_DISPLAY[b.status],
    releaseDate: b.releaseDate,
    customizationOptions: (() => {
      if (!b.options || b.options.length === 0) return undefined;
      const opts = b.options
        .map((o) => {
          const inStockValues = (o.values ?? []).filter(
            (v) => (v.stock === undefined || v.stock === null || v.stock > 0) && (v.isActive ?? true)
          );
          return {
            label: o.label,
            values: inStockValues.map((v) => v.label),
            valuesWithPricing: inStockValues.map((v) => ({
              label: v.label,
              priceDelta: v.priceDeltaAmount ?? 0,
              stock: v.stock,
            })),
            required: o.required || undefined,
          };
        })
        .filter((o) => o.values.length > 0);

      return opts.length > 0 ? opts : undefined;
    })(),
  };
}

export function normalizeBackendProducts(items: BackendProduct[]): ProductView[] {
  return items
    .map(normalizeBackendProduct)
    .filter((p): p is ProductView => p !== null);
}

// Fetches the full published catalog from the backend, normalized to the
// ProductView shape. /catalog/products already filters DRAFT server-side
// (backend/src/routes/public.ts), so the draft filter inside the normalizer
// is defensive.
export async function fetchProducts(options?: PublicFetchOptions): Promise<ProductView[]> {
  const { items } = await publicBackendJson<{ items: BackendProduct[] }>(
    "/catalog/products",
    { tags: [cacheTags.products], ...options },
  );
  return normalizeBackendProducts(items);
}

// Server-side per-slug fetch. Returns null when the backend returns a draft
// record or the slug is missing. Throws on transport failure — callers in
// server components can let that bubble to Next's error boundary.
export async function fetchProductBySlug(slug: string): Promise<ProductView | null> {
  try {
    // Backend wraps the product in { item: ... }; unwrap before normalizing
    // or normalizeBackendProduct sees missing fields and returns null.
    const { item } = await publicBackendJson<{ item: BackendProduct }>(
      `/catalog/products/${encodeURIComponent(slug)}`,
      { tags: [cacheTags.products] },
    );
    return normalizeBackendProduct(item);
  } catch {
    return null;
  }
}

// Derives the distinct use-case list from a given product list. Pure
// replacement for the old registry-derived `getShopUseCases()`.
// `getShopTypes()` / `getShopMaterials()` in shop-taxonomy.ts return curated
// filter-chip taxonomies (not derived from products).
export function collectUseCases(products: ProductView[]): ShopUseCase[] {
  const set = new Set<ShopUseCase>();
  for (const p of products) {
    if (p.useCase) set.add(p.useCase);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

// Product statuses that should surface the "Notify Me" CTA in place of Buy
// Now. Kept narrow on purpose — Sold Out / Upcoming stay as information-only
// badges (no capture form) per Decision #14.
export const notifiableStatuses = ["Waitlist"] as const;

export type NotifiableStatus = (typeof notifiableStatuses)[number];

// Statuses that completely suppress the primary CTA. The action row shows
// View Details + Wishlist only, with a short status label in the CTA slot.
export const unbuyableStatuses = ["Sold Out", "Upcoming"] as const;

export function isNotifyMeProduct(item: ProductView): boolean {
  return Boolean(item.status && (notifiableStatuses as readonly string[]).includes(item.status));
}

export function isUnbuyableProduct(item: ProductView): boolean {
  return Boolean(item.status && (unbuyableStatuses as readonly string[]).includes(item.status));
}

// Use-case fallback for products missing an explicit `useCase`. Derives from
// `type` via the editorial mapping kept with the domain taxonomy.
export function getShopProductUseCase(item: ProductView): ShopUseCase | undefined {
  if (item.useCase) return item.useCase;
  if (item.type === "Perfume") return "skin";
  if (item.type === "Scarf / Square" || item.type === "Scarf" || item.type === "Square" ) return "cloth";
  if (item.type === "Diffuser") return "diffusion objects";
  return undefined;
}

// Editorial suppression: keep this empty so all products with customization options show variants
export const slugsWithoutVariantSelector: ReadonlySet<string> = new Set([]);

export function hasVariantSelector(
  item: Pick<ProductView, "slug" | "customizationOptions">,
): boolean {
  if (slugsWithoutVariantSelector.has(item.slug)) return false;
  return Boolean(item.customizationOptions && item.customizationOptions.length > 0);
}
