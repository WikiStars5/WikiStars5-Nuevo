import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNowStrict } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateDistance(date: Date, locale: string): string {
  return formatDistanceToNowStrict(date, { addSuffix: true, locale: locale === 'es' ? es : enUS });
}

export function formatCompactNumber(number: number): string {
  if (number >= 1000000) {
    return (number / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (number >= 1000) {
    return (number / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return number.toString();
}