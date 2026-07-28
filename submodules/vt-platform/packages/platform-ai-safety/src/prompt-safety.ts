const CONTROL_CHARACTERS_PATTERN = /[\u0000-\u001F\u007F]+/g;
const WHITESPACE_PATTERN = /\s+/g;
const CODE_FENCE_PATTERN = /```+/g;
const ROLE_TAG_PATTERN = /<\s*\/?\s*(system|assistant|developer|user|tool)\s*>/gi;
const ROLE_PREFIX_PATTERN = /\b(system|assistant|developer|user|tool)\s*:/gi;

export interface PromptSafetyTextOptions {
  maxLength?: number;
}

export interface QuotePromptValueOptions extends PromptSafetyTextOptions {
  fallback?: string;
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  if (maxLength <= 3) return value.slice(0, maxLength);
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

export function sanitizePromptFragment(
  value: unknown,
  options: PromptSafetyTextOptions = {},
): string | undefined {
  if (value === undefined || value === null) return undefined;
  const maxLength = Math.max(16, options.maxLength ?? 240);
  const raw = String(value)
    .replace(CONTROL_CHARACTERS_PATTERN, ' ')
    .replace(WHITESPACE_PATTERN, ' ')
    .trim();
  if (!raw) return undefined;
  const neutralized = raw
    .replace(CODE_FENCE_PATTERN, "'''")
    .replace(ROLE_TAG_PATTERN, (_match, role: string) => `[${role.toLowerCase()}-tag]`)
    .replace(ROLE_PREFIX_PATTERN, (_match, role: string) => `[${role.toLowerCase()}-role] `)
    .replace(WHITESPACE_PATTERN, ' ')
    .trim();
  return truncateText(neutralized, maxLength);
}

export function quotePromptValue(
  value: unknown,
  options: QuotePromptValueOptions = {},
): string {
  const fallback = options.fallback ?? 'n/a';
  const sanitized = sanitizePromptFragment(value, options) ?? fallback;
  return JSON.stringify(sanitized);
}
