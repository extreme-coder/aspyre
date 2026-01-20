import * as Localization from 'expo-localization';

/**
 * Get the current local date string (YYYY-MM-DD) for a given timezone.
 * Falls back to device timezone if not provided.
 *
 * @param {string} timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getLocalDateString(timezone) {
  const tz = timezone || Localization.timezone || 'UTC';

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    // en-CA format gives us YYYY-MM-DD directly
    return formatter.format(now);
  } catch (error) {
    // Fallback if timezone is invalid
    const now = new Date();
    return now.toISOString().split('T')[0];
  }
}

/**
 * Check if a journal entry is within the edit window (30 minutes from creation).
 *
 * @param {string} createdAt - ISO timestamp of when the journal was created
 * @returns {boolean} True if still within edit window
 */
export function isWithinEditWindow(createdAt) {
  if (!createdAt) return false;

  const EDIT_WINDOW_MINUTES = 30;
  const createdTime = new Date(createdAt).getTime();
  const now = Date.now();
  const diffMinutes = (now - createdTime) / (1000 * 60);

  return diffMinutes <= EDIT_WINDOW_MINUTES;
}

/**
 * Get remaining edit time in minutes.
 *
 * @param {string} createdAt - ISO timestamp of when the journal was created
 * @returns {number} Minutes remaining, or 0 if window has passed
 */
export function getRemainingEditMinutes(createdAt) {
  if (!createdAt) return 0;

  const EDIT_WINDOW_MINUTES = 30;
  const createdTime = new Date(createdAt).getTime();
  const now = Date.now();
  const diffMinutes = (now - createdTime) / (1000 * 60);
  const remaining = EDIT_WINDOW_MINUTES - diffMinutes;

  return Math.max(0, Math.ceil(remaining));
}

/**
 * Format a date for display.
 *
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @returns {string} Formatted date (e.g., "January 18, 2026")
 */
export function formatDateForDisplay(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString + 'T12:00:00'); // Noon to avoid timezone issues
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
