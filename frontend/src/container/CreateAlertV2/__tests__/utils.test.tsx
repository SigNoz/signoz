import { Color } from '@signozhq/design-tokens';
import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';
import { PostableAlertRuleV2 } from 'types/api/alerts/alertTypesV2';

import { defaultPostableAlertRuleV2 } from '../constants';
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
			expect(getColorForThreshold('critical')).toBe(Color.BG_SAKURA_500);
			expect(getColorForThreshold('warning')).toBe(Color.BG_AMBER_500);
			expect(getColorForThreshold('info')).toBe(Color.BG_ROBIN_500);
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
			const args: PostableAlertRuleV2 = {
				...defaultPostableAlertRuleV2,
				evaluation: {
					...defaultPostableAlertRuleV2.evaluation,
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
			const args: PostableAlertRuleV2 = {
				...defaultPostableAlertRuleV2,
				evaluation: {
					...defaultPostableAlertRuleV2.evaluation,
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
			const args: PostableAlertRuleV2 = {
				...defaultPostableAlertRuleV2,
				evaluation: {
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
			const args: PostableAlertRuleV2 = {
				...defaultPostableAlertRuleV2,
				evaluation: {
					...defaultPostableAlertRuleV2.evaluation,
					kind: 'cumulative',
					spec: {
						schedule: {
							type: 'daily',
							hour: 14,
							minute: 15,
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
					time: '14:15:00',
				},
			});
		});

		it('for cumulative window with current month', () => {
			const args: PostableAlertRuleV2 = {
				...defaultPostableAlertRuleV2,
				evaluation: {
					...defaultPostableAlertRuleV2.evaluation,
					kind: 'cumulative',
					spec: {
						schedule: {
							type: 'monthly',
							day: 12,
							hour: 16,
							minute: 34,
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
					time: '16:34:00',
				},
			});
		});
	});

	describe('getNotificationSettingsStateFromAlertDef', () => {
		it('should return the correct notification settings state for the given alert def', () => {
			const args: PostableAlertRuleV2 = {
				...defaultPostableAlertRuleV2,
				notificationSettings: {
					groupBy: ['email'],
					renotify: {
						enabled: true,
						interval: '1m0s',
						alertStates: ['firing'],
					},
					usePolicy: true,
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
				description:
					'This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})',
				routingPolicies: true,
			});
		});

		it('when renotification is not provided', () => {
			const args: PostableAlertRuleV2 = {
				...defaultPostableAlertRuleV2,
				notificationSettings: {
					groupBy: ['email'],
					usePolicy: false,
				},
			};
			const props = getNotificationSettingsStateFromAlertDef(args);
			expect(props).toBeDefined();
			expect(props).toMatchObject({
				multipleNotifications: ['email'],
				reNotification: {
					enabled: false,
					value: 30,
					unit: UniversalYAxisUnit.MINUTES,
					conditions: [],
				},
			});
		});
	});

	describe('getAdvancedOptionsStateFromAlertDef', () => {
		it('should return the correct advanced options state for the given alert def', () => {
			const args: PostableAlertRuleV2 = {
				...defaultPostableAlertRuleV2,
				condition: {
					...defaultPostableAlertRuleV2.condition,
					compositeQuery: {
						...defaultPostableAlertRuleV2.condition.compositeQuery,
						unit: UniversalYAxisUnit.MINUTES,
					},
					requiredNumPoints: 13,
					requireMinPoints: true,
					alertOnAbsent: true,
					absentFor: 12,
				},
				evaluation: {
					...defaultPostableAlertRuleV2.evaluation,
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
		const args: PostableAlertRuleV2 = {
			...defaultPostableAlertRuleV2,
			annotations: {
				summary: 'test summary',
				description: 'test description',
			},
			condition: {
				...defaultPostableAlertRuleV2.condition,
				thresholds: {
					kind: 'basic',
					spec: [
						{
							name: 'critical',
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
					label: 'critical',
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
			const args: PostableAlertRuleV2 = {
				...defaultPostableAlertRuleV2,
				annotations: {
					summary: 'test summary',
					description: 'test description',
				},
				alert: 'test-alert',
				labels: {
					severity: 'warning',
					team: 'test-team',
				},
				condition: {
					...defaultPostableAlertRuleV2.condition,
					compositeQuery: {
						...defaultPostableAlertRuleV2.condition.compositeQuery,
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
