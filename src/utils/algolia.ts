const extractExcerptFromContent = (content: string) => {
  if (!content) return "";

  const paragraphs = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const firstTwo = paragraphs.slice(0, 2);
  const combined = firstTwo.join(" ");

  return combined
    .replace(/`[^`]*`/g, "")
    .replace(/!?\[[^\]]*]\([^\)]*\)/g, "")
    .replace(/[#*_>~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const transformArticle = (data: any) => {
  // Validate required fields
  if (!data.documentId || !data.title || !data.slug) {
    return data; // Let Strapi/Algolia handle invalid data or skip if possible
  }

  const description =
    data.excerpt || extractExcerptFromContent(data.content || "");

  const tags =
    data.tags
      ?.map((tag: any) => ({
        name: tag.name,
        slug: tag.slug,
      }))
      .filter(Boolean) || [];

  const date =
    data.publicationDate ||
    data.publishedAt ||
    data.createdAt ||
    new Date().toISOString();

  const fullContent = `${data.title} ${description} ${tags
    .map((t: any) => t.name)
    .join(" ")}`;

  const record: any = {
    objectID: data.documentId,
    id: data.id,
    title: data.title,
    content: fullContent,
    description: description,
    slug: data.slug,
    url: `/articles/${data.slug}`,
    type: "article",
    articleType: data.articleType,
    tags: tags,
    highlight: data.highlight || false,
    date: new Date(date).getTime(),
    publicationDate: date,
    _tags: [
      ...tags.map((tag: any) => tag.slug),
      ...(data.articleType ? [data.articleType] : []),
      ...(data.highlight ? ["highlighted"] : []),
    ],
  };

  if (data.cover) {
    record.image = {
      url: data.cover.url,
      alt: data.cover.alternativeText || data.title,
      width: data.cover.width,
      height: data.cover.height,
    };
  }

  return record;
};

const transformVideo = (data: any) => {
  if (!data.documentId || !data.title || !data.slug) {
    return data;
  }

  const shortDescription = extractExcerptFromContent(data.description || "");
  

  const tags =
    data.tags
      ?.map((tag: any) => ({
        name: tag.name,
        slug: tag.slug,
      }))
      .filter(Boolean) || [];

  const date =
    data.publicationDate ||
    data.publishedAt ||
    data.createdAt ||
    new Date().toISOString();

  const fullContent = `${data.title} ${data.description} ${tags
    .map((t: any) => t.name)
    .join(" ")}`;

  const record: any = {
    objectID: data.documentId,
    id: data.id,
    title: data.title,
    content: fullContent,
    description: shortDescription,
    slug: data.slug,
    url: `/videos/${data.slug}`,
    type: "video",
    tags: tags,
    date: new Date(date).getTime(),
    publicationDate: date,
    _tags: [
      ...tags.map((tag: any) => tag.slug),
    ],
  };

  if (data.thumbnail) {
    record.image = {
      url: data.thumbnail.url,
      alt: data.thumbnail.alternativeText || data.title,
      width: data.thumbnail.width,
      height: data.thumbnail.height,
    };
  }

  return record;
};

export const algoliaTransformer = (contentType: string, data: any) => {
  if (contentType === "api::article.article") {
    return transformArticle(data);
  }
  if (contentType === "api::video.video") {
    return transformVideo(data);
  }
  return data;
};

