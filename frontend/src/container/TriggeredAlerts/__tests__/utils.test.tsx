import type { Alerts } from 'types/api/alerts/getTriggered';

import type { Value } from '../Filter';
import { FilterAlerts } from '../utils';

const createAlert = (
	fingerprint: string,
	labels: Alerts['labels'] = {},
): Alerts => ({
	annotations: { description: '', summary: '' },
	state: 'firing',
	name: 'test-alert',
	id: 1,
	endsAt: '',
	fingerprint,
	generatorURL: '',
	receivers: [],
	startsAt: '',
	status: { inhibitedBy: [], silencedBy: [], state: 'firing' },
	updatedAt: '',
	labels,
});

describe('FilterAlerts', () => {
	it('returns all alerts when no filters are selected', () => {
		const alerts = [createAlert('fp-1'), createAlert('fp-2')];
		const filters: Value[] = [];

		const result = FilterAlerts(alerts, filters);

		expect(result).toBe(alerts);
	});

	it('filters alerts that have matching label key and value', () => {
		const warningAlert = createAlert('warning', { severity: 'warning' });
		const criticalAlert = createAlert('critical', { severity: 'critical' });
		const alerts = [warningAlert, criticalAlert];
		const filters: Value[] = [{ value: 'severity:critical' }];

		const result = FilterAlerts(alerts, filters);

		expect(result).toEqual([criticalAlert]);
	});

	it('includes alerts when any filter matches', () => {
		const severityAlert = createAlert('severity', { severity: 'warning' });
		const teamAlert = createAlert('team', { team: 'core-observability' });
		const otherAlert = createAlert('other', { service: 'ingestor' });
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
		const alert = createAlert('trim-test', { severity: 'critical' });
		const alerts = [alert];
		const filters: Value[] = [{ value: '  severity  :  critical  ' }];

		const result = FilterAlerts(alerts, filters);

		expect(result).toEqual([alert]);
	});

	it('ignores filters that do not contain a key/value delimiter', () => {
		const alert = createAlert('invalid-filter', { severity: 'warning' });
		const alerts = [alert];
		const filters: Value[] = [{ value: 'severitywarning' }];

		const result = FilterAlerts(alerts, filters);

		expect(result).toEqual([]);
	});
});
