/* eslint-disable sonarjs/no-duplicate-string */
import { NEW_ALERT_SCHEMA_VERSION } from 'types/api/alerts/alertTypesV2';
import { GettableAlert } from 'types/api/alerts/get';

import { filterAlerts } from '../utils';

describe('filterAlerts', () => {
	const mockAlertBase: Partial<GettableAlert> = {
		state: 'active',
		disabled: false,
		createAt: '2024-01-01T00:00:00Z',
		createBy: 'test-user',
		updateAt: '2024-01-01T00:00:00Z',
		updateBy: 'test-user',
		version: '1',
	};

	const mockAlerts: GettableAlert[] = [
		{
			...mockAlertBase,
			id: '1',
			alert: 'High CPU Usage',
			alertType: 'metrics',
			labels: {
				severity: 'warning',
				status: 'ok',
				environment: 'production',
			},
		} as GettableAlert,
		{
			...mockAlertBase,
			id: '2',
			alert: 'Memory Leak Detected',
			alertType: 'metrics',
			labels: {
				severity: 'critical',
				status: 'firing',
				environment: 'staging',
			},
		} as GettableAlert,
		{
			...mockAlertBase,
			id: '3',
			alert: 'Database Connection Error',
			alertType: 'metrics',
			labels: {
				severity: 'error',
				status: 'pending',
				environment: 'production',
			},
		} as GettableAlert,
	];

	it('should return all alerts when filter is empty', () => {
		const result = filterAlerts(mockAlerts, '');
		expect(result).toEqual(mockAlerts);
	});

	it('should return all alerts when filter is only whitespace', () => {
		const result = filterAlerts(mockAlerts, '   ');
		expect(result).toEqual(mockAlerts);
	});

	it('should filter alerts by alert name', () => {
		const result = filterAlerts(mockAlerts, 'CPU');
		expect(result).toHaveLength(1);
		expect(result[0].alert).toBe('High CPU Usage');
	});

	it('should filter alerts by severity', () => {
		const result = filterAlerts(mockAlerts, 'warning');
		expect(result).toHaveLength(1);
		expect(result[0].labels?.severity).toBe('warning');
	});

	it('should filter alerts by label key', () => {
		const result = filterAlerts(mockAlerts, 'environment');
		expect(result).toHaveLength(3); // All alerts have environment label
	});

	it('should filter alerts by label value', () => {
		const result = filterAlerts(mockAlerts, 'production');
		expect(result).toHaveLength(2);
		expect(
			result.every((alert) => alert.labels?.environment === 'production'),
		).toBe(true);
	});

	it('should be case insensitive', () => {
		const result = filterAlerts(mockAlerts, 'cpu');
		expect(result).toHaveLength(1);
		expect(result[0].alert).toBe('High CPU Usage');
	});

	it('should handle partial matches', () => {
		const result = filterAlerts(mockAlerts, 'mem');
		expect(result).toHaveLength(1);
		expect(result[0].alert).toBe('Memory Leak Detected');
	});

	it('should handle alerts with missing labels', () => {
		const alertsWithMissingLabels: GettableAlert[] = [
			{
				...mockAlertBase,
				id: '4',
				alert: 'Test Alert',
				alertType: 'metrics',
				labels: undefined,
			} as GettableAlert,
		];
		const result = filterAlerts(alertsWithMissingLabels, 'test');
		expect(result).toHaveLength(1);
		expect(result[0].alert).toBe('Test Alert');
	});

	it('should handle alerts with missing alert name', () => {
		const alertsWithMissingName: GettableAlert[] = [
			{
				...mockAlertBase,
				id: '5',
				alert: '',
				alertType: 'metrics',
				labels: {
					severity: 'warning',
				},
			} as GettableAlert,
		];
		const result = filterAlerts(alertsWithMissingName, 'warning');
		expect(result).toHaveLength(1);
		expect(result[0].labels?.severity).toBe('warning');
	});

	it('should filter v2 alerts by severity from thresholds', () => {
		const v2Alerts: GettableAlert[] = [
			({
				...mockAlertBase,
				id: '6',
				alert: 'V2 Alert Critical',
				alertType: 'metrics',
				schemaVersion: NEW_ALERT_SCHEMA_VERSION,
				condition: {
					thresholds: {
						kind: 'multi_threshold',
						spec: [{ name: 'critical', target: 100 }],
					},
				},
				labels: {},
			} as unknown) as GettableAlert,
			({
				...mockAlertBase,
				id: '7',
				alert: 'V2 Alert Warning',
				alertType: 'metrics',
				schemaVersion: NEW_ALERT_SCHEMA_VERSION,
				condition: {
					thresholds: {
						kind: 'multi_threshold',
						spec: [{ name: 'warning', target: 50 }],
					},
				},
				labels: {},
			} as unknown) as GettableAlert,
		];
		const result = filterAlerts(v2Alerts, 'critical');
		expect(result).toHaveLength(1);
		expect(result[0].alert).toBe('V2 Alert Critical');
	});

	it('should filter v2 alerts with multiple severities', () => {
		const v2AlertsMultiple: GettableAlert[] = [
			({
				...mockAlertBase,
				id: '8',
				alert: 'V2 Alert Multiple Severities',
				alertType: 'metrics',
				schemaVersion: NEW_ALERT_SCHEMA_VERSION,
				condition: {
					thresholds: {
						kind: 'multi_threshold',
						spec: [
							{ name: 'warning', target: 50 },
							{ name: 'critical', target: 100 },
						],
					},
				},
				labels: {},
			} as unknown) as GettableAlert,
		];
		// Should match 'warning' in the multiple thresholds
		const warningResult = filterAlerts(v2AlertsMultiple, 'warning');
		expect(warningResult).toHaveLength(1);

		// Should also match 'critical' in the multiple thresholds
		const criticalResult = filterAlerts(v2AlertsMultiple, 'critical');
		expect(criticalResult).toHaveLength(1);
	});

	it('should handle v2 alerts with empty thresholds', () => {
		const v2AlertsEmpty: GettableAlert[] = [
			({
				...mockAlertBase,
				id: '9',
				alert: 'V2 Alert No Thresholds',
				alertType: 'metrics',
				schemaVersion: NEW_ALERT_SCHEMA_VERSION,
				condition: {
					thresholds: {
						kind: 'multi_threshold',
						spec: [],
					},
				},
				labels: {},
			} as unknown) as GettableAlert,
		];
		// Should not match any severity
		const result = filterAlerts(v2AlertsEmpty, 'critical');
		expect(result).toHaveLength(0);

		// Should match by alert name
		const nameResult = filterAlerts(v2AlertsEmpty, 'No Thresholds');
		expect(nameResult).toHaveLength(1);
	});
});
