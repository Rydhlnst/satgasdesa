import type { ZodError } from "zod";

export type FormErrors = Record<string, string>;

export function zodFieldErrors(error: ZodError): FormErrors {
  return error.issues.reduce<FormErrors>((result, issue) => {
    const key = issue.path.length ? issue.path.join(".") : "form";
    if (!result[key]) result[key] = issue.message;
    return result;
  }, {});
}

export function firstZodError(error: ZodError, fallback: string) {
  return error.issues[0]?.message ?? fallback;
}

export function clearFormError(errors: FormErrors, key: string): FormErrors {
  if (!errors[key]) return errors;
  const next = { ...errors };
  delete next[key];
  return next;
}
