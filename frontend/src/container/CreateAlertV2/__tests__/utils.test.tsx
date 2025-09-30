import { Color } from '@signozhq/design-tokens';
import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';
import { alertDefaults } from 'container/CreateAlertRule/defaults';
import { AlertDef } from 'types/api/alerts/def';

import { INITIAL_ALERT_STATE } from '../context/constants';
import {
	AlertThresholdMatchType,
	AlertThresholdOperator,
} from '../context/types';
import {
	getAdvancedOptionsStateFromAlertDef,
	getColorForThreshold,
	getCreateAlertLocalStateFromAlertDef,
	getEvaluationWindowStateFromAlertDef,
	getNotificationSettingsStateFromAlertDef,
	getThresholdStateFromAlertDef,
	parseGoTime,
} from '../utils';

describe('CreateAlertV2 utils', () => {
	describe('getColorForThreshold', () => {
		it('should return the correct color for the pre-defined threshold', () => {
			expect(getColorForThreshold('CRITICAL')).toBe(Color.BG_SAKURA_500);
			expect(getColorForThreshold('WARNING')).toBe(Color.BG_AMBER_500);
			expect(getColorForThreshold('INFO')).toBe(Color.BG_ROBIN_500);
		});
	});

	describe('parseGoTime', () => {
		it('should return the correct time and unit for the given input', () => {
			expect(parseGoTime('1h')).toStrictEqual({
				time: 1,
				unit: UniversalYAxisUnit.HOURS,
			});
			expect(parseGoTime('1m')).toStrictEqual({
				time: 1,
				unit: UniversalYAxisUnit.MINUTES,
			});
			expect(parseGoTime('1s')).toStrictEqual({
				time: 1,
				unit: UniversalYAxisUnit.SECONDS,
			});
			expect(parseGoTime('1h0m')).toStrictEqual({
				time: 1,
				unit: UniversalYAxisUnit.HOURS,
			});
		});
	});

	describe('getEvaluationWindowStateFromAlertDef', () => {
		it('for rolling window with non-custom timeframe', () => {
			const args: AlertDef = {
				...alertDefaults,
				evaluation: {
					...alertDefaults.evaluation,
					kind: 'rolling',
					spec: {
						evalWindow: '5m0s',
					},
				},
			};
			const props = getEvaluationWindowStateFromAlertDef(args);
			expect(props).toBeDefined();
			expect(props).toMatchObject({
				windowType: 'rolling',
				timeframe: '5m0s',
			});
		});

		it('for rolling window with custom timeframe', () => {
			const args: AlertDef = {
				...alertDefaults,
				evaluation: {
					...alertDefaults.evaluation,
					kind: 'rolling',
					spec: {
						evalWindow: '13m0s',
					},
				},
			};
			const props = getEvaluationWindowStateFromAlertDef(args);
			expect(props).toBeDefined();
			expect(props).toMatchObject({
				windowType: 'rolling',
				timeframe: 'custom',
				startingAt: {
					number: '13',
					unit: UniversalYAxisUnit.MINUTES,
				},
			});
		});

		it('for cumulative window with current hour', () => {
			const args: AlertDef = {
				...alertDefaults,
				evaluation: {
					...alertDefaults.evaluation,
					kind: 'cumulative',
					spec: {
						schedule: {
							type: 'hourly',
							minute: 14,
						},
					},
				},
			};
			const props = getEvaluationWindowStateFromAlertDef(args);
			expect(props).toBeDefined();
			expect(props).toMatchObject({
				windowType: 'cumulative',
				timeframe: 'currentHour',
				startingAt: {
					number: '14',
				},
			});
		});

		it('for cumulative window with current day', () => {
			const args: AlertDef = {
				...alertDefaults,
				evaluation: {
					...alertDefaults.evaluation,
					kind: 'cumulative',
					spec: {
						schedule: {
							type: 'daily',
							hour: 14,
						},
					},
				},
			};
			const props = getEvaluationWindowStateFromAlertDef(args);
			expect(props).toBeDefined();
			expect(props).toMatchObject({
				windowType: 'cumulative',
				timeframe: 'currentDay',
				startingAt: {
					time: '14:00:00',
				},
			});
		});

		it('for cumulative window with current month', () => {
			const args: AlertDef = {
				...alertDefaults,
				evaluation: {
					...alertDefaults.evaluation,
					kind: 'cumulative',
					spec: {
						schedule: {
							type: 'monthly',
							day: 12,
						},
						timezone: 'UTC',
					},
				},
			};
			const props = getEvaluationWindowStateFromAlertDef(args);
			expect(props).toBeDefined();
			expect(props).toMatchObject({
				windowType: 'cumulative',
				timeframe: 'currentMonth',
				startingAt: {
					number: '12',
					timezone: 'UTC',
				},
			});
		});
	});

	describe('getNotificationSettingsStateFromAlertDef', () => {
		it('should return the correct notification settings state for the given alert def', () => {
			const args: AlertDef = {
				...alertDefaults,
				annotations: {
					description: 'test description',
				},
				notificationSettings: {
					notificationGroupBy: ['email'],
					renotify: '1m0s',
					alertStates: ['firing'],
					notificationPolicy: true,
				},
			};
			const props = getNotificationSettingsStateFromAlertDef(args);
			expect(props).toBeDefined();
			expect(props).toMatchObject({
				multipleNotifications: ['email'],
				reNotification: {
					enabled: true,
					value: 1,
					unit: UniversalYAxisUnit.MINUTES,
					conditions: ['firing'],
				},
				description: 'test description',
				routingPolicies: true,
			});
		});

		it('when renotification is not provided', () => {
			const args: AlertDef = {
				...alertDefaults,
				notificationSettings: {
					notificationGroupBy: ['email'],
				},
			};
			const props = getNotificationSettingsStateFromAlertDef(args);
			expect(props).toBeDefined();
			expect(props).toMatchObject({
				multipleNotifications: ['email'],
				reNotification: {
					enabled: false,
					value: 1,
					unit: UniversalYAxisUnit.MINUTES,
					conditions: [],
				},
			});
		});
	});

	describe('getAdvancedOptionsStateFromAlertDef', () => {
		it('should return the correct advanced options state for the given alert def', () => {
			const args: AlertDef = {
				...alertDefaults,
				condition: {
					...alertDefaults.condition,
					compositeQuery: {
						...alertDefaults.condition.compositeQuery,
						unit: UniversalYAxisUnit.MINUTES,
					},
					requiredNumPoints: 13,
					requireMinPoints: true,
					alertOnAbsent: true,
					absentFor: 12,
				},
				evaluation: {
					...alertDefaults.evaluation,
					spec: {
						frequency: '1m0s',
					},
				},
			};
			const props = getAdvancedOptionsStateFromAlertDef(args);
			expect(props).toBeDefined();
			expect(props).toMatchObject({
				sendNotificationIfDataIsMissing: {
					enabled: true,
					toleranceLimit: 12,
					timeUnit: UniversalYAxisUnit.MINUTES,
				},
				enforceMinimumDatapoints: {
					enabled: true,
					minimumDatapoints: 13,
				},
				evaluationCadence: {
					mode: 'default',
					default: {
						value: 1,
						timeUnit: UniversalYAxisUnit.MINUTES,
					},
				},
			});
		});
	});

	describe('getThresholdStateFromAlertDef', () => {
		const args: AlertDef = {
			...alertDefaults,
			condition: {
				...alertDefaults.condition,
				thresholds: {
					kind: 'basic',
					spec: [
						{
							name: 'CRITICAL',
							target: 1,
							targetUnit: UniversalYAxisUnit.MINUTES,
							channels: ['email'],
							matchType: AlertThresholdMatchType.AT_LEAST_ONCE,
							op: AlertThresholdOperator.IS_ABOVE,
						},
					],
				},
				selectedQueryName: 'test',
			},
		};
		const props = getThresholdStateFromAlertDef(args);
		expect(props).toBeDefined();
		expect(props).toMatchObject({
			selectedQuery: 'test',
			operator: AlertThresholdOperator.IS_ABOVE,
			matchType: AlertThresholdMatchType.AT_LEAST_ONCE,
			thresholds: [
				{
					id: expect.any(String),
					label: 'CRITICAL',
					thresholdValue: 1,
					recoveryThresholdValue: null,
					unit: UniversalYAxisUnit.MINUTES,
					color: Color.BG_SAKURA_500,
					channels: ['email'],
				},
			],
		});
	});

	describe('getCreateAlertLocalStateFromAlertDef', () => {
		it('should return the correct create alert local state for the given alert def', () => {
			const args: AlertDef = {
				...alertDefaults,
				alert: 'test-alert',
				labels: {
					severity: 'warning',
					team: 'test-team',
				},
				condition: {
					...alertDefaults.condition,
					compositeQuery: {
						...alertDefaults.condition.compositeQuery,
						unit: UniversalYAxisUnit.MINUTES,
					},
				},
			};
			const props = getCreateAlertLocalStateFromAlertDef(args);
			expect(props).toBeDefined();
			expect(props).toMatchObject({
				basicAlertState: {
					...INITIAL_ALERT_STATE,
					name: 'test-alert',
					labels: {
						severity: 'warning',
						team: 'test-team',
					},
					yAxisUnit: UniversalYAxisUnit.MINUTES,
				},
				// as we have already verified these utils in their respective tests
				thresholdState: expect.any(Object),
				advancedOptionsState: expect.any(Object),
				evaluationWindowState: expect.any(Object),
				notificationSettingsState: expect.any(Object),
			});
		});
	});
});
