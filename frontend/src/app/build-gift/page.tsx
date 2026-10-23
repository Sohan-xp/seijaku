import { Suspense } from "react";
import { fetchProducts, type ProductView } from "@/src/lib/product-types";
import BuildGiftClient from "./components/BuildGiftClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const allProducts = await fetchProducts({ cache: "no-store", revalidate: 0 }).catch(
    () => [] as ProductView[],
  );

  // Show ONLY those products which are added/enabled by the admin in the portal.
  const products = allProducts.filter((p) => Boolean(p.buildGift?.enabled));

  return (
    <Suspense fallback={null}>
      <BuildGiftClient products={products} />
    </Suspense>
  );
}