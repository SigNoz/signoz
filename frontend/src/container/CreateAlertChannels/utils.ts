const GOOGLE_CHAT_WEBHOOK_HOST = 'chat.googleapis.com';

// the backend enforces the same two rules, this is only for a nicer error experience
export const isValidGoogleChatWebhookURL = (url: string): boolean => {
	try {
		const { protocol, hostname } = new URL(url);
		return (
			protocol === 'https:' && hostname.toLowerCase() === GOOGLE_CHAT_WEBHOOK_HOST
		);
	} catch {
		return false;
	}
};

const JIRA_CLOUD_HOST_SUFFIX = '.atlassian.net';

// the backend enforces the same rule, this is only for a nicer error experience
export const isValidJiraSiteURL = (url: string): boolean => {
	try {
		const { protocol, hostname } = new URL(url);
		return (
			protocol === 'https:' &&
			hostname.toLowerCase().endsWith(JIRA_CLOUD_HOST_SUFFIX)
		);
	} catch {
		return false;
	}
};

// mirrors go's prometheus model.Duration units
const JIRA_DURATION_UNIT_MS: Record<string, number> = {
	ms: 1,
	s: 1_000,
	m: 60_000,
	h: 3_600_000,
	d: 86_400_000,
	w: 604_800_000,
	y: 31_536_000_000,
};
const JIRA_DURATION_RE = /^(\d+(ms|s|m|h|d|w|y))+$/;
const JIRA_DURATION_TOKEN_RE = /(\d+)(ms|s|m|h|d|w|y)/g;
const JIRA_MIN_REOPEN_MS = 60_000;

// backend requires the same format and a >= 1m minimum, this is only for a
// nicer error experience. Empty and "0" defer to the backend default.
export const isValidJiraReopenDuration = (value: string): boolean => {
	if (!value || value === '0') {
		return true;
	}
	if (!JIRA_DURATION_RE.test(value)) {
		return false;
	}
	let totalMs = 0;
	for (const [, amount, unit] of value.matchAll(JIRA_DURATION_TOKEN_RE)) {
		totalMs += Number(amount) * JIRA_DURATION_UNIT_MS[unit];
	}
	return totalMs >= JIRA_MIN_REOPEN_MS;
};

/**
 * How prometheus `model.Duration` prints itself, which is the only spelling the
 * API accepts back: years and weeks only when the remainder divides exactly,
 * then days, hours, minutes, seconds and milliseconds greedily. "72h" prints as
 * "3d", "7d" as "1w".
 */
const JIRA_DURATION_FORMAT: { unit: string; ms: number; exact: boolean }[] = [
	{ unit: 'y', ms: JIRA_DURATION_UNIT_MS.y, exact: true },
	{ unit: 'w', ms: JIRA_DURATION_UNIT_MS.w, exact: true },
	{ unit: 'd', ms: JIRA_DURATION_UNIT_MS.d, exact: false },
	{ unit: 'h', ms: JIRA_DURATION_UNIT_MS.h, exact: false },
	{ unit: 'm', ms: JIRA_DURATION_UNIT_MS.m, exact: false },
	{ unit: 's', ms: JIRA_DURATION_UNIT_MS.s, exact: false },
	{ unit: 'ms', ms: JIRA_DURATION_UNIT_MS.ms, exact: false },
];

/**
 * The API rejects a duration it would print differently, so the user's spelling
 * is normalised before it is sent. A value it cannot parse is left alone for the
 * validator to reject.
 */
export const canonicalJiraReopenDuration = (value: string): string => {
	if (!value || value === '0' || !JIRA_DURATION_RE.test(value)) {
		return value;
	}

	let remaining = 0;
	for (const [, amount, unit] of value.matchAll(JIRA_DURATION_TOKEN_RE)) {
		remaining += Number(amount) * JIRA_DURATION_UNIT_MS[unit];
	}
	if (remaining === 0) {
		return '0s';
	}

	return JIRA_DURATION_FORMAT.reduce((canonical, { unit, ms, exact }) => {
		if (exact && remaining % ms !== 0) {
			return canonical;
		}
		const count = Math.floor(remaining / ms);
		if (count === 0) {
			return canonical;
		}
		remaining -= count * ms;
		return `${canonical}${count}${unit}`;
	}, '');
};

const INCIDENTIO_EVENTS_PATH_PREFIX = '/v2/alert_events/http/';

// the backend enforces the same rule, this is only for a nicer error experience
export const isValidIncidentIOURL = (url: string): boolean => {
	try {
		const { protocol, pathname } = new URL(url);
		const idx = pathname.indexOf(INCIDENTIO_EVENTS_PATH_PREFIX);
		return (
			protocol === 'https:' &&
			idx !== -1 &&
			pathname.length > idx + INCIDENTIO_EVENTS_PATH_PREFIX.length
		);
	} catch {
		return false;
	}
};
