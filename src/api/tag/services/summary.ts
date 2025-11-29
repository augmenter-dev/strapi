import { ArticleBrief, generateTagSummary } from "../../../utils/ai-summarizer";

import { Core } from "@strapi/strapi";
import crypto from "crypto";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Generates a stable fingerprint from article sources for caching
   */
  fingerprintSources(
    tagSlug: string,
    sources: Array<{
      documentId: string;
      updatedAt?: string;
      publishedAt?: string;
      publicationDate?: string;
    }>
  ): string {
    const basis = sources
      .sort((a, b) => a.documentId.localeCompare(b.documentId))
      .map(
        (source) =>
          `${source.documentId}|${source.updatedAt || source.publicationDate || source.publishedAt || ""}`
      )
      .join("||");

    const hashInput = `${tagSlug}|${basis}`;
    return crypto.createHash("sha256").update(hashInput).digest("hex");
  },

  /**
   * Updates the summary for a specific tag if the content has changed
   */
  async updateTagSummary(tagDocumentId: string) {
    // 1. Fetch the tag
    const tag = await strapi.documents("api::tag.tag").findOne({
      documentId: tagDocumentId,
    });

    if (!tag) {
      console.warn(`Tag with documentId ${tagDocumentId} not found`);
      return;
    }
    // 2. Fetch recent articles for this tag
    const articles = await strapi.documents("api::article.article").findMany({
      status: "published",
      filters: {
        tags: {
          documentId: {
            $eq: tagDocumentId,
          },
        },
      },
      sort: ["publicationDate:desc", "publishedAt:desc"],
      limit: 5,
    });

    // 3. Prepare source data for fingerprinting
    const sourceData = articles.map((article) => ({
      documentId: article.documentId,
      updatedAt: article.updatedAt ? String(article.updatedAt) : undefined,
      publishedAt: article.publishedAt
        ? String(article.publishedAt)
        : undefined,
      publicationDate: article.publicationDate
        ? String(article.publicationDate)
        : undefined,
    }));

    // 3. Generate fingerprint
    const newFingerprint = this.fingerprintSources(tag.slug, sourceData);

    // 4. Check against existing cache key
    if (tag.summaryCacheKey === newFingerprint && tag.summary) {
      console.log(`Summary for tag "${tag.name}" is up to date (Cache Hit).`);
      return;
    }

    console.log(`Updating summary for tag "${tag.name}"...`);

    // 5. Generate new summary using AI
    const articleBriefs: ArticleBrief[] = articles.map((article) => ({
      title: article.title,
      description: (article.excerpt as string) || "", // Ensure description is string
      date: String(article.publicationDate || article.publishedAt),
      url: `/articles/${article.slug}`,
    }));

    try {
      const summary = await generateTagSummary(tag.name, articleBriefs);

      // 6. Update the tag
      await strapi.documents("api::tag.tag").update({
        documentId: tagDocumentId,
        data: {
          summary,
          summaryCacheKey: newFingerprint,
        },
      });

      // 7. Publish the update
      await strapi.documents("api::tag.tag").publish({
        documentId: tagDocumentId,
      });

      console.log(`Successfully updated summary for tag "${tag.name}".`);
    } catch (error) {
      console.error(`Failed to update summary for tag "${tag.name}":`, error);
    }
  },
});
