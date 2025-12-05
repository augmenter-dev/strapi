import relatedArticlesCron from '../src/extensions/cron/related-articles';

export default {
  /**
   * Update related articles based on tag changes.
   * Runs every 6 hours.
   */
  'relatedArticlesUpdate': {
    task: ({ strapi }) => relatedArticlesCron.updateRelatedArticlesFromTags({ strapi }),
    options: {
      rule: '0 */6 * * *',
    },
  },
};

