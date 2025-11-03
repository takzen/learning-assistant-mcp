import { z } from "zod";

// ============================================================================
// DICTIONARY TOOL
// ============================================================================

/**
 * Input schema for dictionary lookup
 * Validates the word to look up
 */
export const dictionaryInputSchema = z.object({
  word: z
    .string()
    .min(1, "Word cannot be empty")
    .max(50, "Word too long")
    .regex(/^[a-zA-Z\s-]+$/, "Word must contain only letters, spaces, or hyphens"),
});

/**
 * Type inference from schema for better TypeScript support
 */
export type DictionaryInput = z.infer<typeof dictionaryInputSchema>;

/**
 * Dictionary tool definition
 * Uses Free Dictionary API - no registration required
 * Provides definitions, phonetics, examples, and synonyms
 */
export const dictionaryTool = {
  name: "lookupWord",
  description: "Looks up word definitions, pronunciations, examples, and synonyms from English dictionary",
  inputSchema: dictionaryInputSchema,

  /**
   * Handler function that executes the dictionary lookup
   * @param input - Validated input containing the word to look up
   * @returns Dictionary entry with definitions or error object
   */
  async handler(input: DictionaryInput) {
    const { word } = input;

    // Free Dictionary API endpoint
    // Documentation: https://dictionaryapi.dev/
    const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
      word.toLowerCase().trim()
    )}`;

    try {
      // Fetch data from Dictionary API
      const response = await fetch(apiUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      // Handle word not found (404)
      if (response.status === 404) {
        return {
          success: false,
          error: "Word not found",
          suggestion: "Check spelling or try a different word",
          word: word,
        };
      }

      // Handle other HTTP errors
      if (!response.ok) {
        return {
          success: false,
          error: `Dictionary API returned status ${response.status}`,
        };
      }

      // Parse JSON response (API returns an array)
      const data = await response.json();

      // Check if we got valid data
      if (!Array.isArray(data) || data.length === 0) {
        return {
          success: false,
          error: "Invalid response from dictionary API",
        };
      }

      // Extract the first entry (usually the most relevant)
      const entry = data[0];

      // Extract phonetics (pronunciation)
      const phonetics = entry.phonetics
        ?.filter((p: any) => p.text) // Only include phonetics with text
        .map((p: any) => ({
          text: p.text, // IPA notation (e.g., /həˈloʊ/)
          audio: p.audio || null, // Audio URL if available
        }));

      // Extract all meanings (noun, verb, adjective, etc.)
      const meanings = entry.meanings?.map((meaning: any) => ({
        partOfSpeech: meaning.partOfSpeech, // e.g., "noun", "verb"
        definitions: meaning.definitions?.slice(0, 3).map((def: any) => ({
          // Limit to 3 definitions per part of speech
          definition: def.definition,
          example: def.example || null, // Usage example if available
          synonyms: def.synonyms?.slice(0, 5) || [], // Up to 5 synonyms
          antonyms: def.antonyms?.slice(0, 5) || [], // Up to 5 antonyms
        })),
      }));

      // Return formatted result
      return {
        success: true,
        word: entry.word, // The word as returned by API (lowercase)
        phonetics: phonetics || [], // Pronunciation information
        meanings: meanings || [], // All definitions organized by part of speech
        sourceUrls: entry.sourceUrls || [], // Reference URLs
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      // Handle network errors or unexpected issues
      return {
        success: false,
        error: "Failed to fetch dictionary data",
        details: error.message,
      };
    }
  },
};