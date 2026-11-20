"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useCustomerAuth } from "@/src/lib/customer-auth";

export type CartItem = {
  id: string; // generated from slug + variant + options
  productSlug: string;
  title: string;
  unitPrice: number;
  priceLabel?: string;
  quantity: number;
  image?: string;
  shortDescription?: string;
  variantLabel?: string | null;
  selectedOptions?: Record<string, string> | null;
  weightGrams?: number | null;
  lengthCm?: number | null;
  breadthCm?: number | null;
  heightCm?: number | null;
};

export type AddToCartPayload = {
  productSlug: string;
  title: string;
  unitPrice: number;
  priceLabel?: string;
  quantity?: number;
  image?: string;
  shortDescription?: string;
  variantLabel?: string | null;
  selectedOptions?: Record<string, string> | null;
  weightGrams?: number | null;
  lengthCm?: number | null;
  breadthCm?: number | null;
  heightCm?: number | null;
};

type ShopStateContextValue = {
  // Wishlist
  collection: string[];
  isCollected: (slug: string) => boolean;
  toggleCollection: (slug: string) => void;
  addToCollection: (slug: string) => void;
  removeFromCollection: (slug: string) => void;
  clearCollection: () => void;

  // Cart
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addToCart: (payload: AddToCartPayload, options?: { openDrawer?: boolean }) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  syncGiftBundleToCart: (items: AddToCartPayload[]) => void;

  // Direct checkout
  checkoutItemSlug: string | null;
  checkoutVariantLabel: string | null;
  checkoutSelectedOptions: Record<string, string> | null;
  beginCheckout: (slug: string, selection?: { label?: string | null; options?: Record<string, string> | null }) => void;
  clearCheckout: () => void;
};

const COLLECTION_KEY = "seijaku-collection";
const CART_KEY = "seijaku-cart-items";
const CHECKOUT_KEY = "seijaku-checkout-item";
const CHECKOUT_VARIANT_KEY = "seijaku-checkout-variant";
const CHECKOUT_OPTIONS_KEY = "seijaku-checkout-options";

function generateCartItemId(slug: string, variantLabel?: string | null, options?: Record<string, string> | null) {
  const optionsKey = options ? Object.entries(options).sort().map(([k, v]) => `${k}:${v}`).join("|") : "";
  return `${slug}__${variantLabel || "default"}__${optionsKey}`;
}

export function isGiftCartItem(item: CartItem): boolean {
  return Boolean(
    item.selectedOptions?.["Gift Packaging"] === "Festive Gift Box & Handwritten Card" ||
    item.selectedOptions?.["Gift Category"] ||
    item.variantLabel?.startsWith("[Gift Box")
  );
}

function readStorageCart(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem(CART_KEY);
    return value ? (JSON.parse(value) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function readStorageArray(key: string) {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as string[]) : [];
  } catch {
    return [] as string[];
  }
}

function readStorageString(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(key);
}

function readStorageRecord(key: string) {
  if (typeof window === "undefined") {
    return null as Record<string, string> | null;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as Record<string, string>) : null;
  } catch {
    return null as Record<string, string> | null;
  }
}

const ShopStateContext = createContext<ShopStateContextValue | null>(null);

