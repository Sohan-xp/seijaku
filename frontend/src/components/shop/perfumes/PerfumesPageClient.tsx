"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { canonicalShopRoutes } from "@/src/lib/shop-routes";
import { type ProductView } from "@/src/lib/product-types";
import type { ShopBridgePageConfig } from "@/src/lib/bridge-page-types";

import PerfumeCategorySection from "./PerfumeCategorySection";
import PerfumePageIntro from "./PerfumePageIntro";

type PerfumesPageClientProps = {
  page: ShopBridgePageConfig;
  products: ProductView[];
};

type PerfumeSectionId = "skin" | "textiles" | "objects" | "other";

const sectionLinks: { id: PerfumeSectionId; label: string }[] = [
  { id: "skin", label: "Skin" },
  { id: "textiles", label: "Skin and Textiles" },
  { id: "objects", label: "Objects" },
];

type GroupedPerfumes = {
  skin: ProductView[];
  textiles: ProductView[];
  objects: ProductView[];
  other: ProductView[];
};

function groupByUseCase(products: ProductView[]): GroupedPerfumes {
  const buckets: GroupedPerfumes = { skin: [], textiles: [], objects: [], other: [] };
  for (const product of products) {
    switch (product.useCase) {
      case "skin":
        buckets.skin.push(product);
        break;
      case "cloth":
        buckets.textiles.push(product);
        break;
      case "diffusion objects":
        buckets.objects.push(product);
        break;
      default:
        buckets.other.push(product);
    }
  }
  return buckets;
}

export default function PerfumesPageClient({ page, products }: PerfumesPageClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedSlug = searchParams.get("item");
  const [activeSection, setActiveSection] = useState<PerfumeSectionId>("skin");

  const productsBySlug = useMemo(
    () => new Map(products.map((product) => [product.slug, product])),
    [products],
  );

  const selectedProduct = selectedSlug ? productsBySlug.get(selectedSlug) ?? null : null;

  const grouped = useMemo(() => groupByUseCase(products), [products]);

  const updateQuery = (slug?: string) => {
    if (slug) {
      router.push(`/shop/${slug}`);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const sectionIds: PerfumeSectionId[] = ["skin", "textiles", "objects", "other"];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (!elements.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];

        if (visible?.target?.id) {
          setActiveSection(visible.target.id as PerfumeSectionId);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.2, 0.35, 0.6],
      },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId: PerfumeSectionId) => {
    if (typeof window === "undefined") {
      return;
    }
    const element = document.getElementById(sectionId);
    if (!element) {
      return;
    }
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <main className="min-h-screen bg-[#f3efe7] pt-[72px] text-[#3a3a3a] sm:pt-[76px]">
        <PerfumePageIntro
          eyebrow={page.heroEyebrow}
          title={page.heroTitle}
          description={page.heroDescription}
          image={page.heroImage}
          imageAlt={page.heroImageAlt}
          imagePosition={page.heroImagePosition}
          quote={page.heroQuote}
        >
          <Link
            href="#skin"
            className="inline-flex items-center justify-center rounded-full bg-[#294536] px-6 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[#f4efe8] transition-colors duration-200 hover:bg-[#21382c]"
          >
            Explore the trilogy
          </Link>
          <Link
            href={canonicalShopRoutes.shopAll}
            className="text-[11px] uppercase tracking-[0.2em] text-[#5b5247] underline decoration-black/10 underline-offset-4 transition-opacity duration-200 hover:opacity-70"
          >
            Shop All
          </Link>
        </PerfumePageIntro>

        <nav className="sticky top-[72px] z-20 border-y border-black/5 bg-[rgba(243,239,231,0.92)] backdrop-blur-md sm:top-[76px]">
          <div className="page-container max-w-[1200px] flex items-center gap-7 overflow-x-auto py-4 text-[11px] uppercase tracking-[0.24em] text-[#6d6459] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sectionLinks.map((section) => {
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={`relative whitespace-nowrap pb-1 transition-colors duration-300 ${
                    active ? "text-[#2e4a36]" : "hover:text-[#302922]"
                  }`}
                >
                  {section.label}
                  <span
                    className={`absolute inset-x-0 -bottom-px h-px origin-left bg-[#2e4a36] transition-transform duration-300 ${
                      active ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </nav>

        <section className="section-primary pt-4 sm:pt-6" data-reveal>
          <div className="page-container max-w-[1200px]">
            <div className="space-y-1 border-t border-[rgba(79,71,63,0.08)]" />
          </div>

          <PerfumeCategorySection
            id="skin"
            eyebrow="FOR SKIN"
            title="A trilogy in three states"
            description="Breath. Body. Mind. Compositions to be worn, not displayed."
            categoryLabel="Skin"
            closingQuote="This is an evolving series. Future compositions will extend each state — Spirit 02, Body 02, Mind 02."
            products={grouped.skin}
            onViewDetails={updateQuery}
          />

          <PerfumeCategorySection
            id="textiles"
            eyebrow="For Skin and Textiles"
            title="Fragrance that stays with what you wear"
            description="Oil-based blends that settle into fabric and move with you."
            categoryLabel="SKIN OR FABRIC OR BOTH"
            closingQuote="Scent does not announce. It settles."
            products={grouped.textiles}
            onViewDetails={updateQuery}
          />

          <PerfumeCategorySection
            id="objects"
            eyebrow="FOR SPACES"
            title="Scent that inhabits space"
            description="Placed, not sprayed. Experienced, not announced."
            categoryLabel="Spaces"
            closingQuote="Space keeps what scent leaves behind."
            products={grouped.objects}
            onViewDetails={updateQuery}
          />

          {grouped.other.length > 0 ? (
            <PerfumeCategorySection
              id="other"
              eyebrow="UNCATEGORIZED"
              title="Set a use case to group these products"
              description="These products are missing a use case. Set Skin, Cloth, or Diffusion Objects in /admin/products to move them into the right section."
              categoryLabel="Other"
              products={grouped.other}
              onViewDetails={updateQuery}
            />
          ) : null}
        </section>

        {page.postCtaTitle ? (
          <section className="section-editorial pt-4 sm:pt-6">
            <div className="page-container max-w-[980px] text-center">
              <h2 className="text-[#1c1c1c]">{page.postCtaTitle}</h2>
              {page.postCtaDescription ? (
                <p className="mx-auto mt-4 max-w-[56ch] text-[16px] leading-[1.82] text-[#625b53]">
                  {page.postCtaDescription}
                </p>
              ) : null}
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
                {page.postCtaPrimaryLabel && page.postCtaPrimaryHref ? (
                  <Link
                    href={page.postCtaPrimaryHref}
                    className="inline-flex items-center justify-center rounded-full bg-[#2e4a36] px-7 py-4 text-[12px] font-medium uppercase tracking-[0.18em] text-[#f4efe8] hover:bg-[#243c2c]"
                  >
                    {page.postCtaPrimaryLabel}
                  </Link>
                ) : null}
                {page.postCtaSecondaryLabel && page.postCtaSecondaryHref ? (
                  <Link
                    href={page.postCtaSecondaryHref}
                    className="text-[12px] font-medium uppercase tracking-[0.18em] text-[#5e5549] underline decoration-black/10 underline-offset-4 hover:text-[#2e4a36]"
                  >
                    {page.postCtaSecondaryLabel}
                  </Link>
                ) : null}
              </div>
              {page.seoFootnote ? (
                <p className="mx-auto mt-12 max-w-[860px] text-xs leading-[1.9] text-[#847a6d]">{page.seoFootnote}</p>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
