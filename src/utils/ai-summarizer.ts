import OpenAI from "openai";

export interface ArticleBrief {
  title: string;
  description: string;
  date: string;
  url?: string;
}

export async function generateTagSummary(
  tagName: string,
  articles: ArticleBrief[],
  modelId?: string
): Promise<string> {
  if (articles.length === 0) {
    return `No recent news articles found for ${tagName}.`;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  const model = modelId || process.env.AI_MODEL_ID || "gpt-4o-mini";

  // Limit total content to avoid token limits
  const maxArticles = 5;
  const maxDescriptionLength = 300;
  const selectedArticles = articles.slice(0, maxArticles);

  const articlesText = selectedArticles
    .map((article, index) => {
      const trimmedDescription =
        article.description.length > maxDescriptionLength
          ? article.description.substring(0, maxDescriptionLength) + "..."
          : article.description;

      return `${index + 1}. ${article.title}\n${trimmedDescription}`;
    })
    .join("\n\n");

  const prompt = `Create a concise 2-3 sentence summary of the latest news about "${tagName}" based on these recent articles:

${articlesText}

Focus on the main themes, trends, or key developments. Be neutral and factual. Do not mention specific article titles or dates in your summary.`;

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that creates concise, informative summaries about collections of news articles. Always respond with 2-3 sentences that capture the key themes and insights from the provided articles. Be neutral, factual, and avoid speculation.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const summary = response.choices[0]?.message?.content?.trim() || "";

    // Clean up any common AI response artifacts
    return summary
      .replace(/^Here's a summary:|^Summary:|^In summary:/i, "")
      .replace(/^\s+|\s+$/g, "")
      .replace(/\n+/g, " ")
      .trim();
  } catch (error) {
    console.error("Error generating tag summary:", error);
    throw error;
  }
}
