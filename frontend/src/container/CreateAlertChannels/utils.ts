import {
	PROMETHEUS_DURATION_UNIT_MS,
	prometheusDurationToMs,
} from 'utils/prometheusDuration';

import { ChannelFormValues, WebhookAuth } from './types';

const JIRA_MIN_REOPEN_MS = 60_000;

export const isValidJiraReopenDuration = (value: string): boolean => {
	if (!value || value === '0') {
		return true;
	}
	const totalMs = prometheusDurationToMs(value);
	return totalMs !== null && totalMs >= JIRA_MIN_REOPEN_MS;
};

/**
 * How prometheus `model.Duration` prints itself, the only spelling the API takes
 * back: "72h" becomes "3d", "7d" becomes "1w".
 */
const JIRA_DURATION_FORMAT: { unit: string; ms: number; exact: boolean }[] = [
	{ unit: 'y', ms: PROMETHEUS_DURATION_UNIT_MS.y, exact: true },
	{ unit: 'w', ms: PROMETHEUS_DURATION_UNIT_MS.w, exact: true },
	{ unit: 'd', ms: PROMETHEUS_DURATION_UNIT_MS.d, exact: false },
	{ unit: 'h', ms: PROMETHEUS_DURATION_UNIT_MS.h, exact: false },
	{ unit: 'm', ms: PROMETHEUS_DURATION_UNIT_MS.m, exact: false },
	{ unit: 's', ms: PROMETHEUS_DURATION_UNIT_MS.s, exact: false },
	{ unit: 'ms', ms: PROMETHEUS_DURATION_UNIT_MS.ms, exact: false },
];

/** The API rejects a duration it would print differently. */
export const canonicalJiraReopenDuration = (value: string): string => {
	const totalMs = value && value !== '0' ? prometheusDurationToMs(value) : null;
	if (totalMs === null) {
		return value;
	}

	let remaining = totalMs;
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
