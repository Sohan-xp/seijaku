import { Prisma, ProductStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { sendAdminNotification } from "../lib/notifier.js";
import { prisma } from "../lib/prisma.js";
import { calculateShippingRate } from "../lib/shiprocket.js";
import {
  serializeArticle,
  serializeBridgePage,
  serializeBulkOrderInquiry,
  serializeProduct,
  serializeProductNotification,
  serializeProgram,
  serializeRetreat,
  serializeSiteSettings,
  serializeStory,
} from "../utils/serializers.js";
import { asyncHandler, parseBody } from "../utils/http.js";

export const publicRouter = Router();

const productQuerySchema = z.object({
  type: z.string().optional(),
  material: z.string().optional(),
  use_case: z.string().optional(),
  category: z.string().optional(),
  collection: z.string().optional(),
  availability: z.string().optional(),
  sort: z.enum(["recommended", "newest", "price_asc", "price_desc"]).optional(),
  search: z.string().optional(),
});

const orderRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productSlug: z.string().min(1),
        quantity: z.number().int().min(1).default(1),
        selectedOptions: z.record(z.string(), z.string()).optional(),
        variantSummary: z.string().optional(),
      })
    )
    .min(1),
});

const newsletterSchema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
});

const productNotificationSchema = z.object({
  productSlug: z.string().min(1).max(200),
  email: z.string().email().max(254),
  source: z.string().max(60).optional(),
});

const reservationSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  participantCount: z.number().int().min(1).optional(),
  partySize: z.number().int().min(1).optional(),
  notes: z.string().optional(),
  sessionId: z.string().optional(),
});

const bulkOrderInquirySchema = z.object({
  name: z.string().min(1, "Name is required"),
  companyName: z.string().optional(),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(6, "Phone number is required"),
  purpose: z.string().optional(),
  productInterests: z.string().optional(),
  estimatedQuantity: z.string().optional(),
  targetDate: z.string().optional(),
  customizationNotes: z.string().optional(),
  notes: z.string().optional(),
});

const shippingCalculationSchema = z.object({
  pincode: z.string().regex(/^[0-9]{6}$/, "Invalid pincode"),
  weightKg: z.number().positive("Weight must be positive"),
  lengthCm: z.number().min(0, "Length cannot be negative"),
  breadthCm: z.number().min(0, "Breadth cannot be negative"),
  heightCm: z.number().min(0, "Height cannot be negative"),
});

const productInclude = {
  primaryImage: true,
  media: { include: { mediaAsset: true } },
  options: { include: { values: true } },
  collections: { include: { collection: true } },
  categories: { include: { category: true } },
  bridgePages: { include: { bridgePage: true } },
} satisfies Prisma.ProductInclude;

