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
