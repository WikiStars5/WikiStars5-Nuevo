/**
 * Normalizes a string by converting it to lowercase and removing accents.
 * @param text The string to normalize.
 * @returns The normalized string.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Generates an array of keyword prefixes from a given name for search optimization.
 * e.g., "Lionel Messi" -> ['l', 'li', 'lio', ..., 'lionel', 'm', 'me', ..., 'messi']
 * @param name The name to generate keywords from.
 * @returns An array of string prefixes.
 */
export function generateKeywords(name: string): string[] {
  const normalizedName = normalizeText(name);
  const words = normalizedName.split(' ');
  const keywords = new Set<string>();

  words.forEach(word => {
    for (let i = 1; i <= word.length; i++) {
      keywords.add(word.substring(0, i));
    }
  });

  return Array.from(keywords);
}
