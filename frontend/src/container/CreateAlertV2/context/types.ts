import { Dispatch } from 'react';
import { Labels } from 'types/api/alerts/def';

export interface ICreateAlertContextProps {
	alertState: AlertState;
	setAlertState: Dispatch<CreateAlertAction>;
	step: AlertCreationStep;
	setStep: Dispatch<AlertCreationStep>;
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
