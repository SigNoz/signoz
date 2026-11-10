import type { SortState } from 'components/TanStackTableView/types';

import type { Alert } from '../types';
import {
	getAlertSortValue,
	getRuleId,
	normalizeAlerts,
	sortAlerts,
} from '../utils';

const alertWithFingerprint: Alert = {
	fingerprint: 'fp-existing',
	labels: { alertname: 'Test', severity: 'critical' },
	annotations: {},
	startsAt: '2023-10-19T10:00:00Z',
	endsAt: '0001-01-01T00:00:00Z',
	status: { state: 'active', silencedBy: [], inhibitedBy: [] },
	receivers: [],
};

const alertWithoutFingerprint: Alert = {
	...alertWithFingerprint,
	fingerprint: undefined,
};

describe('normalizeAlerts', () => {
	it('returns empty array when given undefined', () => {
		expect(normalizeAlerts(undefined)).toStrictEqual([]);
	});

	it('preserves existing fingerprints', () => {
		const result = normalizeAlerts([alertWithFingerprint]);
		expect(result).toHaveLength(1);
		expect(result[0].fingerprint).toBe('fp-existing');
	});

	it('mints fingerprint when missing', () => {
		const result = normalizeAlerts([alertWithoutFingerprint]);
		expect(result[0].fingerprint).toBeDefined();
		expect(typeof result[0].fingerprint).toBe('string');
		expect(result[0].fingerprint?.length).toBeGreaterThan(0);
	});

	it('does not mutate the input array', () => {
		const input = [alertWithFingerprint];
		const copy = JSON.parse(JSON.stringify(input));
		normalizeAlerts(input);
		expect(input).toStrictEqual(copy);
	});
});

describe('getAlertSortValue', () => {
	const alert: Alert = {
		fingerprint: 'fp',
		labels: { alertname: 'CPU', severity: 'critical' },
		annotations: {},
		startsAt: '2023-10-19T10:00:00Z',
		endsAt: '0001-01-01T00:00:00Z',
		status: { state: 'active', silencedBy: [], inhibitedBy: [] },
		receivers: [],
	};

	it('returns status.state for "status"', () => {
		expect(getAlertSortValue(alert, 'status')).toBe('active');
	});

	it('returns alertname for "alertName"', () => {
		expect(getAlertSortValue(alert, 'alertName')).toBe('CPU');
	});

	it('returns severity for "severity"', () => {
		expect(getAlertSortValue(alert, 'severity')).toBe('critical');
	});

	it('returns elapsed ms for "firingSince"', () => {
		const result = getAlertSortValue(alert, 'firingSince');
		expect(typeof result).toBe('number');
		expect(result).toBeGreaterThan(0);
	});

	it('returns elapsed ms for "duration"', () => {
		const result = getAlertSortValue(alert, 'duration');
		expect(typeof result).toBe('number');
	});

	it('returns empty string for unknown columns', () => {
		expect(getAlertSortValue(alert, 'unknown')).toBe('');
	});

	it('returns empty string for missing fields', () => {
		const empty = { ...alert, status: undefined, labels: undefined };
		expect(getAlertSortValue(empty, 'status')).toBe('');
		expect(getAlertSortValue(empty, 'alertName')).toBe('');
		expect(getAlertSortValue(empty, 'severity')).toBe('');
	});

	it('returns empty for firingSince with no startsAt', () => {
		const empty = { ...alert, startsAt: undefined };
		expect(getAlertSortValue(empty, 'firingSince')).toBe('');
	});
});

describe('sortAlerts', () => {
	const a: Alert = {
		fingerprint: 'a',
		labels: { alertname: 'A' },
		annotations: {},
		startsAt: '2023-10-19T10:00:00Z',
		endsAt: '0001-01-01T00:00:00Z',
		status: { state: 'active', silencedBy: [], inhibitedBy: [] },
		receivers: [],
	};
	const b: Alert = { ...a, fingerprint: 'b', labels: { alertname: 'B' } };
	const c: Alert = { ...a, fingerprint: 'c', labels: { alertname: 'C' } };

	it('sorts ascending when given orderBy', () => {
		const order: SortState = { columnName: 'alertName', order: 'asc' };
		const result = sortAlerts([c, a, b], order);
		expect(result.map((x) => x.labels?.alertname)).toStrictEqual(['A', 'B', 'C']);
	});

	it('sorts descending', () => {
		const order: SortState = { columnName: 'alertName', order: 'desc' };
		const result = sortAlerts([a, b, c], order);
		expect(result.map((x) => x.labels?.alertname)).toStrictEqual(['C', 'B', 'A']);
	});

	it('falls back to default duration asc when orderBy is null', () => {
		const result = sortAlerts([a, b, c], null);
		expect(result).toHaveLength(3);
	});
});

describe('getRuleId', () => {
	const base: Alert = {
		labels: {},
		annotations: {},
		startsAt: '2023-10-19T10:00:00Z',
		endsAt: '0001-01-01T00:00:00Z',
		status: { state: 'active', silencedBy: [], inhibitedBy: [] },
		receivers: [],
		fingerprint: 'fp',
	};

	it('returns labels.ruleId when present', () => {
		expect(getRuleId({ ...base, labels: { ruleId: 'rule-1' } })).toBe('rule-1');
	});

	it('falls back to generatorURL when ruleId label missing', () => {
		expect(
			getRuleId({
				...base,
				generatorURL: 'http://localhost/foo?ruleId=rule-42',
			}),
		).toBe('rule-42');
	});

	it('prefers labels.ruleId over generatorURL', () => {
		expect(
			getRuleId({
				...base,
				labels: { ruleId: 'from-label' },
				generatorURL: 'http://localhost/foo?ruleId=from-url',
			}),
		).toBe('from-label');
	});

	it('returns null when generatorURL has no ruleId param', () => {
		expect(
			getRuleId({ ...base, generatorURL: 'http://localhost/foo' }),
		).toBeNull();
	});

	it('returns null when generatorURL is invalid', () => {
		expect(getRuleId({ ...base, generatorURL: 'not-a-url' })).toBeNull();
	});

	it('returns null when no source available', () => {
		expect(getRuleId(base)).toBeNull();
	});
});
