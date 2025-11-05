import { CreateAlertRuleResponse } from 'api/alerts/createAlertRule';
import { TestAlertRuleResponse } from 'api/alerts/testAlertRule';
import { UpdateAlertRuleResponse } from 'api/alerts/updateAlertRule';
import { Dayjs } from 'dayjs';
import { Dispatch } from 'react';
import { UseMutateFunction } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { PostableAlertRuleV2 } from 'types/api/alerts/alertTypesV2';
import { Labels } from 'types/api/alerts/def';

import { GetCreateAlertLocalStateFromAlertDefReturn } from '../types';

export interface ICreateAlertContextProps {
	alertState: AlertState;
	setAlertState: Dispatch<CreateAlertAction>;
	alertType: AlertTypes;
	setAlertType: Dispatch<AlertTypes>;
	thresholdState: AlertThresholdState;
	setThresholdState: Dispatch<AlertThresholdAction>;
	advancedOptions: AdvancedOptionsState;
	setAdvancedOptions: Dispatch<AdvancedOptionsAction>;
	evaluationWindow: EvaluationWindowState;
	setEvaluationWindow: Dispatch<EvaluationWindowAction>;
	notificationSettings: NotificationSettingsState;
	setNotificationSettings: Dispatch<NotificationSettingsAction>;
	isCreatingAlertRule: boolean;
	createAlertRule: UseMutateFunction<
		SuccessResponse<CreateAlertRuleResponse, unknown> | ErrorResponse,
		Error,
		PostableAlertRuleV2,
		unknown
	>;
	isTestingAlertRule: boolean;
	testAlertRule: UseMutateFunction<
		SuccessResponse<TestAlertRuleResponse, unknown> | ErrorResponse,
		Error,
		PostableAlertRuleV2,
		unknown
	>;
	discardAlertRule: () => void;
	isUpdatingAlertRule: boolean;
	updateAlertRule: UseMutateFunction<
		SuccessResponse<UpdateAlertRuleResponse, unknown> | ErrorResponse,
		Error,
		PostableAlertRuleV2,
		unknown
	>;
	isEditMode: boolean;
}

export interface ICreateAlertProviderProps {
	children: React.ReactNode;
	initialAlertType: AlertTypes;
	initialAlertState?: GetCreateAlertLocalStateFromAlertDefReturn;
	isEditMode?: boolean;
	ruleId?: string;
}

export enum AlertCreationStep {
	ALERT_DEFINITION = 0,
	ALERT_CONDITION = 1,
	EVALUATION_SETTINGS = 2,
	NOTIFICATION_SETTINGS = 3,
}

export interface AlertState {
	name: string;
	labels: Labels;
	yAxisUnit: string | undefined;
}

export type CreateAlertAction =
	| { type: 'SET_ALERT_NAME'; payload: string }
	| { type: 'SET_ALERT_LABELS'; payload: Labels }
	| { type: 'SET_Y_AXIS_UNIT'; payload: string | undefined }
	| { type: 'SET_INITIAL_STATE'; payload: AlertState }
	| { type: 'RESET' };

export interface Threshold {
	id: string;
	label: string;
	thresholdValue: number;
	recoveryThresholdValue: number | null;
	unit: string;
	channels: string[];
	color: string;
}

export enum AlertThresholdOperator {
	IS_ABOVE = '1',
	IS_BELOW = '2',
	IS_EQUAL_TO = '3',
	IS_NOT_EQUAL_TO = '4',
	ABOVE_BELOW = '7',
}

export enum AlertThresholdMatchType {
	AT_LEAST_ONCE = '1',
	ALL_THE_TIME = '2',
	ON_AVERAGE = '3',
	IN_TOTAL = '4',
	LAST = '5',
}

export interface AlertThresholdState {
	selectedQuery: string;
	operator: AlertThresholdOperator;
	matchType: AlertThresholdMatchType;
	evaluationWindow: string;
	algorithm: string;
	seasonality: string;
	thresholds: Threshold[];
}

export enum TimeDuration {
	ONE_MINUTE = '1m0s',
	FIVE_MINUTES = '5m0s',
	TEN_MINUTES = '10m0s',
	FIFTEEN_MINUTES = '15m0s',
	ONE_HOUR = '1h0m0s',
	THREE_HOURS = '3h0m0s',
	FOUR_HOURS = '4h0m0s',
	TWENTY_FOUR_HOURS = '24h0m0s',
}

export enum Algorithm {
	STANDARD = 'standard',
}

export enum Seasonality {
	HOURLY = 'hourly',
	DAILY = 'daily',
	WEEKLY = 'weekly',
}

