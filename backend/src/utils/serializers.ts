export function serializeProduct(product: any, serializeOptions?: { isPublic?: boolean } | number) {
  const isPublic = typeof serializeOptions === "object" && serializeOptions !== null && Boolean(serializeOptions.isPublic);
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    shortDescription: product.shortDescription,
    longDescription: product.longDescription,
    type: product.type,
    material: product.material,
    useCase: product.useCase,
    priceAmount: product.priceAmount,
    currency: product.currency,
    status: product.status,
    workflowStatus: product.workflowStatus,
    releaseDate: product.releaseDate?.toISOString() ?? null,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    imageAlt: product.imageAlt,
    ctaLabel: product.ctaLabel,
    metadata: product.metadataJson,
    weightGrams: product.weightGrams ?? null,
    lengthCm: product.lengthCm ?? null,
    breadthCm: product.breadthCm ?? null,
    heightCm: product.heightCm ?? null,
    hsnCode: product.hsnCode ?? null,
    primaryImage: product.primaryImage
      ? {
          id: product.primaryImage.id,
          url: product.primaryImage.url,
          altText: product.primaryImage.altText,
        }
      : null,
    media: product.media
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
      .map((entry: any) => ({
        id: entry.id,
        type: entry.mediaType,
        sortOrder: entry.sortOrder,
        asset: {
          id: entry.mediaAsset.id,
          url: entry.mediaAsset.url,
          altText: entry.mediaAsset.altText,
          kind: entry.mediaAsset.kind,
        },
      })),
    options: (product.options ?? [])
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
      .map((option: any) => ({
        id: option.id,
        code: option.code,
        label: option.label,
        selectionMode: option.selectionMode,
        required: option.required,
        sortOrder: option.sortOrder,
        metadata: option.metadataJson,
        values: (option.values ?? [])
          .filter((value: any) => {
            if (!value.isActive) return false;
            if (isPublic && (value.stock === null || value.stock === undefined || value.stock <= 0)) {
              return false;
            }
            return true;
          })
          .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
          .map((value: any) => ({
            id: value.id,
            value: value.value,
            label: value.label,
            priceDeltaAmount: value.priceDeltaAmount,
            sortOrder: value.sortOrder,
            stock: value.stock ?? 0,
            isActive: value.isActive ?? true,
          })),
      }))
      .filter((option: any) => {
        if (isPublic && option.values.length === 0) {
          return false;
        }
        return true;
      }),
    categories: product.categories.map((entry: any) => ({
      id: entry.category.id,
      slug: entry.category.slug,
      name: entry.category.name,
      kind: entry.category.kind,
      sortOrder: entry.sortOrder,
    })),
    collections: product.collections.map((entry: any) => ({
      id: entry.collection.id,
      slug: entry.collection.slug,
      name: entry.collection.name,
      kind: entry.collection.kind,
      sortOrder: entry.sortOrder,
    })),
    bridgePages: (product.bridgePages ?? []).map((entry: any) => ({
      id: entry.bridgePage.id,
      slug: entry.bridgePage.slug,
      navLabel: entry.bridgePage.navLabel,
      sortOrder: entry.sortOrder,
    })),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    publishedAt: product.publishedAt?.toISOString() ?? null,
  };
}

export function serializeAdmin(admin: any) {
  return {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    status: admin.status,
    createdAt: admin.createdAt.toISOString(),
    updatedAt: admin.updatedAt.toISOString(),
  };
}

export function serializeMediaAsset(asset: any) {
  return {
    id: asset.id,
    url: asset.url,
    altText: asset.altText,
    kind: asset.kind,
    width: asset.width,
    height: asset.height,
    createdAt: asset.createdAt.toISOString(),
  };
}