export function ShopStateProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useCustomerAuth();
  const [collection, setCollection] = useState<string[]>(() => readStorageArray(COLLECTION_KEY));
  const [cart, setCart] = useState<CartItem[]>(() => readStorageCart());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutItemSlug, setCheckoutItemSlug] = useState<string | null>(() => readStorageString(CHECKOUT_KEY));
  const [checkoutVariantLabel, setCheckoutVariantLabel] = useState<string | null>(() => readStorageString(CHECKOUT_VARIANT_KEY));
  const [checkoutSelectedOptions, setCheckoutSelectedOptions] = useState<Record<string, string> | null>(() => readStorageRecord(CHECKOUT_OPTIONS_KEY));
  const isSyncingRef = useRef(false);

  // Sync wishlist and cart with backend whenever customer logs in or token is active
  useEffect(() => {
    if (!token || !isAuthenticated || isSyncingRef.current) return;

    let cancelled = false;
    isSyncingRef.current = true;

    async function syncBackendState() {
      try {
        const localSlugs = readStorageArray(COLLECTION_KEY);
        const localCart = readStorageCart();

        const [wishlistRes, cartRes] = await Promise.all([
          fetch("/api/public/customer/wishlist/sync", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ slugs: localSlugs }),
          }),
          fetch("/api/public/customer/cart/sync", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              items: localCart.map((it) => ({
                productSlug: it.productSlug,
                quantity: it.quantity,
                variantLabel: it.variantLabel || null,
                selectedOptions: it.selectedOptions || null,
              })),
            }),
          }),
        ]);

        if (wishlistRes.ok && !cancelled) {
          const data = await wishlistRes.json();
          if (Array.isArray(data.slugs)) {
            setCollection(data.slugs);
            if (typeof window !== "undefined") {
              window.localStorage.setItem(COLLECTION_KEY, JSON.stringify(data.slugs));
            }
          }
        }

        if (cartRes.ok && !cancelled) {
          const cartData = await cartRes.json();
          if (Array.isArray(cartData.cart)) {
            setCart(cartData.cart);
            if (typeof window !== "undefined") {
              window.localStorage.setItem(CART_KEY, JSON.stringify(cartData.cart));
            }
          }
        }
      } catch (err) {
        console.error("Failed to sync customer state", err);
      } finally {
        isSyncingRef.current = false;
      }
    }

    syncBackendState();

    return () => {
      cancelled = true;
    };
  }, [token, isAuthenticated]);

  // Persist Wishlist
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
  }, [collection]);

  // Persist Cart
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  // Persist Checkout Item
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (checkoutItemSlug) {
      window.localStorage.setItem(CHECKOUT_KEY, checkoutItemSlug);
    } else {
      window.localStorage.removeItem(CHECKOUT_KEY);
    }
  }, [checkoutItemSlug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (checkoutVariantLabel) {
      window.localStorage.setItem(CHECKOUT_VARIANT_KEY, checkoutVariantLabel);
    } else {
      window.localStorage.removeItem(CHECKOUT_VARIANT_KEY);
    }
  }, [checkoutVariantLabel]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (checkoutSelectedOptions && Object.keys(checkoutSelectedOptions).length > 0) {
      window.localStorage.setItem(CHECKOUT_OPTIONS_KEY, JSON.stringify(checkoutSelectedOptions));
    } else {
      window.localStorage.removeItem(CHECKOUT_OPTIONS_KEY);
    }
  }, [checkoutSelectedOptions]);

  // Wishlist actions
  const toggleCollection = useCallback(
    (slug: string) => {
      const isAlreadyIn = collection.includes(slug);
      const updated = isAlreadyIn
        ? collection.filter((entry) => entry !== slug)
        : [...collection, slug];

      setCollection(updated);

      if (token) {
        if (isAlreadyIn) {
          fetch(`/api/public/customer/wishlist/${encodeURIComponent(slug)}`, {
            method: "DELETE",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }).catch((err) => console.error("Wishlist remove error", err));
        } else {
          fetch("/api/public/customer/wishlist", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ productSlug: slug }),
          }).catch((err) => console.error("Wishlist add error", err));
        }
      }
    },
    [collection, token]
  );

  const addToCollection = useCallback(
    (slug: string) => {
      if (!collection.includes(slug)) {
        toggleCollection(slug);
      }
    },
    [collection, toggleCollection]
  );

  const removeFromCollection = useCallback(
    (slug: string) => {
      if (collection.includes(slug)) {
        toggleCollection(slug);
      }
    },
    [collection, toggleCollection]
  );

  const clearCollection = useCallback(() => {
    setCollection([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(COLLECTION_KEY);
    }
  }, []);

  // Cart actions
  const addToCart = useCallback(
    (payload: AddToCartPayload, options?: { openDrawer?: boolean }) => {
      const {
        productSlug,
        title,
        unitPrice,
        priceLabel,
        quantity = 1,
        image,
        shortDescription,
        variantLabel,
        selectedOptions,
        weightGrams,
        lengthCm,
        breadthCm,
        heightCm,
      } = payload;

      const itemId = generateCartItemId(productSlug, variantLabel, selectedOptions);

      setCart((prevCart) => {
        const existingIndex = prevCart.findIndex((item) => item.id === itemId);
        if (existingIndex > -1) {
          const updated = [...prevCart];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + quantity,
          };
          return updated;
        }

        const newItem: CartItem = {
          id: itemId,
          productSlug,
          title,
          unitPrice,
          priceLabel,
          quantity,
          image,
          shortDescription,
          variantLabel: variantLabel || null,
          selectedOptions: selectedOptions || null,
          weightGrams: weightGrams ?? null,
          lengthCm: lengthCm ?? null,
          breadthCm: breadthCm ?? null,
          heightCm: heightCm ?? null,
        };

        return [...prevCart, newItem];
      });

      if (token) {
        fetch("/api/public/customer/cart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productSlug,
            quantity,
            variantLabel: variantLabel || null,
            selectedOptions: selectedOptions || null,
          }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.cart && Array.isArray(data.cart)) {
              setCart(data.cart);
            }
          })
          .catch((err) => console.error("Cart add error", err));
      }

      if (options?.openDrawer !== false) {
        setIsCartOpen(true);
      }
    },
    [token]
  );

  const removeFromCart = useCallback(
    (cartItemId: string) => {
      let removedGiftSlug: string | null = null;
      setCart((prevCart) => {
        const itemToRemove = prevCart.find((item) => item.id === cartItemId);
        if (itemToRemove && isGiftCartItem(itemToRemove)) {
          removedGiftSlug = itemToRemove.productSlug;
        }
        return prevCart.filter((item) => item.id !== cartItemId);
      });

      if (removedGiftSlug && typeof window !== "undefined") {
        setTimeout(() => {
          try {
            window.dispatchEvent(
              new CustomEvent("seijaku-gift-cart-removed", {
                detail: { productSlug: removedGiftSlug },
              })
            );
          } catch {}
        }, 0);
      }

      if (token) {
        fetch(`/api/public/customer/cart/item/${encodeURIComponent(cartItemId)}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.cart && Array.isArray(data.cart)) {
              setCart(data.cart);
            }
          })
          .catch((err) => console.error("Cart remove error", err));
      }
    },
    [token]
  );

  const syncGiftBundleToCart = useCallback(
    (giftPayloads: AddToCartPayload[]) => {
      setCart((prevCart) => {
        const nonGiftItems = prevCart.filter((item) => !isGiftCartItem(item));

        const newGiftCartItems: CartItem[] = [];
        for (const payload of giftPayloads) {
          const {
            productSlug,
            title,
            unitPrice,
            priceLabel,
            quantity = 1,
            image,
            shortDescription,
            variantLabel,
            selectedOptions,
            weightGrams,
            lengthCm,
            breadthCm,
            heightCm,
          } = payload;

          const itemId = generateCartItemId(productSlug, variantLabel, selectedOptions);
          const existing = newGiftCartItems.find((c) => c.id === itemId);
          if (existing) {
            existing.quantity += quantity;
          } else {
            newGiftCartItems.push({
              id: itemId,
              productSlug,
              title,
              unitPrice,
              priceLabel,
              quantity,
              image,
              shortDescription,
              variantLabel: variantLabel || null,
              selectedOptions: selectedOptions || null,
              weightGrams: weightGrams ?? null,
              lengthCm: lengthCm ?? null,
              breadthCm: breadthCm ?? null,
              heightCm: heightCm ?? null,
            });
          }
        }

        const nextCart = [...nonGiftItems, ...newGiftCartItems];

        // Bail out if cart is already identical to prevent redundant re-renders
        if (
          prevCart.length === nextCart.length &&
          prevCart.every(
            (item, idx) => item.id === nextCart[idx]?.id && item.quantity === nextCart[idx]?.quantity
          )
        ) {
          return prevCart;
        }

        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(CART_KEY, JSON.stringify(nextCart));
          } catch {}
        }

        return nextCart;
      });

      if (token) {
        try {
          const localCart = readStorageCart();
          const nonGift = localCart.filter((item) => !isGiftCartItem(item));
          const updatedItems = [
            ...nonGift.map((it) => ({
              productSlug: it.productSlug,
              quantity: it.quantity,
              variantLabel: it.variantLabel || null,
              selectedOptions: it.selectedOptions || null,
            })),
            ...giftPayloads.map((it) => ({
              productSlug: it.productSlug,
              quantity: it.quantity || 1,
              variantLabel: it.variantLabel || null,
              selectedOptions: it.selectedOptions || null,
            })),
          ];

          fetch("/api/public/customer/cart/sync", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ items: updatedItems }),
          })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.cart && Array.isArray(data.cart)) {
                setCart(data.cart);
              }
            })
            .catch((err) => console.error("Gift cart sync error", err));
        } catch {}
      }
    },
    [token]
  );

  const updateCartQuantity = useCallback(
    (cartItemId: string, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(cartItemId);
        return;
      }

      let removedGiftSlug: string | null = null;
      setCart((prevCart) => {
        const existing = prevCart.find((item) => item.id === cartItemId);
        if (existing && isGiftCartItem(existing) && quantity < existing.quantity) {
          removedGiftSlug = existing.productSlug;
        }
        return prevCart.map((item) => (item.id === cartItemId ? { ...item, quantity } : item));
      });

      if (removedGiftSlug && typeof window !== "undefined") {
        setTimeout(() => {
          try {
            window.dispatchEvent(
              new CustomEvent("seijaku-gift-cart-removed", {
                detail: { productSlug: removedGiftSlug },
              })
            );
          } catch {}
        }, 0);
      }

      if (token) {
        fetch("/api/public/customer/cart/quantity", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            cartKey: cartItemId,
            quantity,
          }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.cart && Array.isArray(data.cart)) {
              setCart(data.cart);
            }
          })
          .catch((err) => console.error("Cart quantity update error", err));
      }
    },
    [token, removeFromCart]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CART_KEY);
      setTimeout(() => {
        try {
          window.dispatchEvent(new CustomEvent("seijaku-gift-cart-cleared"));
        } catch {}
      }, 0);
    }

    if (token) {
      fetch("/api/public/customer/cart", {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).catch((err) => console.error("Cart clear error", err));
    }
  }, [token]);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), []);

  // Cart counts & totals
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cart]
  );

  const value = useMemo<ShopStateContextValue>(
    () => ({
      // Wishlist
      collection,
      isCollected: (slug) => collection.includes(slug),
      toggleCollection,
      addToCollection,
      removeFromCollection,
      clearCollection,

      // Cart
      cart,
      cartCount,
      cartSubtotal,
      isCartOpen,
      openCart,
      closeCart,
      toggleCart,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      syncGiftBundleToCart,

      // Direct checkout
      checkoutItemSlug,
      checkoutVariantLabel,
      checkoutSelectedOptions,
      beginCheckout: (slug, selection) => {
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(CHECKOUT_KEY, slug);
            if (selection?.label) {
              window.localStorage.setItem(CHECKOUT_VARIANT_KEY, selection.label);
            } else {
              window.localStorage.removeItem(CHECKOUT_VARIANT_KEY);
            }
            if (selection?.options && Object.keys(selection.options).length > 0) {
              window.localStorage.setItem(CHECKOUT_OPTIONS_KEY, JSON.stringify(selection.options));
            } else {
              window.localStorage.removeItem(CHECKOUT_OPTIONS_KEY);
            }
          } catch {
            // Private browsing or storage disabled
          }
        }
        setCheckoutItemSlug(slug);
        setCheckoutVariantLabel(selection?.label ?? null);
        setCheckoutSelectedOptions(selection?.options ?? null);
      },
      clearCheckout: () => {
        if (typeof window !== "undefined") {
          try {
            window.localStorage.removeItem(CHECKOUT_KEY);
            window.localStorage.removeItem(CHECKOUT_VARIANT_KEY);
            window.localStorage.removeItem(CHECKOUT_OPTIONS_KEY);
          } catch {}
        }
        setCheckoutItemSlug(null);
        setCheckoutVariantLabel(null);
        setCheckoutSelectedOptions(null);
      },
    }),
    [
      collection,
      toggleCollection,
      addToCollection,
      removeFromCollection,
      clearCollection,
      cart,
      cartCount,
      cartSubtotal,
      isCartOpen,
      openCart,
      closeCart,
      toggleCart,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      syncGiftBundleToCart,
      checkoutItemSlug,
      checkoutVariantLabel,
      checkoutSelectedOptions,
    ]
  );

  return <ShopStateContext.Provider value={value}>{children}</ShopStateContext.Provider>;
}

export function useShopState() {
  const context = useContext(ShopStateContext);

  if (!context) {
    throw new Error("useShopState must be used within ShopStateProvider");
  }

  return context;
}
