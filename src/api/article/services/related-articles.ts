/**
 * related-articles service
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreService("api::article.article", () => ({
  async updateRelatedArticles(_articleId: string) {
    return;
  },
}));
