const Strapi = require("@strapi/strapi");
const path = require("path");

async function run() {
  console.log("🚀 Starting Strapi instance...");

  try {
    // Initialize Strapi without starting the server (DB connection only)
    const app = await Strapi.createStrapi({ distDir: "./dist" }).load();

    console.log("✅ Strapi loaded. Running Cron Task Logic manually...");
    console.log("");

    // Import the compiled JS version of the cron task
    // Note: We need to use require because we are in a JS script executing compiled code
    const cronModulePath = path.join(
      __dirname,
      "../dist/src/extensions/cron/related-articles.js"
    );

    let cronModule;
    try {
      cronModule = require(cronModulePath);
    } catch (error) {
      if (error.code === "MODULE_NOT_FOUND") {
        console.error("❌ Error: Could not find compiled cron module.");
        console.error(`   Expected path: ${cronModulePath}`);
        console.error("   Make sure you have built the project: npm run build");
        process.exit(1);
      }
      throw error;
    }

    // Check if it's a default export or named export
    const cronJob = cronModule.default || cronModule;

    if (
      !cronJob ||
      typeof cronJob.updateRelatedArticlesFromTags !== "function"
    ) {
      throw new Error(
        "Could not find updateRelatedArticlesFromTags function in the module.\n" +
          "Make sure you have built the project (npm run build)."
      );
    }

    console.log("⏳ Executing updateRelatedArticlesFromTags...");
    console.log("");

    await cronJob.updateRelatedArticlesFromTags({ strapi: app });

    console.log("");
    console.log("🎉 Cron task execution finished successfully.");
  } catch (error) {
    console.error("");
    console.error("❌ Error executing cron task:", error.message);
    if (error.stack) {
      console.error("");
      console.error("Stack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Cleanup: destroy Strapi instance if possible
    try {
      if (app && typeof app.destroy === "function") {
        await app.destroy();
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    process.exit(0);
  }
}

run();