export type AlertThresholdAction =
	| { type: 'SET_SELECTED_QUERY'; payload: string }
	| { type: 'SET_OPERATOR'; payload: AlertThresholdOperator }
	| { type: 'SET_MATCH_TYPE'; payload: AlertThresholdMatchType }
	| { type: 'SET_EVALUATION_WINDOW'; payload: string }
	| { type: 'SET_ALGORITHM'; payload: string }
	| { type: 'SET_SEASONALITY'; payload: string }
	| { type: 'SET_THRESHOLDS'; payload: Threshold[] }
	| { type: 'SET_INITIAL_STATE'; payload: AlertThresholdState }
	| { type: 'RESET' };

export interface AdvancedOptionsState {
	sendNotificationIfDataIsMissing: {
		toleranceLimit: number;
		timeUnit: string;
		enabled: boolean;
	};
	enforceMinimumDatapoints: {
		minimumDatapoints: number;
		enabled: boolean;
	};
	delayEvaluation: {
		delay: number;
		timeUnit: string;
	};
	evaluationCadence: {
		mode: EvaluationCadenceMode;
		default: {
			value: number;
			timeUnit: string;
		};
		custom: {
			repeatEvery: string;
			startAt: string;
			occurence: string[];
			timezone: string;
		};
		rrule: {
			date: Dayjs | null;
			startAt: string;
			rrule: string;
		};
	};
}

export type AdvancedOptionsAction =
	| {
			type: 'SET_SEND_NOTIFICATION_IF_DATA_IS_MISSING';
			payload: { toleranceLimit: number; timeUnit: string };
	  }
	| {
			type: 'TOGGLE_SEND_NOTIFICATION_IF_DATA_IS_MISSING';
			payload: boolean;
	  }
	| {
			type: 'SET_ENFORCE_MINIMUM_DATAPOINTS';
			payload: { minimumDatapoints: number };
	  }
	| {
			type: 'TOGGLE_ENFORCE_MINIMUM_DATAPOINTS';
			payload: boolean;
	  }
	| {
			type: 'SET_DELAY_EVALUATION';
			payload: { delay: number; timeUnit: string };
	  }
	| {
			type: 'SET_EVALUATION_CADENCE';
			payload: {
				default: { value: number; timeUnit: string };
				custom: {
					repeatEvery: string;
					startAt: string;
					timezone: string;
					occurence: string[];
				};
				rrule: { date: Dayjs | null; startAt: string; rrule: string };
			};
	  }
	| { type: 'SET_EVALUATION_CADENCE_MODE'; payload: EvaluationCadenceMode }
	| { type: 'SET_INITIAL_STATE'; payload: AdvancedOptionsState }
	| { type: 'RESET' };

export interface EvaluationWindowState {
	windowType: 'rolling' | 'cumulative';
	timeframe: string;
	startingAt: {
		time: string;
		number: string;
		timezone: string;
		unit: string;
	};
}

export type EvaluationWindowAction =
	| { type: 'SET_WINDOW_TYPE'; payload: 'rolling' | 'cumulative' }
	| { type: 'SET_TIMEFRAME'; payload: string }
	| {
			type: 'SET_STARTING_AT';
			payload: { time: string; number: string; timezone: string; unit: string };
	  }
	| { type: 'SET_EVALUATION_CADENCE_MODE'; payload: EvaluationCadenceMode }
	| { type: 'SET_INITIAL_STATE'; payload: EvaluationWindowState }
	| { type: 'SET_INITIAL_STATE_FOR_METER' }
	| { type: 'RESET' };

export type EvaluationCadenceMode = 'default' | 'custom' | 'rrule';

export interface NotificationSettingsState {
	multipleNotifications: string[] | null;
	reNotification: {
		enabled: boolean;
		value: number;
		unit: string;
		conditions: ('firing' | 'nodata')[];
	};
	description: string;
	routingPolicies: boolean;
}

export type NotificationSettingsAction =
	| {
			type: 'SET_MULTIPLE_NOTIFICATIONS';
			payload: string[] | null;
	  }
	| {
			type: 'SET_RE_NOTIFICATION';
			payload: {
				enabled: boolean;
				value: number;
				unit: string;
				conditions: ('firing' | 'nodata')[];
			};
	  }
	| { type: 'SET_DESCRIPTION'; payload: string }
	| { type: 'SET_ROUTING_POLICIES'; payload: boolean }
	| { type: 'SET_INITIAL_STATE'; payload: NotificationSettingsState }
	| { type: 'RESET' };
