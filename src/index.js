"use strict";
const bootstrap = require("./bootstrap");
const { algoliasearch } = require("algoliasearch");

const triggerGithubPublish = require("./utils/github-dispatch");
const sendSlackNotification = require("./utils/slack-notification");

// Utility : vérifier que l'UID correspond à un content-type de votre API
const isApiContentType = (uid) =>
  typeof uid === "string" && uid.startsWith("api::");

const isConcernedContentType = (uid) =>
  uid === "api::article.article" ||
  uid === "api::video.video" ||
  uid === "api::pointer.pointer";

const isContactContentType = (uid) => uid === "api::contact.contact";

const FACETING_ATTRIBUTES = [
  "searchable(tags.slug)",
  "searchable(tags.name)",
  "filterOnly(type)",
];

const normalizeAttributes = (attributes = []) =>
  Array.from(new Set(attributes)).sort();

async function ensureAlgoliaFaceting(strapi) {
  try {
    const {
      applicationId,
      apiKey,
      contentTypes = [],
      indexPrefix = `${strapi.config.environment}_`,
    } = strapi.config.get("plugin::strapi-algolia") || {};

    if (!applicationId || !apiKey || !Array.isArray(contentTypes)) {
      return;
    }

    const client = algoliasearch(applicationId, apiKey);

    for (const contentType of contentTypes) {
      const indexName = `${indexPrefix}${contentType.index ?? contentType.name}`;
      const settings = await client.getSettings({ indexName });
      const currentAttributes = settings.attributesForFaceting || [];
      const mergedAttributes = normalizeAttributes([
        ...currentAttributes,
        ...FACETING_ATTRIBUTES,
      ]);

      const isAlreadyConfigured =
        JSON.stringify(normalizeAttributes(currentAttributes)) ===
        JSON.stringify(mergedAttributes);

      if (isAlreadyConfigured) {
        continue;
      }

      const result = await client.setSettings({
        indexName,
        indexSettings: {
          attributesForFaceting: mergedAttributes,
        },
      });
      await client.waitForTask({ indexName, taskID: result.taskID });
      strapi.log.info(`[algolia] Faceting configured for ${indexName}`);
    }
  } catch (error) {
    strapi.log.error(`[algolia] Unable to configure faceting: ${error.message}`);
  }
}

module.exports = {
  async bootstrap({ strapi }) {
    await ensureAlgoliaFaceting(strapi);

    strapi.db.lifecycles.subscribe({
      // `models: []` => all content-types
      async beforeUpdate(event) {
        const { where, data } = event.params;
        const uid = event.model?.uid;

        // Ignore everything qui n'appartient pas à l'API
        if (!isApiContentType(uid) || !where?.id) {
          return;
        }

        const isConcerned = isConcernedContentType(uid);

        const fieldsToSelect = isConcerned
          ? ["publishedAt", "publicationDate"]
          : ["publishedAt"];

        const entry = await strapi.entityService.findOne(uid, where.id, {
          fields: fieldsToSelect,
        });

        if (!entry) {
          return;
        }

        event.state = {
          prev: { publishedAt: entry.publishedAt },
        };

        if (isConcerned) {
          const isBeingPublished = data.publishedAt && !entry.publishedAt;
          if (
            isBeingPublished &&
            data.publicationDate == null &&
            entry.publicationDate == null
          ) {
            data.publicationDate = new Date();
          }
        }
      },

      async afterUpdate(event) {
        const uid = event.model?.uid;
        if (!isApiContentType(uid)) {
          return;
        }

        const { result } = event;
        const wasDraft = !event.state?.prev?.publishedAt;
        const isNowLive = !!result.publishedAt;
        if (wasDraft && isNowLive) {
          await triggerGithubPublish();
        }
      },

      async afterCreate(event) {
        const { result, model } = event;
        const uid = model?.uid;
        if (!isApiContentType(uid)) {
          return;
        }

        // Handle contact notifications
        if (isContactContentType(uid)) {
          // Fire and forget - don't block the response
          sendSlackNotification(result);
          return;
        }

        if (result.publishedAt) {
          const isConcerned = isConcernedContentType(uid);
          if (isConcerned && result.publicationDate == null) {
            await strapi.entityService.update(uid, result.id, {
              data: {
                publicationDate: new Date(),
              },
            });
          }
          await triggerGithubPublish();
        }
      },
    });
  },
};
