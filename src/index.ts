import { wikipediaTool } from "./tools/wikipedia";
import { translateTool } from "./tools/translate";

// ============================================================================
// TOOL REGISTRY
// ============================================================================

/**
 * Central registry of all available tools
 * Add new tools here as you create them
 */
const tools = {
  searchWikipedia: wikipediaTool,
  translateText: translateTool,
  // Future tools will be added here:
  // getYouTubeTranscript: youtubeTool,
  // generateFlashcards: flashcardTool,
  // etc.
};

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Standard request format for MCP server
 */
interface MCPRequest {
  tool: string; // Name of the tool to execute
  input: any; // Input parameters for the tool
}

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: string;
  details?: string;
}

// ============================================================================
// MCP SERVER
// ============================================================================

/**
 * Main Cloudflare Worker handler
 * Processes incoming requests and routes them to appropriate tools
 */
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    // Add CORS headers for cross-origin requests
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle preflight OPTIONS request
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    // Only accept POST requests
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Method not allowed",
          details: "Only POST requests are accepted",
        } as ErrorResponse),
        {
          status: 405,
          headers: corsHeaders,
        }
      );
    }

    try {
      // Parse incoming JSON request
      const mcpRequest: MCPRequest = await request.json();
      const { tool, input } = mcpRequest;

      // Validate request structure
      if (!tool || typeof tool !== "string") {
        return new Response(
          JSON.stringify({
            error: "Invalid request",
            details: "Missing or invalid 'tool' parameter",
          } as ErrorResponse),
          {
            status: 400,
            headers: corsHeaders,
          }
        );
      }

      // Check if requested tool exists
      if (!(tool in tools)) {
        return new Response(
          JSON.stringify({
            error: "Tool not found",
            details: `Unknown tool: ${tool}`,
            availableTools: Object.keys(tools),
          } as ErrorResponse),
          {
            status: 404,
            headers: corsHeaders,
          }
        );
      }

      // Get the tool from registry
      const selectedTool = tools[tool as keyof typeof tools];

      // Validate input against tool's schema
      const validatedInput = selectedTool.inputSchema.parse(input);

      // Execute tool handler
      const result = await selectedTool.handler(validatedInput);

      // Return successful response
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (error: any) {
      // Handle validation errors (from Zod)
      if (error.name === "ZodError") {
        return new Response(
          JSON.stringify({
            error: "Validation error",
            details: error.errors,
          } as ErrorResponse),
          {
            status: 400,
            headers: corsHeaders,
          }
        );
      }

      // Handle JSON parsing errors
      if (error instanceof SyntaxError) {
        return new Response(
          JSON.stringify({
            error: "Invalid JSON",
            details: "Request body must be valid JSON",
          } as ErrorResponse),
          {
            status: 400,
            headers: corsHeaders,
          }
        );
      }

      // Handle unexpected errors
      console.error("Unexpected error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          details: error.message,
        } as ErrorResponse),
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }
  },
};