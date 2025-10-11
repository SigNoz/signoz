/* eslint-disable @typescript-eslint/no-explicit-any */
import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';
import { initialQueriesMap } from 'constants/queryBuilder';
import {
	alertDefaults,
	anamolyAlertDefaults,
	exceptionAlertDefaults,
	logAlertDefaults,
	traceAlertDefaults,
} from 'container/CreateAlertRule/defaults';
import dayjs from 'dayjs';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import {
	INITIAL_ADVANCED_OPTIONS_STATE,
	INITIAL_ALERT_STATE,
	INITIAL_ALERT_THRESHOLD_STATE,
	INITIAL_EVALUATION_WINDOW_STATE,
	INITIAL_NOTIFICATION_SETTINGS_STATE,
} from '../constants';
import {
	AdvancedOptionsState,
	AlertState,
	AlertThresholdMatchType,
	AlertThresholdOperator,
	AlertThresholdState,
	Algorithm,
	EvaluationWindowState,
	NotificationSettingsState,
	Seasonality,
	TimeDuration,
} from '../types';
import {
	advancedOptionsReducer,
	alertCreationReducer,
	alertThresholdReducer,
	buildInitialAlertDef,
	evaluationWindowReducer,
	getInitialAlertType,
	getInitialAlertTypeFromURL,
	notificationSettingsReducer,
} from '../utils';

const UNKNOWN_ACTION_TYPE = 'UNKNOWN_ACTION_TYPE';
const TEST_RESET_TO_INITIAL_STATE = 'should reset to initial state';
const TEST_SET_INITIAL_STATE_FROM_PAYLOAD =
	'should set initial state from payload';
const TEST_RETURN_STATE_FOR_UNKNOWN_ACTION =
	'should return current state for unknown action';

