import { NextResponse } from "next/server";
import { ZodError, type z } from "zod";
import { ClaudeError } from "@/lib/claude";

/** Consistent JSON success envelope. */
export function ok<T>(data: T, init?: number | ResponseInit) {
  const responseInit =
    typeof init === "number" ? { status: init } : init;
  return NextResponse.json(data, responseInit);
}

export function fail(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ error: message, detail: extra }, { status });
}

/**
 * Wraps a route handler so thrown errors become clean JSON responses instead of
 * unhandled 500s. Zod validation errors return 422 with field details.
 */
export async function route<T>(
  handler: () => Promise<T>,
): Promise<T | NextResponse> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("Validation failed", 422, error.flatten());
    }
    if (error instanceof ClaudeError) {
      return fail(error.message, error.status);
    }
    if (error instanceof HttpError) {
      return fail(error.message, error.status);
    }
    console.error("Unhandled route error:", error);
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return fail(message, 500);
  }
}

/** Throw to short-circuit a handler with a specific status. */
export class HttpError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function notFound(entity = "Resource"): never {
  throw new HttpError(`${entity} not found`, 404);
}

/** Parse and validate a JSON request body against a Zod schema. */
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError("Request body must be valid JSON", 400);
  }
  return schema.parse(raw);
}
