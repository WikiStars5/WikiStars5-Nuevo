import type { Timestamp } from 'firebase/firestore';

/**
 * Checks if a Firestore Timestamp is from today or yesterday.
 */
export function isDateActive(timestamp?: Timestamp): boolean {
    if (!timestamp) return false;
    
    const date = timestamp.toDate();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.getFullYear() === today.getFullYear() &&
                    date.getMonth() === today.getMonth() &&
                    date.getDate() === today.getDate();

    const isYesterday = date.getFullYear() === yesterday.getFullYear() &&
                        date.getMonth() === yesterday.getMonth() &&
                        date.getDate() === yesterday.getDate();
                        
    return isToday || isYesterday;
}

/**
 * Calculates the number of full calendar days passed between a timestamp and now.
 */
export function getDaysPassed(date1: Date, date2: Date): number {
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    const diff = d2.getTime() - d1.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}
