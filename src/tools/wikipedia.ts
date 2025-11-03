import { z } from "zod";

// ============================================================================
// WIKIPEDIA SEARCH TOOL
// ============================================================================

/**
 * Input schema for Wikipedia search
 * Validates the query and optional language parameter
 */
export const wikipediaInputSchema = z.object({
  query: z.string().min(1, "Query cannot be empty").max(300, "Query too long"),
  language: z.string().length(2).optional().default("en"), // ISO 639-1 language code
});

/**
 * Type inference from schema for better TypeScript support
 */
export type WikipediaInput = z.infer<typeof wikipediaInputSchema>;

/**
 * Wikipedia search tool definition
 * Searches Wikipedia and returns article summary
 */
export const wikipediaTool = {
  name: "searchWikipedia",
  description: "Searches Wikipedia and returns a summary of the article with link and thumbnail",
  inputSchema: wikipediaInputSchema,

  /**
   * Handler function that executes the Wikipedia search
   * @param input - Validated input containing query and optional language
   * @returns Article summary or error object
   */
  async handler(input: WikipediaInput) {
    const { query, language } = input;

    // Construct Wikipedia REST API URL
    // Using the summary endpoint which provides a concise article overview
    const apiUrl = `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      query
    )}`;

    try {
      // Fetch data from Wikipedia API
      const response = await fetch(apiUrl, {
        headers: {
          // Wikipedia requires a User-Agent header
          "User-Agent": "Learning-Assistant-MCP/1.0 (Educational Tool)",
          Accept: "application/json",
        },
      });

      // Handle article not found (404)
      if (response.status === 404) {
        return {
          success: false,
          error: "Article not found",
          suggestion: "Try rephrasing your search or check spelling",
          query: query,
        };
      }

      // Handle other HTTP errors
      if (!response.ok) {
        return {
          success: false,
          error: `Wikipedia API returned status ${response.status}`,
        };
      }

      // Parse JSON response
      const data = await response.json();

      // Return formatted result
      return {
        success: true,
        title: data.title, // Article title
        summary: data.extract, // Plain text summary (first paragraph)
        url: data.content_urls?.desktop?.page, // Full article URL
        thumbnail: data.thumbnail?.source || null, // Thumbnail image URL if available
        language: language, // Language of the article
        timestamp: new Date().toISOString(), // When the search was performed
      };
    } catch (error: any) {
      // Handle network errors or unexpected issues
      return {
        success: false,
        error: "Failed to fetch data from Wikipedia",
        details: error.message,
      };
    }
  },
};