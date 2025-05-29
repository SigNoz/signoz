/* eslint-disable sonarjs/no-duplicate-string */
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
});
