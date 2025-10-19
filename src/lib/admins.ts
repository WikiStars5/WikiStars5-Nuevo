/**
 * This file contains a hardcoded list of Firebase User IDs (UIDs) that are
 * granted administrative privileges across the application.
 *
 * This serves as a client-side "VIP list" for an extra layer of security.
 * For a user to be considered an admin, their UID must be in this list AND
 * they must have a corresponding document in the `roles_admin` collection in Firestore.
 */

export const ADMIN_UIDS: string[] = [
  'qJxeWyYIMOT3UzMJwYnI0bCxogy1',
  // Add other admin UIDs here in the future if needed.
];
