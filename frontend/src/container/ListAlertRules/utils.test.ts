/* eslint-disable sonarjs/no-duplicate-string */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GettableAlert } from 'types/api/alerts/get';
import { EQueryType } from 'types/common/dashboard';

import { filterAlerts } from './utils';

const testLabels = { severity: 'warning', cluster: 'prod', test: 'value' };

const baseAlert: GettableAlert = {
	id: '1',
	alert: 'CPU Usage High',
	state: 'inactive',
	disabled: false,
	createAt: '',
	createBy: '',
	updateAt: '',
	updateBy: '',
	alertType: 'type',
	ruleType: 'rule',
	frequency: '1m',
	condition: {
		compositeQuery: {
			builderQueries: {},
			promQueries: {},
			chQueries: {},
			queryType: EQueryType.QUERY_BUILDER,
			panelType: PANEL_TYPES.TABLE,
			unit: '',
		},
	},
	labels: testLabels,
	annotations: {},
	evalWindow: '',
	source: '',
	preferredChannels: [],
	broadcastToAll: false,
	version: '',
};

const alerts: GettableAlert[] = [
	{
		...baseAlert,
		id: '1',
		alert: 'CPU Usage High',
		state: 'inactive',
		labels: testLabels,
	},
	{
		...baseAlert,
		id: '2',
		alert: 'Memory Usage',
		state: 'firing',
		labels: { severity: 'critical', cluster: 'dev', test: 'other' },
	},
	{
		...baseAlert,
		id: '3',
		alert: 'Disk IO',
		state: 'pending',
		labels: testLabels,
	},
	{
		...baseAlert,
		id: '4',
		alert: 'Network Latency',
		state: 'disabled',
		labels: { severity: 'info', cluster: 'qa', test: 'value' },
	},
];

describe('filterAlerts', () => {
	it('returns all alerts if filter is empty', () => {
		expect(filterAlerts(alerts, '')).toHaveLength(alerts.length);
	});

	it('matches by alert name (case-insensitive)', () => {
		const result = filterAlerts(alerts, 'cpu usage');
		expect(result).toHaveLength(1);
		expect(result[0].alert).toBe('CPU Usage High');
	});

	it('matches by severity', () => {
		const result = filterAlerts(alerts, 'warning');
		expect(result.map((a) => a.id)).toEqual(['1', '3']);
	});

	it('matches by label key or value', () => {
		const result = filterAlerts(alerts, 'prod');
		expect(result.map((a) => a.id)).toEqual(['1', '3']);
	});

	it('matches by multi-word AND search', () => {
		const result = filterAlerts(alerts, 'cpu prod');
		expect(result.map((a) => a.id)).toEqual(['1']);
	});

	it('matches by key:value (label)', () => {
		const result = filterAlerts(alerts, 'test:value');
		expect(result.map((a) => a.id)).toEqual(['1', '3', '4']);
	});

	it('matches by key: value (label, with space)', () => {
		const result = filterAlerts(alerts, 'test: value');
		expect(result.map((a) => a.id)).toEqual(['1', '3', '4']);
	});

	it('matches by key:value (severity)', () => {
		const result = filterAlerts(alerts, 'severity:warning');
		expect(result.map((a) => a.id)).toEqual(['1', '3']);
	});

	it('matches by key:value (status:ok)', () => {
		const result = filterAlerts(alerts, 'status:ok');
		expect(result.map((a) => a.id)).toEqual(['1']);
	});

	it('matches by key:value (status:inactive)', () => {
		const result = filterAlerts(alerts, 'status:inactive');
		expect(result.map((a) => a.id)).toEqual(['1']);
	});

	it('matches by key:value (status:firing)', () => {
		const result = filterAlerts(alerts, 'status:firing');
		expect(result.map((a) => a.id)).toEqual(['2']);
	});

	it('matches by key:value (status:pending)', () => {
		const result = filterAlerts(alerts, 'status:pending');
		expect(result.map((a) => a.id)).toEqual(['3']);
	});

	it('matches by key:value (status:disabled)', () => {
		const result = filterAlerts(alerts, 'status:disabled');
		expect(result.map((a) => a.id)).toEqual(['4']);
	});

	it('matches by key:value (cluster:prod)', () => {
		const result = filterAlerts(alerts, 'cluster:prod');
		expect(result.map((a) => a.id)).toEqual(['1', '3']);
	});

	it('matches by key:value (cluster:dev)', () => {
		const result = filterAlerts(alerts, 'cluster:dev');
		expect(result.map((a) => a.id)).toEqual(['2']);
	});

	it('matches by key:value (case-insensitive)', () => {
		const result = filterAlerts(alerts, 'CLUSTER:PROD');
		expect(result.map((a) => a.id)).toEqual(['1', '3']);
	});

	it('matches by combination of word and key:value', () => {
		const result = filterAlerts(alerts, 'cpu status:ok');
		expect(result.map((a) => a.id)).toEqual(['1']);
	});

	it('returns empty if no match', () => {
		const result = filterAlerts(alerts, 'notfound');
		expect(result).toHaveLength(0);
	});
});