export function serializeCategory(category: any) {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    kind: category.kind,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export function serializeCollection(collection: any) {
  return {
    id: collection.id,
    slug: collection.slug,
    name: collection.name,
    description: collection.description,
    kind: collection.kind,
    products: (collection.products ?? []).map((entry: any) => ({
      id: entry.id,
      sortOrder: entry.sortOrder,
      product: entry.product
        ? {
            id: entry.product.id,
            slug: entry.product.slug,
            title: entry.product.title,
          }
        : null,
    })),
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
  };
}

export function serializeBridgePage(page: any, serializeOptions?: { isPublic?: boolean } | number) {
  const isPublic = typeof serializeOptions === "object" && serializeOptions !== null && Boolean(serializeOptions.isPublic);
  return {
    id: page.id,
    slug: page.slug,
    navLabel: page.navLabel,
    heroEyebrow: page.heroEyebrow,
    heroTitle: page.heroTitle,
    heroDescription: page.heroDescriptionJson,
    heroImage: page.heroImage,
    heroImageAlt: page.heroImageAlt,
    heroImagePosition: page.heroImagePosition,
    heroQuote: page.heroQuote,
    introEyebrow: page.introEyebrow,
    introTitle: page.introTitle,
    introDescription: page.introDescription,
    interludeImage: page.interludeImage,
    interludeImageAlt: page.interludeImageAlt,
    productSectionEyebrow: page.productSectionEyebrow,
    productSectionTitle: page.productSectionTitle,
    productSectionDescription: page.productSectionDescription,
    postCtaTitle: page.postCtaTitle,
    postCtaDescription: page.postCtaDescription,
    postCtaPrimaryLabel: page.postCtaPrimaryLabel,
    postCtaPrimaryHref: page.postCtaPrimaryHref,
    postCtaSecondaryLabel: page.postCtaSecondaryLabel,
    postCtaSecondaryHref: page.postCtaSecondaryHref,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    seoFootnote: page.seoFootnote,
    content: page.contentJson,
    homeCard1Image: page.homeCard1Image,
    homeCard1Alt: page.homeCard1Alt,
    homeCard2Image: page.homeCard2Image,
    homeCard2Alt: page.homeCard2Alt,
    homeCard3Image: page.homeCard3Image,
    homeCard3Alt: page.homeCard3Alt,
    homeCard4Image: page.homeCard4Image,
    homeCard4Alt: page.homeCard4Alt,
    ritualVideo1Url: page.ritualVideo1Url,
    ritualVideo1Poster: page.ritualVideo1Poster,
    ritualVideo2Url: page.ritualVideo2Url,
    ritualVideo2Poster: page.ritualVideo2Poster,
    formCard1Image: page.formCard1Image,
    formCard1Alt: page.formCard1Alt,
    formCard2Image: page.formCard2Image,
    formCard2Alt: page.formCard2Alt,
    formCard3Image: page.formCard3Image,
    formCard3Alt: page.formCard3Alt,
    formCard4Image: page.formCard4Image,
    formCard4Alt: page.formCard4Alt,
    imageBreak1Image: page.imageBreak1Image,
    imageBreak1Alt: page.imageBreak1Alt,
    imageBreak2Image: page.imageBreak2Image,
    imageBreak2Alt: page.imageBreak2Alt,
    imageBreak3Image: page.imageBreak3Image,
    imageBreak3Alt: page.imageBreak3Alt,
    products: (page.products ?? []).sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((entry: any) => serializeProduct(entry.product, serializeOptions)),
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}

export function serializeArticle(article: any) {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    category: article.category,
    excerpt: article.excerpt,
    bodyMarkdown: article.bodyMarkdown,
    featured: article.featured,
    status: article.status,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    primaryImage: article.primaryImage
      ? {
          id: article.primaryImage.id,
          url: article.primaryImage.url,
          altText: article.primaryImage.altText,
        }
      : null,
    seoTitle: article.seoTitle,
    seoDescription: article.seoDescription,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };
}

export function serializeRetreat(retreat: any) {
  return {
    id: retreat.id,
    slug: retreat.slug,
    name: retreat.name,
    shortDescription: retreat.shortDescription,
    detailDescription: retreat.detailDescription,
    location: retreat.location,
    season: retreat.season,
    format: retreat.format,
    groupSize: retreat.groupSize,
    status: retreat.status,
    primaryImage: retreat.primaryImage
      ? {
          id: retreat.primaryImage.id,
          url: retreat.primaryImage.url,
          altText: retreat.primaryImage.altText,
        }
      : null,
    createdAt: retreat.createdAt.toISOString(),
    updatedAt: retreat.updatedAt.toISOString(),
  };
}

export function serializeProgram(program: any) {
  return {
    id: program.id,
    slug: program.slug,
    name: program.name,
    shortDescription: program.shortDescription,
    detailDescription: program.detailDescription,
    durationLabel: program.durationLabel,
    groupSizeLabel: program.groupSizeLabel,
    status: program.status,
    sessions: program.sessions
      .sort((a: any, b: any) => a.startsAt.getTime() - b.startsAt.getTime())
      .map((session: any) => ({
        id: session.id,
        startsAt: session.startsAt.toISOString(),
        endsAt: session.endsAt.toISOString(),
        timezone: session.timezone,
        city: session.city,
        venueName: session.venueName,
        capacity: session.capacity,
        spotsRemaining: session.spotsRemaining,
        status: session.status,
      })),
    createdAt: program.createdAt.toISOString(),
    updatedAt: program.updatedAt.toISOString(),
  };
}

export function serializeSiteSettings(settings: any) {
  return {
    key: settings.key,
    footerEmail: settings.footerEmail,
    footerPhone: settings.footerPhone,
    addressLines: settings.addressLinesJson,
    newsletterHeading: settings.newsletterHeading,
    newsletterBody: settings.newsletterBody,
    misc: settings.miscJson,
    logoImage: settings.logoImage
      ? {
          id: settings.logoImage.id,
          url: settings.logoImage.url,
          altText: settings.logoImage.altText,
        }
      : null,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export function serializeProductNotification(record: any) {
  return {
    id: record.id,
    email: record.email,
    source: record.source,
    status: record.status,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    notifiedAt: record.notifiedAt?.toISOString() ?? null,
    product: record.product
      ? {
          id: record.product.id,
          slug: record.product.slug,
          title: record.product.title,
          status: record.product.status,
        }
      : null,
  };
}

export function serializeStory(story: any, serializeOptions?: { isPublic?: boolean } | number) {
  const isPublic = typeof serializeOptions === "object" && serializeOptions !== null && Boolean(serializeOptions.isPublic);
  return {
    id: story.id,
    launchDate: story.launchDate.toISOString(),
    videoUrl: story.videoUrl,
    status: story.status,
    perfumes: [story.perfume1, story.perfume2, story.perfume3].filter(Boolean).map((p: any) => serializeProduct(p, serializeOptions)),
    artifacts: [story.artifact1, story.artifact2, story.artifact3].filter(Boolean).map((a: any) => serializeProduct(a, serializeOptions)),
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
  };
}

export function serializeOrderRequest(order: any) {
  return {
    id: order.id,
    email: order.email,
    name: order.name,
    phone: order.phone,
    source: order.source,
    status: order.status,
    notes: order.notes,
    paymentStatus: order.paymentStatus,
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId: order.razorpayPaymentId,
    totalAmount: order.totalAmount,
    currency: order.currency,
    shippingLine1: order.shippingLine1,
    shippingLine2: order.shippingLine2,
    shippingCity: order.shippingCity,
    shippingState: order.shippingState,
    shippingPincode: order.shippingPincode,
    shippingCountry: order.shippingCountry,
    shiprocketOrderId: order.shiprocketOrderId,
    shiprocketShipmentId: order.shiprocketShipmentId,
    awbCode: order.awbCode,
    courierName: order.courierName,
    trackingUrl: order.trackingUrl,
    shipmentStatus: order.shipmentStatus,
    shipmentError: order.shipmentError,
    shipmentPushedAt: order.shipmentPushedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: (order.items ?? []).map((item: any) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPriceAmount: item.unitPriceAmount,
      variantSummary: item.variantSummary,
      selectedOptionsJson: item.selectedOptionsJson ?? null,
      product: item.product
        ? {
            id: item.product.id,
            slug: item.product.slug,
            title: item.product.title,
            image: item.product.primaryImage?.url ?? null,
          }
        : null,
    })),
  };
}

export function serializeShippingSetting(setting: any) {
  return {
    id: setting.id,
    key: setting.key,
    pickupLocationName: setting.pickupLocationName,
    defaultWeightGrams: setting.defaultWeightGrams,
    defaultLengthCm: setting.defaultLengthCm,
    defaultBreadthCm: setting.defaultBreadthCm,
    defaultHeightCm: setting.defaultHeightCm,
    autoPushEnabled: setting.autoPushEnabled,
    lastTestedAt: setting.lastTestedAt?.toISOString() ?? null,
    lastTestStatus: setting.lastTestStatus,
    updatedAt: setting.updatedAt.toISOString(),
  };
}

// Lightweight summary for the admin index list — avoids dragging the full
// product include payload across the wire when only counts and titles are
// needed in the table.
export function serializeStorySummary(story: any) {
  return {
    id: story.id,
    launchDate: story.launchDate.toISOString(),
    status: story.status,
    videoUrl: story.videoUrl,
    perfumeTitles: [story.perfume1?.title, story.perfume2?.title, story.perfume3?.title].filter(Boolean),
    artifactTitles: [story.artifact1?.title, story.artifact2?.title, story.artifact3?.title].filter(Boolean),
    updatedAt: story.updatedAt.toISOString(),
  };
}

export function serializeCustomer(customer: any) {
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name ?? null,
    phone: customer.phone ?? null,
    status: customer.status,
    createdAt: customer.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: customer.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

export function serializeBulkOrderInquiry(inquiry: any) {
  return {
    id: inquiry.id,
    name: inquiry.name,
    companyName: inquiry.companyName ?? null,
    email: inquiry.email,
    phone: inquiry.phone,
    purpose: inquiry.purpose ?? null,
    productInterests: inquiry.productInterests ?? null,
    estimatedQuantity: inquiry.estimatedQuantity ?? null,
    targetDate: inquiry.targetDate?.toISOString() ?? null,
    customizationNotes: inquiry.customizationNotes ?? null,
    notes: inquiry.notes ?? null,
    status: inquiry.status,
    createdAt: inquiry.createdAt.toISOString(),
    updatedAt: inquiry.updatedAt.toISOString(),
    customer: inquiry.customer ? serializeCustomer(inquiry.customer) : null,
  };
}

export function serializeCartItem(cartItem: any) {
  const product = cartItem.product;
  const primaryImage = product?.primaryImage?.url || null;
  return {
    id: cartItem.cartKey || cartItem.id,
    cartItemId: cartItem.id,
    cartKey: cartItem.cartKey,
    productSlug: product?.slug ?? "",
    title: product?.title ?? "",
    unitPrice: product?.priceAmount ?? 0,
    priceLabel: product?.priceAmount !== undefined ? `₹${product.priceAmount.toLocaleString("en-IN")}` : undefined,
    quantity: cartItem.quantity,
    image: primaryImage,
    shortDescription: product?.shortDescription ?? null,
    variantLabel: cartItem.variantLabel ?? null,
    selectedOptions: (cartItem.selectedOptions as Record<string, string>) ?? null,
    weightGrams: product?.weightGrams ?? null,
    lengthCm: product?.lengthCm ?? null,
    breadthCm: product?.breadthCm ?? null,
    heightCm: product?.heightCm ?? null,
    createdAt: cartItem.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: cartItem.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}
