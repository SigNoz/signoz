import { UTC_TIMEZONE } from 'components/CustomTimePicker/timezoneUtils';
import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';
import { QueryParams } from 'constants/query';
import {
	alertDefaults,
	anamolyAlertDefaults,
	exceptionAlertDefaults,
	logAlertDefaults,
	traceAlertDefaults,
} from 'container/CreateAlertRule/defaults';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { AlertDef } from 'types/api/alerts/def';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { CumulativeWindowTimeframes } from '../EvaluationSettings/types';
import {
	INITIAL_ADVANCED_OPTIONS_STATE,
	INITIAL_ALERT_STATE,
	INITIAL_ALERT_THRESHOLD_STATE,
	INITIAL_EVALUATION_WINDOW_STATE,
	INITIAL_NOTIFICATION_SETTINGS_STATE,
} from './constants';
import {
	AdvancedOptionsAction,
	AdvancedOptionsState,
	AlertState,
	AlertThresholdAction,
	AlertThresholdState,
	CreateAlertAction,
	EvaluationWindowAction,
	EvaluationWindowState,
	NotificationSettingsAction,
	NotificationSettingsState,
} from './types';

export const alertCreationReducer = (
	state: AlertState,
	action: CreateAlertAction,
): AlertState => {
	switch (action.type) {
		case 'SET_ALERT_NAME':
			return {
				...state,
				name: action.payload,
			};
		case 'SET_ALERT_LABELS':
			return {
				...state,
				labels: action.payload,
			};
		case 'SET_Y_AXIS_UNIT':
			return {
				...state,
				yAxisUnit: action.payload,
			};
		case 'RESET':
			return INITIAL_ALERT_STATE;
		case 'SET_INITIAL_STATE':
			return action.payload;
		default:
			return state;
	}
};

export function getInitialAlertType(currentQuery: Query): AlertTypes {
	const dataSource =
		currentQuery.builder.queryData?.[0]?.dataSource || DataSource.METRICS;
	switch (dataSource) {
		case DataSource.METRICS:
			return AlertTypes.METRICS_BASED_ALERT;
		case DataSource.LOGS:
			return AlertTypes.LOGS_BASED_ALERT;
		case DataSource.TRACES:
			return AlertTypes.TRACES_BASED_ALERT;
		default:
			return AlertTypes.METRICS_BASED_ALERT;
	}
}

export function buildInitialAlertDef(alertType: AlertTypes): AlertDef {
	switch (alertType) {
		case AlertTypes.LOGS_BASED_ALERT:
			return logAlertDefaults;
		case AlertTypes.TRACES_BASED_ALERT:
			return traceAlertDefaults;
		case AlertTypes.EXCEPTIONS_BASED_ALERT:
			return exceptionAlertDefaults;
		case AlertTypes.ANOMALY_BASED_ALERT:
			return anamolyAlertDefaults;
		case AlertTypes.METRICS_BASED_ALERT:
			return alertDefaults;
		default:
			return alertDefaults;
	}
}

export function getInitialAlertTypeFromURL(
	urlSearchParams: URLSearchParams,
	currentQuery: Query,
): AlertTypes {
	const ruleType = urlSearchParams.get(QueryParams.ruleType);
	if (ruleType === 'anomaly_rule') {
		return AlertTypes.ANOMALY_BASED_ALERT;
	}
	const alertTypeFromURL = urlSearchParams.get(QueryParams.alertType);
	return alertTypeFromURL
		? (alertTypeFromURL as AlertTypes)
		: getInitialAlertType(currentQuery);
}

export const alertThresholdReducer = (
	state: AlertThresholdState,
	action: AlertThresholdAction,
): AlertThresholdState => {
	switch (action.type) {
		case 'SET_SELECTED_QUERY':
			return { ...state, selectedQuery: action.payload };
		case 'SET_OPERATOR':
			return { ...state, operator: action.payload };
		case 'SET_MATCH_TYPE':
			return { ...state, matchType: action.payload };
		case 'SET_THRESHOLDS':
			return { ...state, thresholds: action.payload };
		case 'RESET':
			return INITIAL_ALERT_THRESHOLD_STATE;
		case 'SET_INITIAL_STATE':
			return action.payload;
		default:
			return state;
	}
};

