import { z } from "zod";

// ============================================================================
// TRANSLATION TOOL
// ============================================================================

/**
 * Input schema for text translation
 */
export const translateInputSchema = z.object({
  text: z.string().min(1, "Text cannot be empty").max(5000, "Text too long"),
  sourceLang: z.string().length(2).default("en"),
  targetLang: z.string().length(2).default("pl"),
});

/**
 * Type inference from schema
 */
export type TranslateInput = z.infer<typeof translateInputSchema>;

/**
 * Translation tool using Google Translate
 */
export const translateTool = {
  name: "translateText",
  description: "Translates text from one language to another using Google Translate",
  inputSchema: translateInputSchema,

  async handler(input: TranslateInput) {
    const { text, sourceLang, targetLang } = input;

    // Google Translate unofficial API
    const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Translation API error: ${response.status}`,
        };
      }

      const data = await response.json();

      if (!data || !data[0] || !data[0][0] || !data[0][0][0]) {
        return {
          success: false,
          error: "Translation failed",
          details: "Invalid API response",
        };
      }

      const translatedText = data[0].map((segment: any[]) => segment[0]).join("");

      return {
        success: true,
        originalText: text,
        translatedText: translatedText,
        sourceLang: data[2] || sourceLang,
        targetLang: targetLang,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: "Failed to translate text",
        details: error.message,
      };
    }
  },
};