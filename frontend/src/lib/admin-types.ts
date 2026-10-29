export type AdminRole = "SUPER_ADMIN" | "EDITOR";

export type AdminIdentity = {
  id: string;
  email: string;
  role: AdminRole;
  status: "ACTIVE" | "DISABLED";
};

export type MediaAsset = {
  id: string;
  url: string;
  altText: string | null;
  kind: "IMAGE" | "VIDEO" | "DOCUMENT";
  width: number | null;
  height: number | null;
  createdAt: string;
};

export type ProductCategory = {
  id: string;
  slug: string;
  name: string;
  kind: "SHOP_BRIDGE" | "PROGRAM" | "RETREAT";
  createdAt: string;
  updatedAt: string;
};

export type CollectionSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: "CORE_COLLECTION" | "SEASONAL_DROP" | "HEMANTA";
  products: Array<{
    id: string;
    sortOrder: number;
    product: { id: string; slug: string; title: string } | null;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type ProductWorkflowStatus = "DRAFT" | "PUBLISHED";

export type ProductSummary = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  longDescription: string | null;
  type: string;
  material: string;
  useCase: string | null;
  priceAmount: number;
  currency: string;
  status: string;
  workflowStatus: ProductWorkflowStatus;
  releaseDate: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  imageAlt: string | null;
  ctaLabel: string | null;
  metadata: Record<string, unknown> | null;
  weightGrams: number | null;
  lengthCm: number | null;
  breadthCm: number | null;
  heightCm: number | null;
  hsnCode: string | null;
  primaryImage: { id: string; url: string; altText: string | null } | null;
  media: Array<{
    id: string;
    type: string;
    sortOrder: number;
    asset: {
      id: string;
      url: string;
      altText: string | null;
      kind: string;
    };
  }>;
  options: Array<{
    id: string;
    code: string;
    label: string;
    selectionMode: "SINGLE" | "MULTI";
    required: boolean;
    sortOrder: number;
    metadata: Record<string, unknown> | null;
    values: Array<{
      id: string;
      value: string;
      label: string;
      priceDeltaAmount: number;
      sortOrder: number;
      stock?: number;
      isActive?: boolean;
    }>;
  }>;
  categories: Array<{ id: string; slug: string; name: string; kind: string; sortOrder: number }>;
  collections: Array<{ id: string; slug: string; name: string; kind: string; sortOrder: number }>;
  bridgePages: Array<{ id: string; slug: string; navLabel: string; sortOrder: number }>;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type BridgePage = {
  id: string;
  slug: string;
  navLabel: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string[];
  heroImage: string;
  heroImageAlt: string;
  heroImagePosition: string | null;
  heroQuote: string;
  introEyebrow: string | null;
  introTitle: string;
  introDescription: string;
  interludeImage: string | null;
  interludeImageAlt: string | null;
  productSectionEyebrow: string | null;
  productSectionTitle: string | null;
  productSectionDescription: string | null;
  postCtaTitle: string | null;
  postCtaDescription: string | null;
  postCtaPrimaryLabel: string | null;
  postCtaPrimaryHref: string | null;
  postCtaSecondaryLabel: string | null;
  postCtaSecondaryHref: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoFootnote: string | null;
  content: Record<string, unknown> | null;
  products: ProductSummary[];
  createdAt: string;
  updatedAt: string;
};

export type Article = {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  bodyMarkdown: string | null;
  featured: boolean;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  primaryImage: { id: string; url: string; altText: string | null } | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Retreat = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  detailDescription: string;
  location: string;
  season: string;
  format: string;
  groupSize: string;
  status: "DRAFT" | "UPCOMING" | "INQUIRY_OPEN" | "CLOSED";
  primaryImage: { id: string; url: string; altText: string | null } | null;
  createdAt: string;
  updatedAt: string;
};

export type Program = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  detailDescription: string | null;
  durationLabel: string | null;
  groupSizeLabel: string | null;
  status: "DRAFT" | "UPCOMING" | "BOOKING_OPEN" | "CLOSED";
  sessions: ProgramSession[];
  createdAt: string;
  updatedAt: string;
};

export type ProgramSession = {
  id: string;
  programId: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  city: string;
  venueName: string | null;
  capacity: number;
  spotsRemaining: number;
  status: "UPCOMING" | "BOOKING_OPEN" | "FULL" | "CLOSED" | "CANCELLED";
  program?: { id: string; name: string; slug: string };
};

export type SiteSettings = {
  key: string;
  footerEmail: string | null;
  footerPhone: string | null;
  addressLines: string[] | null;
  newsletterHeading: string | null;
  newsletterBody: string | null;
  misc: Record<string, unknown> | null;
  logoImage: { id: string; url: string; altText: string | null } | null;
  createdAt: string;
  updatedAt: string;
};

export type StoryStatusAdmin = "ACTIVE" | "INACTIVE";

// Lightweight summary for the /admin/stories index table.
export type StorySummary = {
  id: string;
  launchDate: string;
  status: StoryStatusAdmin;
  videoUrl: string;
  perfumeTitles: string[];
  artifactTitles: string[];
  updatedAt: string;
};

// Slot-flat product reference for the StoryEditor product pickers.
export type StoryProductRef = {
  id: string;
  slug: string;
  title: string;
  bridgePages: { slug: string }[];
  primaryImage: { url: string } | null;
  status: string;
};

// Full story shape returned by GET /admin/stories/:id (includes the 6
// resolved products — same shape that serializeStory emits on the public
// side, but we carry the admin payload here for editor convenience).
export type StoryDetail = {
  id: string;
  launchDate: string;
  videoUrl: string;
  status: StoryStatusAdmin;
  perfumes: StoryProductRef[];
  artifacts: StoryProductRef[];
};
