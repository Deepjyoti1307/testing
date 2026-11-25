/**
 * Extracts and cleans unique valid email addresses from raw text or CSV content
 */
export function extractEmailsFromContent(content: string): string[] {
  // Regex matching valid email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = content.match(emailRegex) || [];

  // Deduplicate and normalize to lowercase
  const uniqueEmails = Array.from(new Set(matches.map((e) => e.trim().toLowerCase())));
  return uniqueEmails;
}
