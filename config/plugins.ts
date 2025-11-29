import { algoliaTransformer } from "../src/utils/algolia";

export default ({ env }: { env: any }) => ({
  documentation: {
    enabled: true,
    config: {
      openapi: "3.0.0",
      info: {
        version: "1.0.0",
        title: "Augmenter Strapi API",
        description: "",
        contact: {
          name: "Augmenter",
          email: "julien@oltre.dev",
          url: "augmenter.dev",
        },
        license: {
          name: "UNLICENSED",
        },
      },
      "x-strapi-config": {
        // Leave empty to ignore plugins during generation
        plugins: ["upload", "users-permissions"],
        path: "/documentation",
      },
      servers: [
        { url: "http://localhost:1337/api", description: "Development server" },
        {
          url: "https://strapi.oltre.dev/api",
          description: "Production server",
        },
      ],
      security: [{ bearerAuth: [] }],
    },
  },
  "strapi-algolia": {
    enabled: true,
    config: {
      apiKey: env("ALGOLIA_PROVIDER_ADMIN_API_KEY"),
      applicationId: env("ALGOLIA_PROVIDER_APP_ID"),
      contentTypes: [
        {
          name: "api::article.article",
          index: "articles",
          populate: {
            cover: true,
            tags: true,
          },
        },
      ],
      transformerCallback: algoliaTransformer,
    },
  },
});
