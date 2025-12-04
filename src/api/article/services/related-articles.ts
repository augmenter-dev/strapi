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
            populate: ["tags", "relatedArticles"],
          })) as any; // Cast to any to avoid TS errors with populated fields

        if (
          !currentArticle ||
          !currentArticle.tags ||
          currentArticle.tags.length === 0
        ) {
          // If no tags, clear related articles if not already empty
          if (
            currentArticle.relatedArticles &&
            currentArticle.relatedArticles.length > 0
          ) {
            await strapi.documents("api::article.article").update({
              documentId: articleId,
              data: { relatedArticles: [] },
            });
            // Publish the update if article is already published
            if (currentArticle.publishedAt) {
              await strapi.documents("api::article.article").publish({
                documentId: articleId,
                // Mark this as an internal publish so the lifecycle
                // can skip re-triggering the related-articles logic.
                context: { skipRelatedLifecycle: true },
              });
              console.log(
                `✅ [Related Articles] Cleared related articles for "${currentArticle.title}" (${articleId}) - Article republished`
              );
            } else {
              console.log(
                `✅ [Related Articles] Cleared related articles for "${currentArticle.title}" (${articleId}) - Article is draft`
              );
            }
          }
          return;
        }

        const currentTags = currentArticle.tags.map((tag: any) => tag.slug);

        // 2. Fetch candidates: articles that share at least one tag
        // We fetch a bit more than 3 (e.g. 50) to allow for proper sorting by similarity
        const candidates = (await strapi
          .documents("api::article.article")
          .findMany({
            status: "published",
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

        // 6. Check if update is needed
        const currentRelatedIds = (currentArticle.relatedArticles || []).map(
          (rel: any) => rel.documentId
        );

        const hasChanged =
          currentRelatedIds.length !== topRelatedIds.length ||
          !currentRelatedIds.every(
            (id: string, index: number) => id === topRelatedIds[index]
          );

        if (hasChanged) {
          // 7. Update Article
          await strapi.documents("api::article.article").update({
            emitEvent: false,
            documentId: articleId,
            data: {
              relatedArticles: topRelatedIds,
            },
          });
          // 8. Publish the update
          await strapi.documents("api::article.article").publish({
            documentId: articleId,
            // Mark this as an internal publish so the lifecycle
            // can skip re-triggering the related-articles logic.
            context: { skipRelatedLifecycle: true },
          });
          console.log(
            `✅ [Related Articles] Updated "${currentArticle.title}" (${articleId})\n   └─ Found ${topRelatedIds.length} related article(s) based on ${currentTags.length} tag(s)`
          );
        } else {
          console.log(
            `ℹ️  [Related Articles] "${currentArticle.title}" (${articleId}) - No changes needed\n   └─ Related articles already up to date`
          );
        }
      } catch (error) {
        console.error(
          `❌ [Related Articles] Failed to update related articles for article ${articleId}:`,
          error instanceof Error ? error.message : error
        );
        if (error instanceof Error && error.stack) {
          console.error(`   Stack trace:`, error.stack);
        }
      }
    },
  })
);
