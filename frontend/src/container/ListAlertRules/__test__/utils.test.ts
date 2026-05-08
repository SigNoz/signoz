import type {
	RuletypesAlertStateDTO,
	RuletypesCompareOperatorDTO,
	RuletypesMatchTypeDTO,
	RuletypesPanelTypeDTO,
	RuletypesQueryTypeDTO,
	RuletypesRuleDTO,
} from 'api/generated/services/sigNoz.schemas';
import { NEW_ALERT_SCHEMA_VERSION } from 'types/api/alerts/alertTypesV2';

import { filterAlerts, getAlertSeverity } from '../utils';

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

	it('should filter v2 alerts by threshold-derived severity', () => {
		const v2Alert = ({
			...mockAlertBase,
			id: 'v2',
			alert: 'V2 Disk Pressure',
			alertType: 'METRIC_BASED_ALERT',
			schemaVersion: NEW_ALERT_SCHEMA_VERSION,
			condition: {
				...(mockAlertBase.condition || {}),
				thresholds: {
					kind: 'basic',
					spec: [
						{
							name: 'critical',
							target: 90,
							matchType: 'at_least_once',
							op: 'above',
							channels: [],
							targetUnit: '%',
						},
					],
				},
			},
		} as unknown) as RuletypesRuleDTO;

		const result = filterAlerts([...mockAlerts, v2Alert], 'critical');
		// v1 critical (Memory Leak) + v2 critical = 2 hits
		expect(result.map((a) => a.id).sort()).toEqual(['2', 'v2']);
	});
});

describe('getAlertSeverity', () => {
	it('returns labels.severity when present (v1 alert)', () => {
		const alert = ({
			labels: { severity: 'warning' },
		} as unknown) as RuletypesRuleDTO;
		expect(getAlertSeverity(alert)).toBe('warning');
	});

	it('returns joined threshold names for v2 alerts', () => {
		const alert = ({
			schemaVersion: NEW_ALERT_SCHEMA_VERSION,
			condition: {
				thresholds: {
					kind: 'basic',
					spec: [
						{ name: 'warning', target: 70 },
						{ name: 'critical', target: 90 },
					],
				},
			},
		} as unknown) as RuletypesRuleDTO;
		expect(getAlertSeverity(alert)).toBe('warning, critical');
	});

	it('prefers labels.severity over thresholds for v2 alerts when both present', () => {
		const alert = ({
			schemaVersion: NEW_ALERT_SCHEMA_VERSION,
			labels: { severity: 'critical' },
			condition: {
				thresholds: {
					kind: 'basic',
					spec: [{ name: 'warning' }],
				},
			},
		} as unknown) as RuletypesRuleDTO;
		expect(getAlertSeverity(alert)).toBe('critical');
	});

	it('returns undefined for v2 alerts with no thresholds and no severity label', () => {
		const alert = ({
			schemaVersion: NEW_ALERT_SCHEMA_VERSION,
			condition: { thresholds: { kind: 'basic', spec: [] } },
		} as unknown) as RuletypesRuleDTO;
		expect(getAlertSeverity(alert)).toBeUndefined();
	});

	it('returns undefined for v1 alert with no labels', () => {
		expect(getAlertSeverity({} as RuletypesRuleDTO)).toBeUndefined();
	});

	it('returns undefined for null input', () => {
		expect(getAlertSeverity(undefined)).toBeUndefined();
	});
});
