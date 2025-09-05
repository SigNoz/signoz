import { Dispatch } from 'react';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { AlertDef, Labels } from 'types/api/alerts/def';

export interface ICreateAlertContextProps {
	alertState: AlertState;
	setAlertState: Dispatch<CreateAlertAction>;
	alertType: AlertTypes;
	setAlertType: Dispatch<AlertTypes>;
	alertDef: AlertDef;
	thresholdState: AlertThresholdState;
	setThresholdState: Dispatch<AlertThresholdAction>;
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
}

export type CreateAlertAction =
	| { type: 'SET_ALERT_NAME'; payload: string }
	| { type: 'SET_ALERT_DESCRIPTION'; payload: string }
	| { type: 'SET_ALERT_LABELS'; payload: Labels };

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

export type AlertThresholdAction =
	| { type: 'SET_SELECTED_QUERY'; payload: string }
	| { type: 'SET_OPERATOR'; payload: AlertThresholdOperator }
	| { type: 'SET_MATCH_TYPE'; payload: AlertThresholdMatchType }
	| { type: 'SET_EVALUATION_WINDOW'; payload: string }
	| { type: 'SET_ALGORITHM'; payload: string }
	| { type: 'SET_SEASONALITY'; payload: string }
	| { type: 'SET_THRESHOLDS'; payload: Threshold[] }
	| { type: 'RESET' };
