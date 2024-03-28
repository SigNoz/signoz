import { Alerts } from 'types/api/alerts/getTriggered';

import { Value } from './Filter';
import { FilterAlerts } from './utils';

describe('FilterAlerts function', () => {
	const alerts: Alerts[] = [
		{
			labels: { severity: 'critical', app: 'myApp' },
			annotations: { description: 'Alert description', summary: 'Alert summary' },
			state: 'active',
			name: 'Alert 1',
			id: 1,
			endsAt: '2023-12-05T12:00:00Z',
			fingerprint: 'fingerprint1',
			generatorURL: 'generatorURL1',
			receivers: [],
			startsAt: '2023-12-05T11:00:00Z',
			status: { inhibitedBy: [], silencedBy: [], state: 'active' },
			updatedAt: '2023-12-05T11:30:00Z',
		},
	];

	const selectedFilter: Value[] = [
		{ value: 'severity:critical' },
		{ value: 'app:myApp' },
	];

	it('should filter alerts based on the selected filter', () => {
		const filteredAlerts = FilterAlerts(alerts, selectedFilter);
		expect(filteredAlerts).toHaveLength(1);
		expect(filteredAlerts[0].fingerprint).toEqual('fingerprint1');
	});

	it('should return all alerts when no filter is selected', () => {
		const allAlerts = FilterAlerts(alerts, []);
		expect(allAlerts).toHaveLength(alerts.length);
	});
});
