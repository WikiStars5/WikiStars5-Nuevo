
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
