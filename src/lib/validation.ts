import { ZodError } from "zod";

type SafeParseResult<T> = {
  success: boolean;
  data?: T;
  error?: unknown;
};

export function parseValidatedInput<T>(result: SafeParseResult<T>, fallbackMessage: string): T {
  if (result.success && result.data !== undefined) return result.data;

  const detail = result.error instanceof ZodError
    ? result.error.issues.slice(0, 5).map((issue) => `${issue.path.length ? `${issue.path.join(".")}: ` : ""}${issue.message}`).join(" ")
    : fallbackMessage;
  const error = new Error(detail || fallbackMessage);
  Object.assign(error, { code: "VALIDATION_FAILED", status: 400 });
  throw error;
}
