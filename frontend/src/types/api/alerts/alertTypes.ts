import { ICompositeMetricQuery } from './compositeQuery';
import { Labels } from './def';

// this list must exactly match with the backend
export enum AlertTypes {
	ANOMALY_BASED_ALERT = 'ANOMALY_BASED_ALERT',
	METRICS_BASED_ALERT = 'METRIC_BASED_ALERT',
	LOGS_BASED_ALERT = 'LOGS_BASED_ALERT',
	TRACES_BASED_ALERT = 'TRACES_BASED_ALERT',
	EXCEPTIONS_BASED_ALERT = 'EXCEPTIONS_BASED_ALERT',
}

export interface BasicThreshold {
	name: string;
	target: number;
	matchType: string;
	op: string;
	channels: string[];
	targetUnit: string;
}

export interface PostableAlertRuleV2 {
	schemaVersion: string;
	id?: string;
	alert: string;
	alertType?: AlertTypes;
	ruleType?: string;
	condition: {
		thresholds?: {
			kind: string;
			spec: BasicThreshold[];
		};
		compositeQuery: ICompositeMetricQuery;
		selectedQueryName?: string;
		alertOnAbsent?: boolean;
		absentFor?: number;
		requireMinPoints?: boolean;
		requiredNumPoints?: number;
		seasonality?: string;
	};
	evaluation?: {
		kind?: 'rolling' | 'cumulative';
		spec?: {
			evalWindow?: string;
			frequency?: string;
			schedule?: {
				type?: 'hourly' | 'daily' | 'monthly';
				minute?: number;
				hour?: number;
				day?: number;
			};
			timezone?: string;
		};
	};
	labels?: Labels;
	annotations?: {
		description: string;
		summary: string;
	};
	notificationSettings?: {
		groupBy?: string[];
		renotify?: {
			enabled: boolean;
			interval?: string;
			alertStates?: string[];
		};
		usePolicy?: boolean;
	};
	state?: string;
	disabled?: boolean;
}

export interface AlertRuleV2 extends PostableAlertRuleV2 {
	schemaVersion: string;
	state: string;
	disabled: boolean;
	createAt: string;
	createBy: string;
	updateAt: string;
	updateBy: string;
}

export const NEW_ALERT_SCHEMA_VERSION = 'v2alpha1';
