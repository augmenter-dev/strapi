#!/usr/bin/env node
/**
 * Utility script: fetch all tags via Strapi REST API and generate missing summaries.
 *
 * Required:
 * - STRAPI_API_TOKEN: Strapi API token with permissions to read tags and call the custom route
 *
 * Optional:
 * - STRAPI_URL (default: http://localhost:1337)
 * - PAGE_SIZE (default: 100)
 * - CONCURRENCY (default: 2)
 * - WAIT (default: true) -> if true, calls update endpoint with ?wait=true
 * - DRY_RUN (default: false)
 *
 * Example:
 *   STRAPI_API_TOKEN="..." STRAPI_URL="http://localhost:1337" node scripts/update-tag-summaries.js
 */

const DEFAULT_STRAPI_URL = "http://localhost:1337";

function getEnvBoolean(name, defaultValue) {
  const raw = process.env[name];
  if (raw == null) return defaultValue;
  return raw === "true" || raw === "1" || raw === "yes";
}

function getEnvNumber(name, defaultValue) {
  const raw = process.env[name];
  if (raw == null || raw === "") return defaultValue;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function normalizeUrl(url) {
  return url.replace(/\/+$/, "");
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(
      `HTTP ${res.status} ${res.statusText} for ${url}${text ? `\n${text}` : ""}`
    );
    err.status = res.status;
    throw err;
  }

  return res.json();
}

async function listTags({ strapiUrl, token, pageSize }) {
  const tags = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const url = new URL(`${strapiUrl}/api/tags`);
    url.searchParams.set("pagination[page]", String(page));
    url.searchParams.set("pagination[pageSize]", String(pageSize));
    url.searchParams.set("fields[0]", "documentId");
    url.searchParams.set("fields[1]", "name");
    url.searchParams.set("fields[2]", "slug");
    url.searchParams.set("fields[3]", "summary");

    const json = await fetchJson(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const pageData = Array.isArray(json?.data) ? json.data : [];
    tags.push(...pageData);

    const metaPagination = json?.meta?.pagination;
    pageCount = metaPagination?.pageCount ?? pageCount;
    page += 1;
  }

  return tags;
}

async function updateTagSummary({ strapiUrl, token, documentId, shouldWait }) {
  const url = new URL(`${strapiUrl}/api/tags/${encodeURIComponent(documentId)}/update-summary`);
  if (shouldWait) url.searchParams.set("wait", "true");

  return fetchJson(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

async function runWithConcurrency(items, concurrency, handler) {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      // eslint-disable-next-line no-await-in-loop
      await handler(item);
    }
  });

  await Promise.all(workers);
}

async function main() {
  const token = process.env.STRAPI_API_TOKEN;
  if (!token) {
    console.error("Missing STRAPI_API_TOKEN env var.");
    process.exit(1);
  }

  const strapiUrl = normalizeUrl(process.env.STRAPI_URL || DEFAULT_STRAPI_URL);
  const pageSize = getEnvNumber("PAGE_SIZE", 100);
  const concurrency = getEnvNumber("CONCURRENCY", 2);
  const shouldWait = getEnvBoolean("WAIT", true);
  const isDryRun = getEnvBoolean("DRY_RUN", false);

  console.log(
    JSON.stringify(
      {
        strapiUrl,
        pageSize,
        concurrency,
        shouldWait,
        isDryRun,
      },
      null,
      2
    )
  );

  const tags = await listTags({ strapiUrl, token, pageSize });
  const tagsWithoutSummary = tags.filter((t) => {
    const summary = t?.summary ?? t?.attributes?.summary;
    return summary == null || String(summary).trim().length === 0;
  });

  console.log(`Fetched ${tags.length} tag(s). Missing summary: ${tagsWithoutSummary.length}.`);

  if (tagsWithoutSummary.length === 0) return;

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  await runWithConcurrency(tagsWithoutSummary, concurrency, async (tag) => {
    const documentId = tag?.documentId ?? tag?.attributes?.documentId;
    const name = tag?.name ?? tag?.attributes?.name ?? "unknown";

    if (!documentId) {
      failed += 1;
      processed += 1;
      console.warn(`Skipping tag without documentId (name="${name}")`);
      return;
    }

    if (isDryRun) {
      processed += 1;
      console.log(`[DRY_RUN] Would update summary for tag "${name}" (${documentId})`);
      return;
    }

    try {
      await updateTagSummary({ strapiUrl, token, documentId, shouldWait });
      succeeded += 1;
      processed += 1;
      console.log(`Updated summary for tag "${name}" (${documentId}) [${processed}/${tagsWithoutSummary.length}]`);
    } catch (error) {
      failed += 1;
      processed += 1;
      console.error(
        `Failed updating summary for tag "${name}" (${documentId}) [${processed}/${tagsWithoutSummary.length}]`,
        error
      );
    }
  });

  console.log(
    `Done. total=${tagsWithoutSummary.length} succeeded=${succeeded} failed=${failed}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});


