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
    }
  },

  async afterUpdate(event) {
    const { result } = event;
    if (result.publishedAt) {
      await updateTagsForArticle(result.id);
    }
  },
};

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
