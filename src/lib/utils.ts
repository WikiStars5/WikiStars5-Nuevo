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
