const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /\b(?:\+?\d[\d\s().-]{7,}\d)\b/g;
const CARD_REGEX = /\b(?:\d[ -]*?){13,16}\b/g;

export function redactPii(input: string, maxLength = 220) {
  const normalized = input
    .replace(EMAIL_REGEX, "[redacted-email]")
    .replace(PHONE_REGEX, "[redacted-phone]")
    .replace(CARD_REGEX, "[redacted-card]")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}
