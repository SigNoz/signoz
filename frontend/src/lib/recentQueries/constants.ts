export const STORAGE_KEY_PREFIX = 'qb_recent_v1';
export const STORAGE_VERSION = 1;
// Maximum entries kept per (signal, source) bucket. Larger than the UI's
// RECENTS_DISPLAY_CAP so deleting a visible entry surfaces an older one.
export const MAX_ENTRIES = 10;
