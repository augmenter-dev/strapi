export default {
  /**
   * Cron job to update related articles for tags modified in the last window.
   * Suggested schedule: Every 6 hours.
   */
  async updateRelatedArticlesFromTags({ strapi }: { strapi: any }) {
    const LOOKBACK_HOURS = 6;
    const BUFFER_MINUTES = 15; // Overlap to ensure coverage
    const since = new Date(
      Date.now() - (LOOKBACK_HOURS * 60 + BUFFER_MINUTES) * 60 * 1000
    );

    try {
      // 1. Find tags updated recently
      const updatedTags = await strapi.documents("api::tag.tag").findMany({
        filters: {
          updatedAt: {
            $gt: since.toISOString(),
          },
        },
        fields: ["documentId", "slug"],
      });

      if (updatedTags.length === 0) {
        // No tags updated, nothing to do.
        return;
      }

      console.log(
        `[Cron] Found ${updatedTags.length} updated tags since ${since.toISOString()}. Updating related articles...`
      );

      const tagIds = updatedTags.map((t) => t.documentId);

      // 2. Find articles associated with these tags
      // We want articles that have ANY of these tags and are published
      const affectedArticles = await strapi
        .documents("api::article.article")
        .findMany({
          status: "published",
          filters: {
            tags: {
              documentId: {
                $in: tagIds,
              },
            },
          },
          fields: ["documentId"], // We only need the ID
        });
      if (affectedArticles.length === 0) {
        return;
      }

      console.log(
        `[Cron] Found ${affectedArticles.length} affected articles. Processing updates...`
      );

      const service = strapi.service("api::article.related-articles");

      // 3. Update related articles for each affected article
      let successCount = 0;
      let errorCount = 0;

      // We process sequentially or in small batches to avoid overloading DB?
      // Given the volume might be "blog size", parallel is likely fine, but let's be safe with Promise.allSettled
      const results = await Promise.allSettled(
        affectedArticles.map((article) =>
          service.updateRelatedArticles(article.documentId)
        )
      );

      results.forEach((result) => {
        if (result.status === "fulfilled") successCount++;
        else errorCount++;
      });

      console.log(
        `[Cron] Completed. Success: ${successCount}, Errors: ${errorCount}.`
      );
    } catch (error) {
      console.error("[Cron] Error in updateRelatedArticlesFromTags:", error);
    }
  },
};
