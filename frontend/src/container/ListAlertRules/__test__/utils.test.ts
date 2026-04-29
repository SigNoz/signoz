import type {
	RuletypesAlertStateDTO,
	RuletypesCompareOperatorDTO,
	RuletypesMatchTypeDTO,
	RuletypesPanelTypeDTO,
	RuletypesQueryTypeDTO,
	RuletypesRuleDTO,
} from 'api/generated/services/sigNoz.schemas';

import { filterAlerts } from '../utils';

describe('filterAlerts', () => {
	const mockAlertBase: Partial<RuletypesRuleDTO> = {
		state: 'active' as RuletypesAlertStateDTO,
		disabled: false,
		createdAt: new Date('2024-01-01T00:00:00Z'),
		createdBy: 'test-user',
		updatedAt: new Date('2024-01-01T00:00:00Z'),
		updatedBy: 'test-user',
		version: '1',
		condition: {
			compositeQuery: {
				queries: [],
				panelType: 'graph' as RuletypesPanelTypeDTO,
				queryType: 'builder' as RuletypesQueryTypeDTO,
			},
			matchType: 'at_least_once' as RuletypesMatchTypeDTO,
			op: 'above' as RuletypesCompareOperatorDTO,
		},
		ruleType: 'threshold_rule' as RuletypesRuleDTO['ruleType'],
	};

	const mockAlerts: RuletypesRuleDTO[] = [
		{
			...mockAlertBase,
			id: '1',
			alert: 'High CPU Usage',
			alertType: 'METRIC_BASED_ALERT',
			labels: {
				severity: 'warning',
				status: 'ok',
				environment: 'production',
			},
		} as RuletypesRuleDTO,
		{
			...mockAlertBase,
			id: '2',
			alert: 'Memory Leak Detected',
			alertType: 'METRIC_BASED_ALERT',
			labels: {
				severity: 'critical',
				status: 'firing',
				environment: 'staging',
			},
		} as RuletypesRuleDTO,
		{
			...mockAlertBase,
			id: '3',
			alert: 'Database Connection Error',
			alertType: 'METRIC_BASED_ALERT',
			labels: {
				severity: 'error',
				status: 'pending',
				environment: 'production',
			},
		} as RuletypesRuleDTO,
	];

	it('should return all alerts when filter is empty', () => {
		const result = filterAlerts(mockAlerts, '');
		expect(result).toStrictEqual(mockAlerts);
	});

	it('should return all alerts when filter is only whitespace', () => {
		const result = filterAlerts(mockAlerts, '   ');
		expect(result).toStrictEqual(mockAlerts);
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
		const alertsWithMissingLabels: RuletypesRuleDTO[] = [
			{
				...mockAlertBase,
				id: '4',
				alert: 'Test Alert',
				alertType: 'METRIC_BASED_ALERT',
				labels: undefined,
			} as RuletypesRuleDTO,
		];
		const result = filterAlerts(alertsWithMissingLabels, 'test');
		expect(result).toHaveLength(1);
		expect(result[0].alert).toBe('Test Alert');
	});

	it('should handle alerts with missing alert name', () => {
		const alertsWithMissingName: RuletypesRuleDTO[] = [
			{
				...mockAlertBase,
				id: '5',
				alert: '',
				alertType: 'METRIC_BASED_ALERT',
				labels: {
					severity: 'warning',
				},
			} as RuletypesRuleDTO,
		];
		const result = filterAlerts(alertsWithMissingName, 'warning');
		expect(result).toHaveLength(1);
		expect(result[0].labels?.severity).toBe('warning');
	});
});
