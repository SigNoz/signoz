import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';
import { initialQueriesMap } from 'constants/queryBuilder';
import {
	INITIAL_ADVANCED_OPTIONS_STATE,
	INITIAL_ALERT_STATE,
	INITIAL_ALERT_THRESHOLD_STATE,
	INITIAL_EVALUATION_WINDOW_STATE,
	INITIAL_NOTIFICATION_SETTINGS_STATE,
} from 'container/CreateAlertV2/context/constants';
import {
	AdvancedOptionsState,
	EvaluationWindowState,
	NotificationSettingsState,
} from 'container/CreateAlertV2/context/types';
import { createMockAlertContextState } from 'container/CreateAlertV2/EvaluationSettings/__tests__/testUtils';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { EQueryType } from 'types/common/dashboard';

import { BuildCreateAlertRulePayloadArgs } from '../types';
import {
	buildCreateThresholdAlertRulePayload,
	getAlertOnAbsentProps,
	getEnforceMinimumDatapointsProps,
	getEvaluationProps,
	getFormattedTimeValue,
	getNotificationSettingsProps,
	validateCreateAlertState,
} from '../utils';

describe('Footer utils', () => {
	describe('getFormattedTimeValue', () => {
		it('for 60 seconds', () => {
			expect(getFormattedTimeValue(60, UniversalYAxisUnit.SECONDS)).toBe('60s');
		});
		it('for 60 minutes', () => {
			expect(getFormattedTimeValue(60, UniversalYAxisUnit.MINUTES)).toBe('60m');
		});
		it('for 60 hours', () => {
			expect(getFormattedTimeValue(60, UniversalYAxisUnit.HOURS)).toBe('60h');
		});
		it('for 60 days', () => {
			expect(getFormattedTimeValue(60, UniversalYAxisUnit.DAYS)).toBe('60d');
		});
	});

	describe('validateCreateAlertState', () => {
		const args: BuildCreateAlertRulePayloadArgs = {
			alertType: AlertTypes.METRICS_BASED_ALERT,
			basicAlertState: INITIAL_ALERT_STATE,
			thresholdState: INITIAL_ALERT_THRESHOLD_STATE,
			advancedOptions: INITIAL_ADVANCED_OPTIONS_STATE,
			evaluationWindow: INITIAL_EVALUATION_WINDOW_STATE,
			notificationSettings: INITIAL_NOTIFICATION_SETTINGS_STATE,
			query: initialQueriesMap.metrics,
		};

		it('when alert name is not provided', () => {
			expect(validateCreateAlertState(args)).toBeDefined();
			expect(validateCreateAlertState(args)).toBe('Please enter an alert name');
		});

		it('when threshold label is not provided', () => {
			const currentArgs: BuildCreateAlertRulePayloadArgs = {
				...args,
				basicAlertState: {
					...args.basicAlertState,
					name: 'test name',
				},
				thresholdState: {
					...args.thresholdState,
					thresholds: [
						{
							...args.thresholdState.thresholds[0],
							label: '',
						},
					],
				},
			};
			expect(validateCreateAlertState(currentArgs)).toBeDefined();
			expect(validateCreateAlertState(currentArgs)).toBe(
				'Please enter a label for each threshold',
			);
		});

		it('when threshold channels are not provided', () => {
			const currentArgs: BuildCreateAlertRulePayloadArgs = {
				...args,
				basicAlertState: {
					...args.basicAlertState,
					name: 'test name',
				},
			};
			expect(validateCreateAlertState(currentArgs)).toBeDefined();
			expect(validateCreateAlertState(currentArgs)).toBe(
				'Please select at least one channel for each threshold or enable routing policies',
			);
		});

		it('when threshold channels are not provided but routing policies are enabled', () => {
			const currentArgs: BuildCreateAlertRulePayloadArgs = {
				...args,
				basicAlertState: {
					...args.basicAlertState,
					name: 'test name',
				},
				notificationSettings: {
					...args.notificationSettings,
					routingPolicies: true,
				},
			};
			expect(validateCreateAlertState(currentArgs)).toBeNull();
		});

		it('when threshold channels are provided', () => {
			const currentArgs: BuildCreateAlertRulePayloadArgs = {
				...args,
				basicAlertState: {
					...args.basicAlertState,
					name: 'test name',
				},
				thresholdState: {
					...args.thresholdState,
					thresholds: [
						{
							...args.thresholdState.thresholds[0],
							channels: ['test channel'],
						},
					],
				},
			};
			expect(validateCreateAlertState(currentArgs)).toBeNull();
		});
	});

	describe('getNotificationSettingsProps', () => {
		it('when initial notification settings are provided', () => {
			const notificationSettings = INITIAL_NOTIFICATION_SETTINGS_STATE;
			const props = getNotificationSettingsProps(notificationSettings);
			expect(props).toBeDefined();
			expect(props).toStrictEqual({
				groupBy: [],
				renotify: {
					enabled: false,
					interval: '30m',
					alertStates: [],
				},
				usePolicy: false,
			});
		});
	});

	it('renotification is enabled', () => {
		const notificationSettings: NotificationSettingsState = {
			...INITIAL_NOTIFICATION_SETTINGS_STATE,
			reNotification: {
				enabled: true,
				value: 30,
				unit: UniversalYAxisUnit.MINUTES,
				conditions: ['firing'],
			},
		};
		const props = getNotificationSettingsProps(notificationSettings);
		expect(props).toBeDefined();
		expect(props).toStrictEqual({
			groupBy: [],
			renotify: {
				enabled: true,
				interval: '30m',
				alertStates: ['firing'],
			},
			usePolicy: false,
		});
	});

	it('routing policies are enabled', () => {
		const notificationSettings: NotificationSettingsState = {
			...INITIAL_NOTIFICATION_SETTINGS_STATE,
			routingPolicies: true,
		};
		const props = getNotificationSettingsProps(notificationSettings);
		expect(props).toBeDefined();
		expect(props).toStrictEqual({
			groupBy: [],
			renotify: {
				enabled: false,
				interval: '30m',
				alertStates: [],
			},
			usePolicy: true,
		});
	});

	it('group by notifications are provided', () => {
		const notificationSettings: NotificationSettingsState = {
			...INITIAL_NOTIFICATION_SETTINGS_STATE,
			multipleNotifications: ['test group'],
		};
		const props = getNotificationSettingsProps(notificationSettings);
		expect(props).toBeDefined();
		expect(props).toStrictEqual({
			groupBy: ['test group'],
			renotify: {
				enabled: false,
				interval: '30m',
				alertStates: [],
			},
			usePolicy: false,
		});
	});

	describe('getAlertOnAbsentProps', () => {
		it('when alert on absent is disabled', () => {
			const advancedOptions: AdvancedOptionsState = {
				...INITIAL_ADVANCED_OPTIONS_STATE,
				sendNotificationIfDataIsMissing: {
					enabled: false,
					toleranceLimit: 0,
					timeUnit: UniversalYAxisUnit.MINUTES,
				},
			};
			const props = getAlertOnAbsentProps(advancedOptions);
			expect(props).toBeDefined();
			expect(props).toStrictEqual({
				alertOnAbsent: false,
			});
		});

		it('when alert on absent is enabled', () => {
			const advancedOptions: AdvancedOptionsState = {
				...INITIAL_ADVANCED_OPTIONS_STATE,
				sendNotificationIfDataIsMissing: {
					enabled: true,
					toleranceLimit: 13,
					timeUnit: UniversalYAxisUnit.MINUTES,
				},
			};
			const props = getAlertOnAbsentProps(advancedOptions);
			expect(props).toBeDefined();
			expect(props).toStrictEqual({
				alertOnAbsent: true,
				absentFor: 13,
			});
		});
	});

	describe('getEnforceMinimumDatapointsProps', () => {
		it('when enforce minimum datapoints is disabled', () => {
			const advancedOptions: AdvancedOptionsState = {
				...INITIAL_ADVANCED_OPTIONS_STATE,
				enforceMinimumDatapoints: {
					enabled: false,
					minimumDatapoints: 0,
				},
			};
			const props = getEnforceMinimumDatapointsProps(advancedOptions);
			expect(props).toBeDefined();
			expect(props).toStrictEqual({
				requireMinPoints: false,
			});
		});

		it('when enforce minimum datapoints is enabled', () => {
			const advancedOptions: AdvancedOptionsState = {
				...INITIAL_ADVANCED_OPTIONS_STATE,
				enforceMinimumDatapoints: {
					enabled: true,
					minimumDatapoints: 12,
				},
			};
			const props = getEnforceMinimumDatapointsProps(advancedOptions);
			expect(props).toBeDefined();
			expect(props).toStrictEqual({
				requireMinPoints: true,
				requiredNumPoints: 12,
			});
		});
	});

	describe('getEvaluationProps', () => {
		const advancedOptions: AdvancedOptionsState = {
			...INITIAL_ADVANCED_OPTIONS_STATE,
			evaluationCadence: {
				...INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence,
				mode: 'default',
				default: {
					value: 12,
					timeUnit: UniversalYAxisUnit.MINUTES,
				},
			},
		};

		it('for rolling window with non-custom timeframe', () => {
			const evaluationWindow: EvaluationWindowState = {
				...INITIAL_EVALUATION_WINDOW_STATE,
				windowType: 'rolling',
				timeframe: '5m0s',
			};
			const props = getEvaluationProps(evaluationWindow, advancedOptions);
			expect(props).toBeDefined();
			expect(props).toStrictEqual({
				kind: 'rolling',
				spec: {
					evalWindow: '5m0s',
					frequency: '12m',
				},
			});
		});

		it('for rolling window with custom timeframe', () => {
			const evaluationWindow: EvaluationWindowState = {
				...INITIAL_EVALUATION_WINDOW_STATE,
				windowType: 'rolling',
				timeframe: 'custom',
				startingAt: {
					...INITIAL_EVALUATION_WINDOW_STATE.startingAt,
					number: '13',
					unit: UniversalYAxisUnit.MINUTES,
				},
			};
			const props = getEvaluationProps(evaluationWindow, advancedOptions);
			expect(props).toBeDefined();
			expect(props).toStrictEqual({
				kind: 'rolling',
				spec: {
					evalWindow: '13m',
					frequency: '12m',
				},
			});
		});

		it('for cumulative window with current hour', () => {
			const evaluationWindow: EvaluationWindowState = {
				...INITIAL_EVALUATION_WINDOW_STATE,
				windowType: 'cumulative',
				timeframe: 'currentHour',
				startingAt: {
					...INITIAL_EVALUATION_WINDOW_STATE.startingAt,
					number: '14',
					timezone: 'UTC',
				},
			};
			const props = getEvaluationProps(evaluationWindow, advancedOptions);
			expect(props).toBeDefined();
			expect(props).toStrictEqual({
				kind: 'cumulative',
				spec: {
					schedule: { type: 'hourly', minute: 14 },
					frequency: '12m',
					timezone: 'UTC',
				},
			});
		});

		it('for cumulative window with current day', () => {
			const evaluationWindow: EvaluationWindowState = {
				...INITIAL_EVALUATION_WINDOW_STATE,
				windowType: 'cumulative',
				timeframe: 'currentDay',
				startingAt: {
					...INITIAL_EVALUATION_WINDOW_STATE.startingAt,
					time: '15:43:00',
					timezone: 'UTC',
				},
			};
			const props = getEvaluationProps(evaluationWindow, advancedOptions);
			expect(props).toBeDefined();
			expect(props).toStrictEqual({
				kind: 'cumulative',
				spec: {
					schedule: { type: 'daily', hour: 15, minute: 43 },
					frequency: '12m',
					timezone: 'UTC',
				},
			});
		});

		it('for cumulative window with current month', () => {
			const evaluationWindow: EvaluationWindowState = {
				...INITIAL_EVALUATION_WINDOW_STATE,
				windowType: 'cumulative',
				timeframe: 'currentMonth',
				startingAt: {
					...INITIAL_EVALUATION_WINDOW_STATE.startingAt,
					number: '17',
					timezone: 'UTC',
					time: '16:34:00',
				},
			};
			const props = getEvaluationProps(evaluationWindow, advancedOptions);
			expect(props).toBeDefined();
			expect(props).toStrictEqual({
				kind: 'cumulative',
				spec: {
					schedule: { type: 'monthly', day: 17, hour: 16, minute: 34 },
					frequency: '12m',
					timezone: 'UTC',
				},
			});
		});
	});

	describe('buildCreateThresholdAlertRulePayload', () => {
		const mockCreateAlertContextState = createMockAlertContextState();
		const INITIAL_BUILD_CREATE_ALERT_RULE_PAYLOAD_ARGS: BuildCreateAlertRulePayloadArgs = {
			basicAlertState: mockCreateAlertContextState.alertState,
			thresholdState: mockCreateAlertContextState.thresholdState,
			advancedOptions: mockCreateAlertContextState.advancedOptions,
			evaluationWindow: mockCreateAlertContextState.evaluationWindow,
			notificationSettings: mockCreateAlertContextState.notificationSettings,
			query: initialQueriesMap.metrics,
			alertType: mockCreateAlertContextState.alertType,
		};

		it('verify buildCreateThresholdAlertRulePayload', () => {
			const props = buildCreateThresholdAlertRulePayload(
				INITIAL_BUILD_CREATE_ALERT_RULE_PAYLOAD_ARGS,
			);
			expect(props).toBeDefined();
			expect(props).toStrictEqual({
				alert: '',
				alertType: 'METRIC_BASED_ALERT',
				annotations: {
					description:
						'This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})',
					summary:
						'This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})',
				},
				condition: {
					alertOnAbsent: false,
					compositeQuery: {
						builderQueries: undefined,
						chQueries: undefined,
						panelType: 'graph',
						promQueries: undefined,
						queries: [
							{
								spec: {
									aggregations: [
										{
											metricName: '',
											reduceTo: undefined,
											spaceAggregation: 'sum',
											temporality: undefined,
											timeAggregation: 'count',
										},
									],
									disabled: false,
									filter: {
										expression: '',
									},
									functions: undefined,
									groupBy: undefined,
									having: undefined,
									legend: undefined,
									limit: undefined,
									name: 'A',
									offset: undefined,
									order: undefined,
									selectFields: undefined,
									signal: 'metrics',
									source: '',
									stepInterval: null,
								},
								type: 'builder_query',
							},
						],
						queryType: 'builder',
						unit: undefined,
					},
					requireMinPoints: false,
					selectedQueryName: 'A',
					thresholds: {
						kind: 'basic',
						spec: [
							{
								channels: [],
								matchType: '1',
								name: 'critical',
								op: '1',
								target: 0,
								targetUnit: '',
							},
						],
					},
				},
				evaluation: {
					kind: 'rolling',
					spec: {
						evalWindow: '5m0s',
						frequency: '1m',
					},
				},
				labels: {},
				notificationSettings: {
					groupBy: [],
					renotify: {
						enabled: false,
						interval: '30m',
						alertStates: [],
					},
					usePolicy: false,
				},
				ruleType: 'threshold_rule',
				schemaVersion: 'v2alpha1',
				source: 'http://localhost/',
				version: 'v5',
			});
		});

		it('verify for promql query type', () => {
			const currentArgs: BuildCreateAlertRulePayloadArgs = {
				...INITIAL_BUILD_CREATE_ALERT_RULE_PAYLOAD_ARGS,
				query: {
					...INITIAL_BUILD_CREATE_ALERT_RULE_PAYLOAD_ARGS.query,
					queryType: EQueryType.PROM,
				},
			};
			const props = buildCreateThresholdAlertRulePayload(currentArgs);
			expect(props).toBeDefined();
			expect(props.condition.compositeQuery.queryType).toBe('promql');
			expect(props.ruleType).toBe('promql_rule');
		});
	});
});