export const advancedOptionsReducer = (
	state: AdvancedOptionsState,
	action: AdvancedOptionsAction,
): AdvancedOptionsState => {
	switch (action.type) {
		case 'SET_SEND_NOTIFICATION_IF_DATA_IS_MISSING':
			return {
				...state,
				sendNotificationIfDataIsMissing: {
					...state.sendNotificationIfDataIsMissing,
					toleranceLimit: action.payload.toleranceLimit,
					timeUnit: action.payload.timeUnit,
				},
			};
		case 'TOGGLE_SEND_NOTIFICATION_IF_DATA_IS_MISSING':
			return {
				...state,
				sendNotificationIfDataIsMissing: {
					...state.sendNotificationIfDataIsMissing,
					enabled: action.payload,
				},
			};
		case 'SET_ENFORCE_MINIMUM_DATAPOINTS':
			return {
				...state,
				enforceMinimumDatapoints: {
					...state.enforceMinimumDatapoints,
					minimumDatapoints: action.payload.minimumDatapoints,
				},
			};
		case 'TOGGLE_ENFORCE_MINIMUM_DATAPOINTS':
			return {
				...state,
				enforceMinimumDatapoints: {
					...state.enforceMinimumDatapoints,
					enabled: action.payload,
				},
			};
		case 'SET_DELAY_EVALUATION':
			return { ...state, delayEvaluation: action.payload };
		case 'SET_EVALUATION_CADENCE':
			return {
				...state,
				evaluationCadence: { ...state.evaluationCadence, ...action.payload },
			};
		case 'SET_EVALUATION_CADENCE_MODE':
			return {
				...state,
				evaluationCadence: { ...state.evaluationCadence, mode: action.payload },
			};
		case 'SET_INITIAL_STATE':
			return action.payload;
		case 'RESET':
			return INITIAL_ADVANCED_OPTIONS_STATE;
		default:
			return state;
	}
};

export const evaluationWindowReducer = (
	state: EvaluationWindowState,
	action: EvaluationWindowAction,
): EvaluationWindowState => {
	switch (action.type) {
		case 'SET_WINDOW_TYPE':
			return {
				...state,
				windowType: action.payload,
				startingAt: INITIAL_EVALUATION_WINDOW_STATE.startingAt,
				timeframe:
					action.payload === 'rolling'
						? INITIAL_EVALUATION_WINDOW_STATE.timeframe
						: 'currentHour',
			};
		case 'SET_TIMEFRAME':
			return { ...state, timeframe: action.payload };
		case 'SET_STARTING_AT':
			return { ...state, startingAt: action.payload };
		case 'RESET':
			return INITIAL_EVALUATION_WINDOW_STATE;
		case 'SET_INITIAL_STATE':
			return action.payload;
		case 'SET_INITIAL_STATE_FOR_METER':
			return {
				...state,
				windowType: 'cumulative',
				timeframe: CumulativeWindowTimeframes.CURRENT_DAY,
				startingAt: {
					time: '00:00:00',
					number: '0',
					timezone: UTC_TIMEZONE.value,
					unit: UniversalYAxisUnit.MINUTES,
				},
			};
		default:
			return state;
	}
};

export const notificationSettingsReducer = (
	state: NotificationSettingsState,
	action: NotificationSettingsAction,
): NotificationSettingsState => {
	switch (action.type) {
		case 'SET_MULTIPLE_NOTIFICATIONS':
			return { ...state, multipleNotifications: action.payload };
		case 'SET_RE_NOTIFICATION':
			return { ...state, reNotification: action.payload };
		case 'SET_DESCRIPTION':
			return { ...state, description: action.payload };
		case 'SET_ROUTING_POLICIES':
			return { ...state, routingPolicies: action.payload };
		case 'RESET':
			return INITIAL_NOTIFICATION_SETTINGS_STATE;
		case 'SET_INITIAL_STATE':
			return action.payload;
		default:
			return state;
	}
};
