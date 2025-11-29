/**
 * related-articles service
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreService(
  "api::article.article",
  ({ strapi }) => ({
    async updateRelatedArticles(articleId: string) {
      try {
        // 1. Fetch current article with tags
        const currentArticle = (await strapi
          .documents("api::article.article")
          .findOne({
            documentId: articleId,
            populate: ["tags"],
          })) as any; // Cast to any to avoid TS errors with populated fields

        if (
          !currentArticle ||
          !currentArticle.tags ||
          currentArticle.tags.length === 0
        ) {
          // If no tags, clear related articles
          await strapi.documents("api::article.article").update({
            documentId: articleId,
            data: { relatedArticles: [] },
          });
          return;
        }

        const currentTags = currentArticle.tags.map((tag: any) => tag.slug);

        // 2. Fetch candidates: articles that share at least one tag
        // We fetch a bit more than 3 (e.g. 50) to allow for proper sorting by similarity
        const candidates = (await strapi
          .documents("api::article.article")
          .findMany({
            filters: {
              tags: {
                slug: {
                  $in: currentTags,
                },
              },
              documentId: {
                $ne: articleId, // Exclude current article
              },
            },
            populate: ["tags"],
            limit: 50, // Fetch enough candidates to sort effectively
          })) as any[]; // Cast to any[]

        // 3. Calculate Similarity Scores
        const scoredCandidates = candidates.map((article: any) => {
          const articleTags = article.tags || [];

          // Count shared tags
          const sharedTagsCount = articleTags.filter(
            (tag: any) => tag.slug && currentTags.includes(tag.slug)
          ).length;

          // Calculate Union (Total unique tags between both)
          const totalUniqueTags = new Set([
            ...currentTags,
            ...articleTags.map((t: any) => t.slug),
          ]).size;

          // Jaccard Similarity = Intersection / Union
          // Prevent division by zero, though logic implies union > 0 if shared > 0
          const similarity =
            totalUniqueTags > 0 ? sharedTagsCount / totalUniqueTags : 0;

          return {
            id: article.documentId,
            similarity,
            sharedTagsCount,
            publishedAt: new Date(
              article.publishedAt || article.createdAt
            ).getTime(),
          };
        });

        // 4. Sort Candidates
        // Priority: Similarity Score DESC > Shared Tags Count DESC > Date DESC
        scoredCandidates.sort((a, b) => {
          if (b.similarity !== a.similarity) {
            return b.similarity - a.similarity;
          }
          if (b.sharedTagsCount !== a.sharedTagsCount) {
            return b.sharedTagsCount - a.sharedTagsCount;
          }
          return b.publishedAt - a.publishedAt;
        });

        // 5. Select Top 3
        const topRelatedIds = scoredCandidates.slice(0, 3).map((c) => c.id);

        // 6. Update Article
        // use emitEvent: false to prevent triggering infinite lifecycle loops if we were listening to 'update' universally
        // (Though our lifecycle logic will handle recursion check, this is a safety net)
        await strapi.documents("api::article.article").update({
          documentId: articleId,
          data: {
            relatedArticles: topRelatedIds,
          },
        });

        console.log(
          `Updated related articles for ${articleId} (${currentArticle.title}): found ${topRelatedIds.length} matches.`
        );
      } catch (error) {
        console.error(
          `Error updating related articles for article ${articleId}:`,
          error
        );
      }
    },
  })
);
