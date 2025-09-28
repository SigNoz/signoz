import { AlertTypes } from './alertTypes';
import { ICompositeMetricQuery } from './compositeQuery';
import { Labels } from './def';

export type ApiAlertState = 'firing' | 'normal' | 'no-data' | 'muted';

export interface ApiThreshold {
	name: string;
	target: number;
	targetUnit: string;
	ruleUnit: string;
	recoveryTarget: number | null;
	matchType: string;
	op: string;
	selectedQuery: string;
	channels: string[];
}

export type ApiEvaluation = 'rolling' | 'cumulative';

export interface ApiAlertRule {
	id: string;
	state: ApiAlertState;
	alert: string;
	alertType: AlertTypes;
	condition: {
		thresholds: {
			kind: string;
			specs: ApiThreshold[];
		};
		compositeQuery: ICompositeMetricQuery;
		op: string;
		target: number;
		matchType: string;
		algorithm: string;
		seasonality: string;
		selectedQueryName: string;
	};
	evaluation: {
		kind: ApiEvaluation;
		spec: {
			evalWindow: string;
			frequency: string;
		};
	};
	labels: Labels;
	annotations: {
		description: string;
		summary: string;
	};
	disabled: boolean;
	source: string;
	preferredChannels: string[];
	notificationGroups: string[];
	renotify: string;
	version: string;
	createAt: string;
	createBy: string;
	updateAt: string;
	updateBy: string;
	broadcastToAll: boolean;
}
