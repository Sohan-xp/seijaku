import { Suspense } from "react";
import { fetchProducts, type ProductView } from "@/src/lib/product-types";
import { fetchBridgePage } from "@/src/lib/bridge-page-types";
import BuildGiftClient from "./components/BuildGiftClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [allProducts, scarvesBridge, perfumesBridge, dokraBridge, diffusersBridge] =
    await Promise.all([
      fetchProducts({ cache: "no-store", revalidate: 0 }).catch(
        () => fetchProducts().catch(() => [] as ProductView[]),
      ),
      fetchBridgePage("scarves-and-squares").catch(() => null),
      fetchBridgePage("perfumes").catch(() => null),
      fetchBridgePage("dokra-ornaments").catch(() => null),
      fetchBridgePage("diffusers").catch(() => null),
    ]);

  const productMap = new Map<string, ProductView>();
  for (const product of allProducts) {
    productMap.set(product.id, product);
  }

  // Ensure products linked to each bridge page have their bridgeCategory tagged
  for (const product of scarvesBridge?.products ?? []) {
    const existing = productMap.get(product.id);
    productMap.set(product.id, {
      ...(existing ?? product),
      bridgeCategory: existing?.bridgeCategory ?? "scarves-and-squares",
    });
  }
  for (const product of perfumesBridge?.products ?? []) {
    const existing = productMap.get(product.id);
    productMap.set(product.id, {
      ...(existing ?? product),
      bridgeCategory: existing?.bridgeCategory ?? "perfumes",
    });
  }
  for (const product of dokraBridge?.products ?? []) {
    const existing = productMap.get(product.id);
    productMap.set(product.id, {
      ...(existing ?? product),
      bridgeCategory: existing?.bridgeCategory ?? "dokra-ornaments",
    });
  }
  for (const product of diffusersBridge?.products ?? []) {
    const existing = productMap.get(product.id);
    productMap.set(product.id, {
      ...(existing ?? product),
      bridgeCategory: existing?.bridgeCategory ?? "diffusers",
    });
  }

  const combinedProducts = Array.from(productMap.values());
  const enabledProducts = combinedProducts.filter((p) => Boolean(p.buildGift?.enabled));

  // Build the product list:
  // 1. Use admin-enabled products first.
  // 2. If any step lacks enabled products, backfill that step from combined bridge products so no section is ever empty.
  const products: ProductView[] = [...enabledProducts];
  const stepKeys = ["scarves-and-squares", "perfumes", "dokra-ornaments", "diffusers"] as const;

  for (const step of stepKeys) {
    const hasProductsForStep = products.some(
      (p) => (p.buildGift?.enabled && p.buildGift.section === step) || (!p.buildGift?.enabled && p.bridgeCategory === step),
    );
    if (!hasProductsForStep) {
      const fallbackForStep = combinedProducts.filter(
        (p) => p.bridgeCategory === step && !products.some((existing) => existing.id === p.id),
      );
      products.push(...fallbackForStep);
    }
  }

  const finalProducts = products.length > 0 ? products : combinedProducts;

  return (
    <Suspense fallback={null}>
      <BuildGiftClient products={finalProducts} />
    </Suspense>
  );
}