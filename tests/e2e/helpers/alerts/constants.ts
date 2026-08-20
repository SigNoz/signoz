// ─── Constants ───────────────────────────────────────────────────────────

export const ALERTS_LIST_PATH = '/alerts';
export const ALERT_OVERVIEW_PATH = '/alerts/overview';
export const ALERT_HISTORY_PATH = '/alerts/history';

/**
 * Mirrors `TIMELINE_TABLE_PAGE_SIZE` in
 * `frontend/src/container/AlertHistory/constants.ts`. This 20 is what makes the
 * page-2 cursor `base64url({"offset":20,"limit":20})`, so the two must not drift.
 */
export const TIMELINE_PAGE_SIZE = 20;

/** The `relativeTime` the history page falls back to (`DEFAULT_TIME_RANGE`). */
export const DEFAULT_RELATIVE_TIME = '30m';

/**
 * Page size the list specs pin in the URL, so the number of rendered rows never
 * depends on the viewport height.
 */
export const ALERT_LIST_PAGE_SIZE = 10;

/** Severities SEED-B cycles through, so list search/sort has more than one value. */
export const SEED_B_SEVERITIES = ['critical', 'warning', 'info'] as const;
