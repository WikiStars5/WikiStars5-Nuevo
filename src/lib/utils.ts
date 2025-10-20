import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Corrects a malformed URL, typically by ensuring it has a protocol.
 * This is useful for image sources that might be missing 'https://'.
 * @param url The URL string to correct.
 * @returns A corrected, valid URL string, or an empty string if the input is invalid.
 */
export function correctMalformedUrl(url: string | undefined | null): string {
  if (!url) {
    return '';
  }
  // If it already has a protocol, assume it's correct.
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // If it starts with '//', prepend 'https:'
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  // Otherwise, assume it's a domain and prepend 'https://'
  return `https://${url}`;
}
