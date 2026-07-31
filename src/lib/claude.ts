import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

/**
 * The ONLY place the Anthropic API key is used. Every AI feature calls
 * `generateJSON` from a server route; the key never reaches the client.
 */

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env (local) or Vercel project settings.",
    );
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export class ClaudeError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "ClaudeError";
  }
}

interface GenerateOptions<T extends z.ZodType> {
  system: string;
  user: string;
  schema: T;
  /** Response cap. Structured resume/interview payloads can be large. */
  maxTokens?: number;
}

/**
 * Sends a single request to Claude with a structured-output schema and returns
 * the parsed, validated result. Uses `messages.parse` so the SDK validates the
 * response against the schema before we ever touch it.
 */
export async function generateJSON<T extends z.ZodType>({
  system,
  user,
  schema,
  maxTokens = 8000,
}: GenerateOptions<T>): Promise<z.infer<T>> {
  const anthropic = getClient();

  let message;
  try {
    message = await anthropic.messages.parse({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { format: zodOutputFormat(schema) },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ClaudeError(`Claude request failed: ${detail}`);
  }

  if (message.stop_reason === "refusal") {
    throw new ClaudeError("Claude declined this request.", 422);
  }
  if (message.stop_reason === "max_tokens") {
    throw new ClaudeError(
      "Claude's response was cut off. Try again or shorten the input.",
      502,
    );
  }

  const parsed = message.parsed_output as z.infer<T> | null;
  if (parsed == null) {
    throw new ClaudeError("Claude returned output that did not match the schema.");
  }
  return parsed;
}
