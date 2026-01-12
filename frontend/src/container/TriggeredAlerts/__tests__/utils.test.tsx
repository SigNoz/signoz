import type { Value } from '../Filter';
import { FilterAlerts } from '../utils';
import { createAlert } from './mockUtils';

describe('FilterAlerts', () => {
	it('returns all alerts when no filters are selected', () => {
		const alerts = [
			createAlert({ fingerprint: 'fp-1' }),
			createAlert({ fingerprint: 'fp-2' }),
		];
		const filters: Value[] = [];

		const result = FilterAlerts(alerts, filters);

		expect(result).toBe(alerts);
	});

	it('filters alerts that have matching label key and value', () => {
		const warningAlert = createAlert({
			fingerprint: 'warning',
			labels: { severity: 'warning' },
		});
		const criticalAlert = createAlert({
			fingerprint: 'critical',
			labels: { severity: 'critical' },
		});
		const alerts = [warningAlert, criticalAlert];
		const filters: Value[] = [{ value: 'severity:critical' }];

		const result = FilterAlerts(alerts, filters);

		expect(result).toEqual([criticalAlert]);
	});

	it('includes alerts when any filter matches', () => {
		const severityAlert = createAlert({
			fingerprint: 'severity',
			labels: { severity: 'warning' },
		});
		const teamAlert = createAlert({
			fingerprint: 'team',
			labels: { team: 'core-observability' },
		});
		const otherAlert = createAlert({
			fingerprint: 'other',
			labels: { service: 'ingestor' },
		});
		const alerts = [severityAlert, teamAlert, otherAlert];
		const filters: Value[] = [
			{ value: 'severity:warning' },
			{ value: 'team:core-observability' },
		];

		const result = FilterAlerts(alerts, filters);

		expect(result).toHaveLength(2);
		expect(result).toEqual([severityAlert, teamAlert]);
	});

	it('matches labels even when filters contain surrounding whitespace', () => {
		const alert = createAlert({
			fingerprint: 'trim-test',
			labels: { severity: 'critical' },
		});
		const alerts = [alert];
		const filters: Value[] = [{ value: '  severity  :  critical  ' }];

		const result = FilterAlerts(alerts, filters);

		expect(result).toEqual([alert]);
	});

	it('ignores filters that do not contain a key/value delimiter', () => {
		const alert = createAlert({
			fingerprint: 'invalid-filter',
			labels: { severity: 'warning' },
		});
		const alerts = [alert];
		const filters: Value[] = [{ value: 'severitywarning' }];

		const result = FilterAlerts(alerts, filters);

		expect(result).toEqual([]);
	});
});
