// Shop domain taxonomy types, filter-option unions, matcher predicates, and
// the release-date lookup table. All pure / static — no dependency on the
// backend catalog. Consumed by product-types.ts (for ProductView's field
// types) and the shop filter UI (ShopAllPageClient, ShopFilterRail,
// ShopFilterDrawer). See Decision #26.

export type ShopItemType =
  | "Ritual Box"
  | "Perfume"
  | "Fragrance Oil"
  | "Wax Melt"
  | "Scarf / Square"
  | "Scarf"
  | "Square"
  | "Pocket Square"
  | "Diffuser"
  | "Dokra Ornament"
  | "Program"
  | "Retreat";

export type ShopMaterial =
  | "Composed Sets"
  | "Botanical Fragrance"
  | "Handwoven Textiles"
  | "Clay & Stone"
  | "Dokra Metal"
  | "Guided Experience";

export type ShopUseCase = "skin" | "cloth" | "diffusion objects";

export type ShopSortOption =
  | "Recommended"
  | "Newest"
  | "Price low to high"
  | "Price high to low";

export const sortOptions = [
  "Recommended",
  "Newest",
  "Price low to high",
  "Price high to low",
] as const;

export type ShopTypeFilterOption =
  // | "Fragrances"
  // | "Body"
  // | "Diffusers"
  // | "Objects"
  // | "Textiles"
  // | "Gift Sets"
  // | "For Yourself"
  // | "For a Loved One"
  // | "Dokra Ornaments"
  // | "Home Objects: Diffusers"
  // | "Scarves & Squares"
  // | "Programs"
  // | "Retreats"
  | "Diffusers"
  | "Dokra Ornaments"
  | "Textiles"
  | "Gift Sets"
  | "Perfumes and Fragrances";

export type ShopMaterialFilterOption =
  | "Oil-based Perfumes"
  | "Ethanol-based Perfumes"
  | "Clay & Stone"
  | "Dokra (Metal)"
  | "Handwoven textiles"
  | "Printed textiles";

const shopTypeFilterOptions: ShopTypeFilterOption[] = [
  // "Fragrances",
  // "Body",
  // "Diffusers",
  // "Objects",
  // "Textiles",
  // "Gift Sets",
  // "For Yourself",
  // "For a Loved One",
  // "Dokra Ornaments",
  // "Home Objects: Diffusers",
  // "Scarves & Squares",
  // "Programs",
  // "Retreats",
  "Diffusers",
  "Dokra Ornaments",
  "Textiles",
  "Gift Sets",
  "Perfumes and Fragrances",
];

const shopMaterialFilterOptions: ShopMaterialFilterOption[] = [
  "Oil-based Perfumes",
  "Ethanol-based Perfumes",
  "Clay & Stone",
  "Dokra (Metal)",
  "Handwoven textiles",
  "Printed textiles",
];

export function getShopTypes(): ShopTypeFilterOption[] {
  return shopTypeFilterOptions;
}

// Admin-form companion to the backend's defaultBridgeSlugForProductType in
// backend/src/lib/product-bridge.ts. Kept in sync by hand — if you add a
// rule here, update the backend too. Only used to surface a pre-save notice
// on /admin/products/new; the backend still makes the authoritative
// assignment on product create. See Decision #28.
export function defaultBridgeSlugForProductType(type: string): string | null {
  switch (type) {
    case "Perfume":
    case "Fragrance Oil":
      return "perfumes";
    case "Scarf / Square":
    case "Scarf":
    case "Square":
    case "Pocket Square":
      return "scarves-and-squares";
    case "Diffuser":
    case "Wax Melt":
      return "diffusers";
    case "Dokra Ornament":
      return "dokra-ornaments";
    case "Ritual Box":
      return "lifestyle";
    default:
      return null;
  }
}

export function getShopMaterials(): ShopMaterialFilterOption[] {
  return shopMaterialFilterOptions;
}

// Matchers take a structural subset so they can consume ProductView (or any
// caller's product shape) without forcing a circular import on product-types.
export function matchesShopTypeFilter(
  item: { type: string },
  selectedType: ShopTypeFilterOption | "All",
): boolean {
  if (selectedType === "All") return true;
  const t = (item.type || "").toLowerCase();
  if (selectedType === "Diffusers") return t.includes("diffuser") || t.includes("melt");
  if (selectedType === "Dokra Ornaments") return t.includes("dokra") || t.includes("ornament") || t.includes("brooch");
  if (selectedType === "Textiles") return t.includes("scarf") || t.includes("square") || t.includes("textile");
  if (selectedType === "Gift Sets") return t.includes("ritual") || t.includes("box") || t.includes("set");
  if (selectedType === "Perfumes and Fragrances") return t.includes("perfume") || t.includes("fragrance") || t.includes("attar") || t.includes("oil");
  return false;
}

export function matchesShopMaterialFilter(
  item: { type: ShopItemType; material: ShopMaterial },
  selectedMaterial: ShopMaterialFilterOption | "All",
): boolean {
  if (selectedMaterial === "All") return true;
  if (selectedMaterial === "Oil-based Perfumes" || selectedMaterial === "Ethanol-based Perfumes") return item.type === "Perfume";
  if (selectedMaterial === "Clay & Stone") return item.material === "Clay & Stone";
  if (selectedMaterial === "Dokra (Metal)") return item.material === "Dokra Metal";
  if (selectedMaterial === "Handwoven textiles" || selectedMaterial === "Printed textiles") return item.material === "Handwoven Textiles";
  return false;
}

export type ShopPriceFilterOption =
  | "Under ₹500"
  | "Under ₹1,000"
  | "Under ₹2,500"
  | "Premium Gifts";

const shopPriceFilterOptions: ShopPriceFilterOption[] = [
  "Under ₹500",
  "Under ₹1,000",
  "Under ₹2,500",
  "Premium Gifts",
];

export function getShopPrices(): ShopPriceFilterOption[] {
  return shopPriceFilterOptions;
}

export function matchesShopPriceFilter(
  item: { price: number },
  selectedPrice: ShopPriceFilterOption | "All",
): boolean {
  if (selectedPrice === "All") return true;
  if (selectedPrice === "Under ₹500") return item.price < 500;
  if (selectedPrice === "Under ₹1,000") return item.price < 1000;
  if (selectedPrice === "Under ₹2,500") return item.price < 2500;
  if (selectedPrice === "Premium Gifts") return item.price >= 2500;
  return false;
}


