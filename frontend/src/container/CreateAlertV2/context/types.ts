import { Dayjs } from 'dayjs';
import { Dispatch } from 'react';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { Labels } from 'types/api/alerts/def';

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
}

export interface ICreateAlertProviderProps {
	children: React.ReactNode;
}

export enum AlertCreationStep {
	ALERT_DEFINITION = 0,
	ALERT_CONDITION = 1,
	EVALUATION_SETTINGS = 2,
	NOTIFICATION_SETTINGS = 3,
}

export interface AlertState {
	name: string;
	description: string;
	labels: Labels;
	yAxisUnit: string | undefined;
}

export type CreateAlertAction =
	| { type: 'SET_ALERT_NAME'; payload: string }
	| { type: 'SET_ALERT_DESCRIPTION'; payload: string }
	| { type: 'SET_ALERT_LABELS'; payload: Labels }
	| { type: 'SET_Y_AXIS_UNIT'; payload: string | undefined };

export interface Threshold {
	id: string;
	label: string;
	thresholdValue: number;
	recoveryThresholdValue: number;
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
	| { type: 'RESET' };

export interface AdvancedOptionsState {
	sendNotificationIfDataIsMissing: {
		toleranceLimit: number;
		timeUnit: string;
	};
	enforceMinimumDatapoints: {
		minimumDatapoints: number;
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
			type: 'SET_ENFORCE_MINIMUM_DATAPOINTS';
			payload: { minimumDatapoints: number };
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
	| { type: 'RESET' };

export type EvaluationCadenceMode = 'default' | 'custom' | 'rrule';
