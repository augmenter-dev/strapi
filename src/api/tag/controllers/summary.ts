/**
 * summary controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController("api::tag.tag", ({ strapi }) => ({
  async updateSummary(ctx) {
    const documentId = ctx.params?.documentId as string | undefined;

    if (!documentId || typeof documentId !== "string") {
      return ctx.badRequest("Missing or invalid tag documentId");
    }

    const existingTag = await strapi
      .documents("api::tag.tag")
      .findOne({ documentId });

    if (!existingTag) {
      return ctx.notFound("Tag not found");
    }

    const waitRaw = ctx.query?.wait as string | undefined;
    const shouldWait = waitRaw === "true" || waitRaw === "1";

    const summaryService = strapi.service("api::tag.summary");

    if (shouldWait) {
      await summaryService.updateTagSummary(documentId);

      const updatedTag = await strapi
        .documents("api::tag.tag")
        .findOne({ documentId });

      return {
        data: updatedTag,
        meta: {
          status: "done",
        },
      };
    }

    void summaryService.updateTagSummary(documentId).catch((error: unknown) => {
      strapi.log.error(
        `Failed to update tag summary for documentId=${documentId}`,
        error as Error
      );
    });

    ctx.status = 202;
    return {
      data: {
        documentId,
        status: "queued",
      },
    };
  },
}));
