/**
 * Gift-builder draft selection storage.
 *
 * Supports multiple product selections from any of the 4 gift categories:
 * - /shop/scarves-and-squares (scarves-and-squares)
 * - /shop/perfumes (perfumes)
 * - /shop/dokra-ornaments (dokra-ornaments)
 * - /shop/diffusers (diffusers)
 *
 * Configurable min/max product limits (default min: 2, max: 3).
 */

export type GiftStepKey =
    | "scarves-and-squares"
    | "perfumes"
    | "dokra-ornaments"
    | "diffusers";

export type ProductSelectionPayload = {
    label?: string | null;
    options?: Record<string, string> | null;
};

export type GiftItemSelection = {
    instanceId: string;
    productId: string;
    stepKey: GiftStepKey;
    options?: ProductSelectionPayload | null;
};

export type GiftCheckoutItem = {
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

export type GiftCheckoutBundle = {
    isGift: true;
    packaging: "festive";
    packagingTitle: string;
    giftNote?: string;
    total: number;
    items: GiftCheckoutItem[];
};

export const DEFAULT_MIN_GIFT_PRODUCTS = 3;
export const DEFAULT_MAX_GIFT_PRODUCTS = 3;

const STORAGE_KEY_V2 = "seijaku-gift-selection-v2";
const LEGACY_STORAGE_KEY = "seijaku-gift-selection";
export const GIFT_CHECKOUT_STORAGE_KEY = "seijaku-gift-checkout";

export function generateInstanceId(): string {
    return `gift-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Save all selected gift items to localStorage.
 */
export function setStoredGiftItems(items: GiftItemSelection[]): void {
    if (typeof window === "undefined") {
        return;
    }

    try {
        if (items.length === 0) {
            window.localStorage.removeItem(STORAGE_KEY_V2);
            window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        } else {
            window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(items));
        }
    } catch (error) {
        console.error("Unable to save gift selections to localStorage.", error);
    }
}

/**
 * Read all selected gift items from localStorage.
 * Backwards-compatible with legacy single-item-per-category draft format.
 */
export function getStoredGiftItems(): GiftItemSelection[] {
    if (typeof window === "undefined") {
        return [];
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY_V2);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed
                    .filter(
                        (item): item is GiftItemSelection =>
                            Boolean(
                                item &&
                                    typeof item === "object" &&
                                    typeof item.productId === "string" &&
                                    item.productId,
                            ),
                    )
                    .map((item) => ({
                        ...item,
                        instanceId: item.instanceId || generateInstanceId(),
                    }));
            }
        }

        // Backwards compatibility: check legacy storage
        const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyRaw) {
            const legacy = JSON.parse(legacyRaw) as Record<string, unknown>;
            const migrated: GiftItemSelection[] = [];

            const addIfValid = (key: GiftStepKey, val: unknown) => {
                if (typeof val === "string" && val.trim()) {
                    migrated.push({
                        instanceId: generateInstanceId(),
                        productId: val.trim(),
                        stepKey: key,
                        options: null,
                    });
                }
            };

            addIfValid(
                "scarves-and-squares",
                legacy["scarves-and-squares"] ?? legacy.textile,
            );
            addIfValid("perfumes", legacy.perfumes ?? legacy.scent);
            addIfValid(
                "dokra-ornaments",
                legacy["dokra-ornaments"] ?? legacy.dokra,
            );
            addIfValid("diffusers", legacy.diffusers);

            return migrated;
        }

        return [];
    } catch (error) {
        console.error(
            "Unable to read gift selections from localStorage.",
            error,
        );
        return [];
    }
}

/**
 * Clear stored gift selections.
 */
export function clearStoredGiftItems(): void {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.localStorage.removeItem(STORAGE_KEY_V2);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (error) {
        console.error(
            "Unable to clear gift selections from localStorage.",
            error,
        );
    }
}

export const clearGiftSelectionIds = clearStoredGiftItems;

/**
 * Save active gift bundle for checkout.
 */
export function setGiftCheckoutBundle(bundle: GiftCheckoutBundle): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(
            GIFT_CHECKOUT_STORAGE_KEY,
            JSON.stringify(bundle),
        );
    } catch (e) {
        console.error("Unable to store gift checkout bundle", e);
    }
}

/**
 * Retrieve active gift bundle for checkout.
 */
export function getGiftCheckoutBundle(): GiftCheckoutBundle | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(GIFT_CHECKOUT_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (
            parsed &&
            parsed.isGift &&
            Array.isArray(parsed.items) &&
            parsed.items.length > 0
        ) {
            return parsed as GiftCheckoutBundle;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Clear gift checkout bundle once order is created.
 */
export function clearGiftCheckoutBundle(): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.removeItem(GIFT_CHECKOUT_STORAGE_KEY);
    } catch {}
}