describe('CreateAlertV2 Context Utils', () => {
	describe('alertCreationReducer', () => {
		it('should set alert name', () => {
			const result = alertCreationReducer(INITIAL_ALERT_STATE, {
				type: 'SET_ALERT_NAME',
				payload: 'Test Alert',
			});
			expect(result).toEqual({
				...INITIAL_ALERT_STATE,
				name: 'Test Alert',
			});
		});

		it('should set alert labels', () => {
			const labels = { severity: 'critical', team: 'backend' };
			const result = alertCreationReducer(INITIAL_ALERT_STATE, {
				type: 'SET_ALERT_LABELS',
				payload: labels,
			});
			expect(result).toEqual({
				...INITIAL_ALERT_STATE,
				labels,
			});
		});

		it('should set y-axis unit', () => {
			const result = alertCreationReducer(INITIAL_ALERT_STATE, {
				type: 'SET_Y_AXIS_UNIT',
				payload: 'ms',
			});
			expect(result).toEqual({
				...INITIAL_ALERT_STATE,
				yAxisUnit: 'ms',
			});
		});

		it(TEST_RESET_TO_INITIAL_STATE, () => {
			const modifiedState: AlertState = {
				name: 'Modified',
				labels: { test: 'value' },
				yAxisUnit: 'ms',
			};
			const result = alertCreationReducer(modifiedState, { type: 'RESET' });
			expect(result).toEqual(INITIAL_ALERT_STATE);
		});

		it(TEST_SET_INITIAL_STATE_FROM_PAYLOAD, () => {
			const newState: AlertState = {
				name: 'Custom Alert',
				labels: { env: 'production' },
				yAxisUnit: 'bytes',
			};
			const result = alertCreationReducer(INITIAL_ALERT_STATE, {
				type: 'SET_INITIAL_STATE',
				payload: newState,
			});
			expect(result).toEqual(newState);
		});

		it(TEST_RETURN_STATE_FOR_UNKNOWN_ACTION, () => {
			const result = alertCreationReducer(
				INITIAL_ALERT_STATE,

				{ type: UNKNOWN_ACTION_TYPE } as any,
			);
			expect(result).toEqual(INITIAL_ALERT_STATE);
		});
	});

	describe('getInitialAlertType', () => {
		it('should return METRICS_BASED_ALERT for metrics data source', () => {
			const result = getInitialAlertType(initialQueriesMap.metrics);
			expect(result).toBe(AlertTypes.METRICS_BASED_ALERT);
		});

		it('should return LOGS_BASED_ALERT for logs data source', () => {
			const result = getInitialAlertType(initialQueriesMap.logs);
			expect(result).toBe(AlertTypes.LOGS_BASED_ALERT);
		});

		it('should return TRACES_BASED_ALERT for traces data source', () => {
			const result = getInitialAlertType(initialQueriesMap.traces);
			expect(result).toBe(AlertTypes.TRACES_BASED_ALERT);
		});

		it('should return METRICS_BASED_ALERT for unknown data source', () => {
			const queryWithUnknownDataSource = {
				...initialQueriesMap.metrics,
				builder: {
					...initialQueriesMap.metrics.builder,
					queryData: [],
				},
			};
			const result = getInitialAlertType(queryWithUnknownDataSource);
			expect(result).toBe(AlertTypes.METRICS_BASED_ALERT);
		});
	});

	describe('buildInitialAlertDef', () => {
		it('should return logAlertDefaults for LOGS_BASED_ALERT', () => {
			const result = buildInitialAlertDef(AlertTypes.LOGS_BASED_ALERT);
			expect(result).toBe(logAlertDefaults);
		});

		it('should return traceAlertDefaults for TRACES_BASED_ALERT', () => {
			const result = buildInitialAlertDef(AlertTypes.TRACES_BASED_ALERT);
			expect(result).toBe(traceAlertDefaults);
		});

		it('should return exceptionAlertDefaults for EXCEPTIONS_BASED_ALERT', () => {
			const result = buildInitialAlertDef(AlertTypes.EXCEPTIONS_BASED_ALERT);
			expect(result).toBe(exceptionAlertDefaults);
		});

		it('should return anamolyAlertDefaults for ANOMALY_BASED_ALERT', () => {
			const result = buildInitialAlertDef(AlertTypes.ANOMALY_BASED_ALERT);
			expect(result).toBe(anamolyAlertDefaults);
		});

		it('should return alertDefaults for METRICS_BASED_ALERT', () => {
			const result = buildInitialAlertDef(AlertTypes.METRICS_BASED_ALERT);
			expect(result).toBe(alertDefaults);
		});

		it('should return alertDefaults for unknown alert type', () => {
			const result = buildInitialAlertDef('UNKNOWN' as AlertTypes);
			expect(result).toBe(alertDefaults);
		});
	});

	describe('getInitialAlertTypeFromURL', () => {
		it('should return ANOMALY_BASED_ALERT when ruleType is anomaly_rule', () => {
			const params = new URLSearchParams('?ruleType=anomaly_rule');
			const result = getInitialAlertTypeFromURL(params, initialQueriesMap.metrics);
			expect(result).toBe(AlertTypes.ANOMALY_BASED_ALERT);
		});

		it('should return alert type from alertType param', () => {
			const params = new URLSearchParams('?alertType=LOGS_BASED_ALERT');
			const result = getInitialAlertTypeFromURL(params, initialQueriesMap.metrics);
			expect(result).toBe(AlertTypes.LOGS_BASED_ALERT);
		});

		it('should prioritize ruleType over alertType', () => {
			const params = new URLSearchParams(
				'?ruleType=anomaly_rule&alertType=LOGS_BASED_ALERT',
			);
			const result = getInitialAlertTypeFromURL(params, initialQueriesMap.metrics);
			expect(result).toBe(AlertTypes.ANOMALY_BASED_ALERT);
		});

		it('should fall back to query data source when no URL params', () => {
			const params = new URLSearchParams('');
			const result = getInitialAlertTypeFromURL(params, initialQueriesMap.traces);
			expect(result).toBe(AlertTypes.TRACES_BASED_ALERT);
		});
	});

	describe('alertThresholdReducer', () => {
		it('should set selected query', () => {
			const result = alertThresholdReducer(INITIAL_ALERT_THRESHOLD_STATE, {
				type: 'SET_SELECTED_QUERY',
				payload: 'B',
			});
			expect(result).toEqual({
				...INITIAL_ALERT_THRESHOLD_STATE,
				selectedQuery: 'B',
			});
		});

		it('should set operator', () => {
			const result = alertThresholdReducer(INITIAL_ALERT_THRESHOLD_STATE, {
				type: 'SET_OPERATOR',
				payload: AlertThresholdOperator.IS_BELOW,
			});
			expect(result).toEqual({
				...INITIAL_ALERT_THRESHOLD_STATE,
				operator: AlertThresholdOperator.IS_BELOW,
			});
		});

		it('should set match type', () => {
			const result = alertThresholdReducer(INITIAL_ALERT_THRESHOLD_STATE, {
				type: 'SET_MATCH_TYPE',
				payload: AlertThresholdMatchType.ALL_THE_TIME,
			});
			expect(result).toEqual({
				...INITIAL_ALERT_THRESHOLD_STATE,
				matchType: AlertThresholdMatchType.ALL_THE_TIME,
			});
		});

		it('should set thresholds', () => {
			const newThresholds = [
				{
					id: '1',
					label: 'critical',
					thresholdValue: 100,
					recoveryThresholdValue: 90,
					unit: 'ms',
					channels: ['channel1'],
					color: '#FF0000',
				},
			];
			const result = alertThresholdReducer(INITIAL_ALERT_THRESHOLD_STATE, {
				type: 'SET_THRESHOLDS',
				payload: newThresholds,
			});
			expect(result).toEqual({
				...INITIAL_ALERT_THRESHOLD_STATE,
				thresholds: newThresholds,
			});
		});

		it(TEST_RESET_TO_INITIAL_STATE, () => {
			const modifiedState: AlertThresholdState = {
				selectedQuery: 'B',
				operator: AlertThresholdOperator.IS_BELOW,
				matchType: AlertThresholdMatchType.ALL_THE_TIME,
				evaluationWindow: TimeDuration.TEN_MINUTES,
				algorithm: Algorithm.STANDARD,
				seasonality: Seasonality.DAILY,
				thresholds: [],
			};
			const result = alertThresholdReducer(modifiedState, { type: 'RESET' });
			expect(result).toEqual(INITIAL_ALERT_THRESHOLD_STATE);
		});

		it(TEST_SET_INITIAL_STATE_FROM_PAYLOAD, () => {
			const newState: AlertThresholdState = {
				selectedQuery: 'C',
				operator: AlertThresholdOperator.IS_EQUAL_TO,
				matchType: AlertThresholdMatchType.ON_AVERAGE,
				evaluationWindow: TimeDuration.ONE_HOUR,
				algorithm: Algorithm.STANDARD,
				seasonality: Seasonality.WEEKLY,
				thresholds: [],
			};
			const result = alertThresholdReducer(INITIAL_ALERT_THRESHOLD_STATE, {
				type: 'SET_INITIAL_STATE',
				payload: newState,
			});
			expect(result).toEqual(newState);
		});

		it(TEST_RETURN_STATE_FOR_UNKNOWN_ACTION, () => {
			const result = alertThresholdReducer(
				INITIAL_ALERT_THRESHOLD_STATE,

				{ type: UNKNOWN_ACTION_TYPE } as any,
			);
			expect(result).toEqual(INITIAL_ALERT_THRESHOLD_STATE);
		});
	});

	describe('advancedOptionsReducer', () => {
		it('should set send notification if data is missing', () => {
			const result = advancedOptionsReducer(INITIAL_ADVANCED_OPTIONS_STATE, {
				type: 'SET_SEND_NOTIFICATION_IF_DATA_IS_MISSING',
				payload: { toleranceLimit: 21, timeUnit: UniversalYAxisUnit.HOURS },
			});
			expect(result).toEqual({
				...INITIAL_ADVANCED_OPTIONS_STATE,
				sendNotificationIfDataIsMissing: {
					...INITIAL_ADVANCED_OPTIONS_STATE.sendNotificationIfDataIsMissing,
					toleranceLimit: 21,
					timeUnit: UniversalYAxisUnit.HOURS,
				},
			});
		});

		it('should toggle send notification if data is missing', () => {
			const result = advancedOptionsReducer(INITIAL_ADVANCED_OPTIONS_STATE, {
				type: 'TOGGLE_SEND_NOTIFICATION_IF_DATA_IS_MISSING',
				payload: true,
			});
			expect(result).toEqual({
				...INITIAL_ADVANCED_OPTIONS_STATE,
				sendNotificationIfDataIsMissing: {
					...INITIAL_ADVANCED_OPTIONS_STATE.sendNotificationIfDataIsMissing,
					enabled: true,
				},
			});
		});

		it('should set enforce minimum datapoints', () => {
			const result = advancedOptionsReducer(INITIAL_ADVANCED_OPTIONS_STATE, {
				type: 'SET_ENFORCE_MINIMUM_DATAPOINTS',
				payload: { minimumDatapoints: 10 },
			});
			expect(result).toEqual({
				...INITIAL_ADVANCED_OPTIONS_STATE,
				enforceMinimumDatapoints: {
					...INITIAL_ADVANCED_OPTIONS_STATE.enforceMinimumDatapoints,
					minimumDatapoints: 10,
				},
			});
		});

		it('should toggle enforce minimum datapoints', () => {
			const result = advancedOptionsReducer(INITIAL_ADVANCED_OPTIONS_STATE, {
				type: 'TOGGLE_ENFORCE_MINIMUM_DATAPOINTS',
				payload: true,
			});
			expect(result).toEqual({
				...INITIAL_ADVANCED_OPTIONS_STATE,
				enforceMinimumDatapoints: {
					...INITIAL_ADVANCED_OPTIONS_STATE.enforceMinimumDatapoints,
					enabled: true,
				},
			});
		});

		it('should set delay evaluation', () => {
			const result = advancedOptionsReducer(INITIAL_ADVANCED_OPTIONS_STATE, {
				type: 'SET_DELAY_EVALUATION',
				payload: { delay: 10, timeUnit: UniversalYAxisUnit.HOURS },
			});
			expect(result).toEqual({
				...INITIAL_ADVANCED_OPTIONS_STATE,
				delayEvaluation: { delay: 10, timeUnit: UniversalYAxisUnit.HOURS },
			});
		});

		it('should set evaluation cadence', () => {
			const newCadence = {
				default: { value: 5, timeUnit: UniversalYAxisUnit.HOURS },
				custom: {
					repeatEvery: 'week',
					startAt: '12:00:00',
					timezone: 'America/New_York',
					occurence: ['Monday', 'Friday'],
				},
				rrule: { date: dayjs(), startAt: '10:00:00', rrule: 'test-rrule' },
			};
			const result = advancedOptionsReducer(INITIAL_ADVANCED_OPTIONS_STATE, {
				type: 'SET_EVALUATION_CADENCE',
				payload: newCadence,
			});
			expect(result).toEqual({
				...INITIAL_ADVANCED_OPTIONS_STATE,
				evaluationCadence: {
					...INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence,
					...newCadence,
				},
			});
		});

		it('should set evaluation cadence mode', () => {
			const result = advancedOptionsReducer(INITIAL_ADVANCED_OPTIONS_STATE, {
				type: 'SET_EVALUATION_CADENCE_MODE',
				payload: 'custom',
			});
			expect(result).toEqual({
				...INITIAL_ADVANCED_OPTIONS_STATE,
				evaluationCadence: {
					...INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence,
					mode: 'custom',
				},
			});
		});

		it(TEST_RESET_TO_INITIAL_STATE, () => {
			const modifiedState: AdvancedOptionsState = {
				...INITIAL_ADVANCED_OPTIONS_STATE,
				delayEvaluation: { delay: 10, timeUnit: UniversalYAxisUnit.HOURS },
			};
			const result = advancedOptionsReducer(modifiedState, { type: 'RESET' });
			expect(result).toEqual(INITIAL_ADVANCED_OPTIONS_STATE);
		});

		it(TEST_SET_INITIAL_STATE_FROM_PAYLOAD, () => {
			const newState: AdvancedOptionsState = {
				...INITIAL_ADVANCED_OPTIONS_STATE,
				sendNotificationIfDataIsMissing: {
					toleranceLimit: 45,
					timeUnit: UniversalYAxisUnit.SECONDS,
					enabled: true,
				},
			};
			const result = advancedOptionsReducer(INITIAL_ADVANCED_OPTIONS_STATE, {
				type: 'SET_INITIAL_STATE',
				payload: newState,
			});
			expect(result).toEqual(newState);
		});

		it(TEST_RETURN_STATE_FOR_UNKNOWN_ACTION, () => {
			const result = advancedOptionsReducer(
				INITIAL_ADVANCED_OPTIONS_STATE,

				{ type: UNKNOWN_ACTION_TYPE } as any,
			);
			expect(result).toEqual(INITIAL_ADVANCED_OPTIONS_STATE);
		});
	});

	describe('evaluationWindowReducer', () => {
		it('should set window type to rolling and reset timeframe', () => {
			const modifiedState: EvaluationWindowState = {
				...INITIAL_EVALUATION_WINDOW_STATE,
				windowType: 'cumulative',
				timeframe: 'currentHour',
			};
			const result = evaluationWindowReducer(modifiedState, {
				type: 'SET_WINDOW_TYPE',
				payload: 'rolling',
			});
			expect(result).toEqual({
				windowType: 'rolling',
				timeframe: INITIAL_EVALUATION_WINDOW_STATE.timeframe,
				startingAt: INITIAL_EVALUATION_WINDOW_STATE.startingAt,
			});
		});

		it('should set window type to cumulative and set timeframe to currentHour', () => {
			const result = evaluationWindowReducer(INITIAL_EVALUATION_WINDOW_STATE, {
				type: 'SET_WINDOW_TYPE',
				payload: 'cumulative',
			});
			expect(result).toEqual({
				windowType: 'cumulative',
				timeframe: 'currentHour',
				startingAt: INITIAL_EVALUATION_WINDOW_STATE.startingAt,
			});
		});

		it('should set timeframe', () => {
			const result = evaluationWindowReducer(INITIAL_EVALUATION_WINDOW_STATE, {
				type: 'SET_TIMEFRAME',
				payload: '10m0s',
			});
			expect(result).toEqual({
				...INITIAL_EVALUATION_WINDOW_STATE,
				timeframe: '10m0s',
			});
		});

		it('should set starting at', () => {
			const newStartingAt = {
				time: '14:30:00',
				number: '5',
				timezone: 'Europe/London',
				unit: UniversalYAxisUnit.HOURS,
			};
			const result = evaluationWindowReducer(INITIAL_EVALUATION_WINDOW_STATE, {
				type: 'SET_STARTING_AT',
				payload: newStartingAt,
			});
			expect(result).toEqual({
				...INITIAL_EVALUATION_WINDOW_STATE,
				startingAt: newStartingAt,
			});
		});

		it(TEST_RESET_TO_INITIAL_STATE, () => {
			const modifiedState: EvaluationWindowState = {
				windowType: 'cumulative',
				timeframe: 'currentHour',
				startingAt: {
					time: '12:00:00',
					number: '2',
					timezone: 'America/New_York',
					unit: UniversalYAxisUnit.HOURS,
				},
			};
			const result = evaluationWindowReducer(modifiedState, { type: 'RESET' });
			expect(result).toEqual(INITIAL_EVALUATION_WINDOW_STATE);
		});

		it(TEST_SET_INITIAL_STATE_FROM_PAYLOAD, () => {
			const newState: EvaluationWindowState = {
				windowType: 'cumulative',
				timeframe: 'currentDay',
				startingAt: {
					time: '09:00:00',
					number: '3',
					timezone: 'Asia/Tokyo',
					unit: UniversalYAxisUnit.HOURS,
				},
			};
			const result = evaluationWindowReducer(INITIAL_EVALUATION_WINDOW_STATE, {
				type: 'SET_INITIAL_STATE',
				payload: newState,
			});
			expect(result).toEqual(newState);
		});

		it(TEST_RETURN_STATE_FOR_UNKNOWN_ACTION, () => {
			const result = evaluationWindowReducer(
				INITIAL_EVALUATION_WINDOW_STATE,

				{ type: UNKNOWN_ACTION_TYPE } as any,
			);
			expect(result).toEqual(INITIAL_EVALUATION_WINDOW_STATE);
		});
	});

	describe('notificationSettingsReducer', () => {
		it('should set multiple notifications', () => {
			const notifications = ['channel1', 'channel2', 'channel3'];
			const result = notificationSettingsReducer(
				INITIAL_NOTIFICATION_SETTINGS_STATE,
				{
					type: 'SET_MULTIPLE_NOTIFICATIONS',
					payload: notifications,
				},
			);
			expect(result).toEqual({
				...INITIAL_NOTIFICATION_SETTINGS_STATE,
				multipleNotifications: notifications,
			});
		});

		it('should set multiple notifications to null', () => {
			const modifiedState = {
				...INITIAL_NOTIFICATION_SETTINGS_STATE,
				multipleNotifications: ['channel1', 'channel2'],
			};
			const result = notificationSettingsReducer(modifiedState, {
				type: 'SET_MULTIPLE_NOTIFICATIONS',
				payload: null,
			});
			expect(result).toEqual({
				...modifiedState,
				multipleNotifications: null,
			});
		});

		it('should set re-notification', () => {
			const reNotification = {
				enabled: true,
				value: 60,
				unit: UniversalYAxisUnit.HOURS,
				conditions: ['firing' as const, 'nodata' as const],
			};
			const result = notificationSettingsReducer(
				INITIAL_NOTIFICATION_SETTINGS_STATE,
				{
					type: 'SET_RE_NOTIFICATION',
					payload: reNotification,
				},
			);
			expect(result).toEqual({
				...INITIAL_NOTIFICATION_SETTINGS_STATE,
				reNotification,
			});
		});

		it('should set description', () => {
			const description = 'Custom alert description with {{$value}}';
			const result = notificationSettingsReducer(
				INITIAL_NOTIFICATION_SETTINGS_STATE,
				{
					type: 'SET_DESCRIPTION',
					payload: description,
				},
			);
			expect(result).toEqual({
				...INITIAL_NOTIFICATION_SETTINGS_STATE,
				description,
			});
		});

		it('should set routing policies', () => {
			const result = notificationSettingsReducer(
				INITIAL_NOTIFICATION_SETTINGS_STATE,
				{
					type: 'SET_ROUTING_POLICIES',
					payload: true,
				},
			);
			expect(result).toEqual({
				...INITIAL_NOTIFICATION_SETTINGS_STATE,
				routingPolicies: true,
			});
		});

		it(TEST_RESET_TO_INITIAL_STATE, () => {
			const modifiedState: NotificationSettingsState = {
				multipleNotifications: ['channel1'],
				reNotification: {
					enabled: true,
					value: 120,
					unit: UniversalYAxisUnit.HOURS,
					conditions: ['firing'],
				},
				description: 'Modified description',
				routingPolicies: true,
			};
			const result = notificationSettingsReducer(modifiedState, {
				type: 'RESET',
			});
			expect(result).toEqual(INITIAL_NOTIFICATION_SETTINGS_STATE);
		});

		it(TEST_SET_INITIAL_STATE_FROM_PAYLOAD, () => {
			const newState: NotificationSettingsState = {
				multipleNotifications: ['channel4', 'channel5'],
				reNotification: {
					enabled: true,
					value: 90,
					unit: UniversalYAxisUnit.MINUTES,
					conditions: ['nodata'],
				},
				description: 'New description',
				routingPolicies: true,
			};
			const result = notificationSettingsReducer(
				INITIAL_NOTIFICATION_SETTINGS_STATE,
				{
					type: 'SET_INITIAL_STATE',
					payload: newState,
				},
			);
			expect(result).toEqual(newState);
		});

		it(TEST_RETURN_STATE_FOR_UNKNOWN_ACTION, () => {
			const result = notificationSettingsReducer(
				INITIAL_NOTIFICATION_SETTINGS_STATE,

				{ type: UNKNOWN_ACTION_TYPE } as any,
			);
			expect(result).toEqual(INITIAL_NOTIFICATION_SETTINGS_STATE);
		});
	});
});
