declare var strapi: any;

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    if (!data.excerpt && data.content) {
      data.excerpt = extractExcerptFromContent(data.content);
    }
  },

  async beforeUpdate(event) {
    const { data } = event.params;

    // Check if we need to regenerate (checkbox checked) OR if it's missing
    const shouldRegenerate = data.regenerateExcerpt === true;
    const isMissing = !data.excerpt && data.content;

    if ((shouldRegenerate || isMissing) && data.content) {
      data.excerpt = extractExcerptFromContent(data.content);
      // Reset the switch so it doesn't regenerate next time automatically
      data.regenerateExcerpt = false;
    }
  },

  async afterCreate(event) {
    const { result } = event;
    if (result.publishedAt) {
      await updateTagsForArticle(result.id);
      // Trigger related articles update (for self + neighbors)
      // We explicitly allow propagation here as this is the primary update
      await handleRelatedArticlesUpdate(result.documentId, true);
    }
  },

  async afterUpdate(event) {
    const { result, params } = event;

    // Prevent infinite loops for internal relatedArticles updates.
    // We rely on an explicit context flag set by the related-articles service,
    // and keep the data-key check as an extra safeguard / backwards compatibility.
    const context = (params && (params as any).context) || {};
    if (context.skipRelatedLifecycle === true) {
      return;
    }

    const dataKeys = Object.keys(params?.data || {});
    if (dataKeys.length === 1 && dataKeys.includes("relatedArticles")) {
      return;
    }

    if (result.publishedAt) {
      await updateTagsForArticle(result.id);
      // Trigger related articles update (for self + neighbors)
      // We explicitly allow propagation here as this is the primary update
      await handleRelatedArticlesUpdate(result.documentId, true);
    }
  },
};

async function handleRelatedArticlesUpdate(
  articleId: string,
  shouldPropagate = true
) {
  try {
    const service = strapi.service("api::article.related-articles");
    if (!service) return;

    // 1. Update the current article
    await service.updateRelatedArticles(articleId);

    // If propagation is disabled, stop here.
    // This prevents cascading updates when we are already processing a neighbor.
    if (!shouldPropagate) {
      return;
    }

    // 2. Fan-out: Update 5 most recent articles that share tags
    // Get current article tags first
    const currentArticle = await strapi
      .documents("api::article.article")
      .findOne({
        documentId: articleId,
        populate: ["tags"],
      });

    if (
      !currentArticle ||
      !currentArticle.tags ||
      currentArticle.tags.length === 0
    ) {
      return;
    }

    const currentTagSlugs = currentArticle.tags.map((t) => t.slug);

    // Find recent neighbors
    const neighbors = await strapi.documents("api::article.article").findMany({
      status: "published",
      filters: {
        tags: {
          slug: {
            $in: currentTagSlugs,
          },
        },
        documentId: {
          $ne: articleId,
        },
      },
      sort: "publishedAt:desc",
      limit: 5,
    });

    // Update them
    // Use Promise.allSettled to prevent one failure from stopping others
    await Promise.allSettled(
      neighbors.map((article) =>
        service.updateRelatedArticles(article.documentId)
      )
    );
  } catch (error) {
    console.error(
      `Error in handleRelatedArticlesUpdate for ${articleId}:`,
      error
    );
  }
}

async function updateTagsForArticle(articleId: number | string) {
  try {
    // Fetch the article with its tags
    const article = await strapi.entityService.findOne(
      "api::article.article",
      articleId,
      {
        populate: ["tags"],
      }
    );

    if (!article || !article.tags || article.tags.length === 0) {
      return;
    }

    const summaryService = strapi.service("api::tag.summary");

    // Trigger update for each tag
    // We use Promise.allSettled to ensure one failure doesn't stop others
    await Promise.allSettled(
      article.tags.map((tag) => summaryService.updateTagSummary(tag.documentId))
    );
  } catch (error) {
    console.error(
      `Error updating tag summaries for article ${articleId}:`,
      error
    );
  }
}

function extractExcerptFromContent(content?: string): string {
  if (!content) return "";

  // Split content by double line breaks to get paragraphs
  const paragraphs = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const firstTwo = paragraphs.slice(0, 2);

  const combined = firstTwo.join(" ");

  // Simple markdown removal: remove inline code, bold/italic, headings, images, links etc.
  return combined
    .replace(/`[^`]*`/g, "") // inline code
    .replace(/!?\[[^\]]*]\([^\)]*\)/g, "") // images & links
    .replace(/[#*_>~`]/g, "") // basic markdown chars
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}
