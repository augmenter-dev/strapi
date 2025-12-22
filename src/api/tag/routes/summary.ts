/**
 * Custom routes for tag summary updates
 */

export default {
  routes: [
    {
      method: "POST",
      path: "/tags/:documentId/update-summary",
      handler: "summary.updateSummary",
      config: {
        auth: {},
      },
    },
  ],
};
