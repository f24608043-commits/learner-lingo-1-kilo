/**
 * Deterministic date formatting.
 *
 * Server and browser disagree on the default locale and casing, so calling
 * `toLocaleString()` directly produces different text during SSR than after
 * hydration (for example `02/10/2026, 6:49:40 pm` vs `10/2/2026, 6:49:40 PM`),
 * which React reports as a hydration mismatch. Always pin the locale and the
 * time zone so both sides render identical output.
 */
const LOCALE = "en-US";

const DATE_TIME: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
};

const DATE_ONLY: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
};

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(LOCALE, DATE_TIME);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(LOCALE, DATE_ONLY);
}