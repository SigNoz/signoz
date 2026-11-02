import { ChannelFormValues, WebhookAuth } from './types';

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
 * How prometheus `model.Duration` prints itself, the only spelling the API takes
 * back: "72h" becomes "3d", "7d" becomes "1w".
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

/** The API rejects a duration it would print differently. */
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

export const webhookAuthOf = (
	values: Pick<
		ChannelFormValues,
		'webhookAuth' | 'username' | 'password' | 'bearerToken'
	>,
): WebhookAuth => {
	if (values.webhookAuth) {
		return values.webhookAuth;
	}
	if (values.bearerToken) {
		return WebhookAuth.bearer;
	}
	return values.username || values.password
		? WebhookAuth.basic
		: WebhookAuth.none;
};

export const filledRows = <T>(
	rows: T[] | null | undefined,
	required: keyof T,
): T[] =>
	(rows ?? []).filter((row) => String(row[required] ?? '').trim() !== '');
