// js/utils.js

/**
 * Formats a Unix timestamp into a human-readable string.
 * @param {number} unixTimestamp - The timestamp in seconds.
 * @returns {string} - The formatted date string (e.g., "Oct 26, 3:30 PM").
 */
export const formatTimestamp = (unixTimestamp) => {
    if (!unixTimestamp) return '';
    return new Date(unixTimestamp * 1000).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
};