function routeParam(req: { params: Record<string, string | string[] | undefined> }, key: string) {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseAvailability(input?: string) {
  if (!input) return undefined;

  const normalized = input.toUpperCase().replace(/\s+/g, "_");
  return ProductStatus[normalized as keyof typeof ProductStatus];
}

publicRouter.get(
  "/catalog/products",
  asyncHandler(async (req, res) => {
    const query = productQuerySchema.parse(req.query);
    const availability = parseAvailability(query.availability);

    const products = await prisma.product.findMany({
      where: {
        // Public catalog only returns PUBLISHED products. Draft products are
        // admin-only and must be inspected through /admin/* endpoints.
        workflowStatus: "PUBLISHED",
        ...(query.type ? { type: query.type } : {}),
        ...(query.material ? { material: query.material } : {}),
        ...(query.use_case ? { useCase: query.use_case } : {}),
        ...(availability ? { status: availability } : {}),
        ...(query.search
          ? {
              OR: [
                { title: { contains: query.search, mode: "insensitive" } },
                { shortDescription: { contains: query.search, mode: "insensitive" } },
                { longDescription: { contains: query.search, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(query.category
          ? {
              categories: {
                some: {
                  category: {
                    slug: query.category,
                  },
                },
              },
            }
          : {}),
        ...(query.collection
          ? {
              collections: {
                some: {
                  collection: {
                    slug: query.collection,
                  },
                },
              },
            }
          : {}),
      },
      include: productInclude,
      orderBy:
        query.sort === "newest"
          ? { releaseDate: "desc" }
          : query.sort === "price_asc"
            ? { priceAmount: "asc" }
            : query.sort === "price_desc"
              ? { priceAmount: "desc" }
              : [{ publishedAt: "desc" }, { title: "asc" }],
    });

    res.json({ items: products.map((p) => serializeProduct(p, { isPublic: true })) });
  })
);

publicRouter.get(
  "/catalog/products/:slug",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { slug: routeParam(req, "slug") },
      include: productInclude,
    });

    // Treat DRAFT products as non-existent from the public perspective so a
    // direct URL does not leak unpublished content.
    if (!product || product.workflowStatus !== "PUBLISHED") {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json({ item: serializeProduct(product, { isPublic: true }) });
  })
);

publicRouter.get(
  "/catalog/bridge-pages/:slug",
  asyncHandler(async (req, res) => {
    const page = await prisma.shopBridgePage.findUnique({
      where: { slug: routeParam(req, "slug") },
      include: {
        // Omit DRAFT products from public bridge pages so the shop UI does not
        // surface unpublished items through the bridge.
        products: {
          where: { product: { workflowStatus: "PUBLISHED" } },
          include: {
            product: {
              include: productInclude,
            },
          },
        },
      },
    });

    if (!page) {
      res.status(404).json({ error: "Bridge page not found" });
      return;
    }

    res.json({ item: serializeBridgePage(page, { isPublic: true }) });
  })
);

publicRouter.get(
  "/content/articles",
  asyncHandler(async (_req, res) => {
    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      include: { primaryImage: true },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
    });

    res.json({ items: articles.map(serializeArticle) });
  })
);

publicRouter.get(
  "/content/articles/:slug",
  asyncHandler(async (req, res) => {
    const article = await prisma.article.findUnique({
      where: { slug: routeParam(req, "slug") },
      include: { primaryImage: true },
    });

    if (!article) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    res.json({ item: serializeArticle(article) });
  })
);

publicRouter.get(
  "/content/retreats",
  asyncHandler(async (_req, res) => {
    const retreats = await prisma.retreat.findMany({
      where: { status: { not: "DRAFT" } },
      include: { primaryImage: true },
      orderBy: { name: "asc" },
    });

    res.json({ items: retreats.map(serializeRetreat) });
  })
);

publicRouter.get(
  "/content/retreats/:slug",
  asyncHandler(async (req, res) => {
    const retreat = await prisma.retreat.findUnique({
      where: { slug: routeParam(req, "slug") },
      include: { primaryImage: true },
    });

    if (!retreat || retreat.status === "DRAFT") {
      res.status(404).json({ error: "Retreat not found" });
      return;
    }

    res.json({ item: serializeRetreat(retreat) });
  })
);

publicRouter.get(
  "/content/programs",
  asyncHandler(async (_req, res) => {
    const programs = await prisma.program.findMany({
      where: { status: { not: "DRAFT" } },
      include: { sessions: true },
      orderBy: { name: "asc" },
    });

    res.json({ items: programs.map(serializeProgram) });
  })
);

publicRouter.get(
  "/content/programs/:slug",
  asyncHandler(async (req, res) => {
    const program = await prisma.program.findUnique({
      where: { slug: routeParam(req, "slug") },
      include: { sessions: true },
    });

    if (!program || program.status === "DRAFT") {
      res.status(404).json({ error: "Program not found" });
      return;
    }

    res.json({ item: serializeProgram(program) });
  })
);

// Latest active story whose launchDate has passed. Drives the home
// "How Seijaku Works" section. Returns 404 if no story qualifies — the
// frontend hides the section in that case (Decision #29).
publicRouter.get(
  "/content/story/current",
  asyncHandler(async (_req, res) => {
    const story = await prisma.story.findFirst({
      where: {
        status: "ACTIVE",
        launchDate: { lte: new Date() },
      },
      orderBy: { launchDate: "desc" },
      include: {
        perfume1: { include: productInclude },
        perfume2: { include: productInclude },
        perfume3: { include: productInclude },
        artifact1: { include: productInclude },
        artifact2: { include: productInclude },
        artifact3: { include: productInclude },
      },
    });

    if (!story) {
      res.status(404).json({ error: "No active story" });
      return;
    }

    res.json({ item: serializeStory(story) });
  })
);

publicRouter.get(
  "/content/site-settings",
  asyncHandler(async (_req, res) => {
    const settings = await prisma.siteSetting.findUnique({
      where: { key: "default" },
      include: { logoImage: true },
    });

    if (!settings) {
      res.status(404).json({ error: "Site settings not found" });
      return;
    }

    res.json({ item: serializeSiteSettings(settings) });
  })
);

publicRouter.post(
  "/lead/order-requests",
  asyncHandler(async (req, res) => {
    const payload = parseBody(orderRequestSchema, req.body);
    const productSlugs = payload.items.map((item) => item.productSlug);
    const products = await prisma.product.findMany({
      // Only allow orders against PUBLISHED products; draft slugs are treated
      // as non-existent from the public lead path.
      where: { slug: { in: productSlugs }, workflowStatus: "PUBLISHED" },
    });

    const bySlug = new Map(products.map((product) => [product.slug, product]));

    if (products.length !== productSlugs.length) {
      res.status(400).json({ error: "One or more products were not found" });
      return;
    }

    const orderRequest = await prisma.orderRequest.create({
      data: {
        email: payload.email,
        name: payload.name,
        phone: payload.phone,
        source: payload.source ?? "frontend-checkout",
        notes: payload.notes,
        items: {
          create: payload.items.map((item) => {
            const product = bySlug.get(item.productSlug)!;

            return {
              productId: product.id,
              quantity: item.quantity,
              unitPriceAmount: product.priceAmount,
              selectedOptionsJson: item.selectedOptions ?? undefined,
              variantSummary: item.variantSummary,
            };
          }),
        },
      },
      include: {
        items: true,
      },
    });

    res.status(201).json({ item: orderRequest });
  })
);

publicRouter.post(
  "/lead/newsletter-subscriptions",
  asyncHandler(async (req, res) => {
    const payload = parseBody(newsletterSchema, req.body);

    const subscription = await prisma.newsletterSubscription.upsert({
      where: { email: payload.email },
      update: {
        source: payload.source,
        status: "SUBSCRIBED",
      },
      create: {
        email: payload.email,
        source: payload.source ?? "site-footer",
      },
    });

    res.status(201).json({ item: subscription });
  })
);

publicRouter.post(
  "/lead/program-reservations",
  asyncHandler(async (req, res) => {
    const payload = parseBody(reservationSchema, req.body);
    const program = await prisma.program.findUnique({
      where: { slug: payload.slug },
    });

    if (!program) {
      res.status(404).json({ error: "Program not found" });
      return;
    }

    if (payload.sessionId) {
      const session = await prisma.programSession.findUnique({ where: { id: payload.sessionId } });
      if (!session || session.programId !== program.id) {
        res.status(400).json({ error: "Program session not found" });
        return;
      }
    }

    const reservation = await prisma.programReservation.create({
      data: {
        programId: program.id,
        programSessionId: payload.sessionId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        participantCount: payload.participantCount ?? 1,
        notes: payload.notes,
      },
    });

    res.status(201).json({ item: reservation });
  })
);

publicRouter.post(
  "/lead/product-notifications",
  asyncHandler(async (req, res) => {
    const payload = parseBody(productNotificationSchema, req.body);

    const product = await prisma.product.findUnique({
      where: { slug: payload.productSlug },
    });

    if (!product || product.workflowStatus !== "PUBLISHED") {
      res.status(400).json({ error: "Product not found" });
      return;
    }

    const notification = await prisma.productNotification.upsert({
      where: {
        productId_email: {
          productId: product.id,
          email: payload.email,
        },
      },
      update: {
        status: "NEW",
        source: payload.source ?? "product-card",
        notifiedAt: null,
      },
      create: {
        productId: product.id,
        email: payload.email,
        source: payload.source ?? "product-card",
      },
      include: {
        product: { select: { id: true, slug: true, title: true, status: true } },
      },
    });

    res.status(201).json({ item: serializeProductNotification(notification) });

    // Fire-and-forget admin ping. Runs after the response is flushed so a slow
    // or failing notifier never delays the user. Errors are swallowed — the
    // row is already persisted and will surface in /admin/leads regardless.
    void sendAdminNotification({
      notificationId: notification.id,
      productTitle: notification.product?.title ?? payload.productSlug,
      productSlug: payload.productSlug,
      customerEmail: payload.email,
    }).catch((error) => {
      console.warn("[notifier] admin ping failed", error);
    });
  })
);

publicRouter.post(
  "/lead/retreat-inquiries",
  asyncHandler(async (req, res) => {
    const payload = parseBody(reservationSchema, req.body);
    const retreat = await prisma.retreat.findUnique({
      where: { slug: payload.slug },
    });

    if (!retreat) {
      res.status(404).json({ error: "Retreat not found" });
      return;
    }

    const inquiry = await prisma.retreatInquiry.create({
      data: {
        retreatId: retreat.id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        partySize: payload.partySize ?? 1,
        notes: payload.notes,
      },
    });

    res.status(201).json({ item: inquiry });
  })
);

publicRouter.post(
  "/lead/bulk-orders",
  asyncHandler(async (req, res) => {
    const payload = parseBody(bulkOrderInquirySchema, req.body);

    const inquiry = await prisma.bulkOrderInquiry.create({
      data: {
        name: payload.name,
        companyName: payload.companyName || null,
        email: payload.email,
        phone: payload.phone,
        purpose: payload.purpose || null,
        productInterests: payload.productInterests || null,
        estimatedQuantity: payload.estimatedQuantity || null,
        targetDate: payload.targetDate ? new Date(payload.targetDate) : null,
        customizationNotes: payload.customizationNotes || null,
        notes: payload.notes || null,
      },
    });

    res.status(201).json({ item: serializeBulkOrderInquiry(inquiry) });
  })
);

publicRouter.post(
  "/shipping/calculate",
  asyncHandler(async (req, res) => {
    const payload = parseBody(shippingCalculationSchema, req.body);

    try {
      const result = await calculateShippingRate({
        pincode: payload.pincode,
        weightKg: payload.weightKg,
        lengthCm: payload.lengthCm,
        breadthCm: payload.breadthCm,
        heightCm: payload.heightCm,
      });

      res.json({
        shippingCost: result.rate,
        estimatedDeliveryDays: result.estimatedDeliveryDays,
      });
    } catch (error) {
      // If Shiprocket fails, return a default shipping cost
      console.warn("[shipping] calculation failed", error);
      res.json({
        shippingCost: 100,
        estimatedDeliveryDays: "5-7",
      }); // default fallback
    }
  })
);
