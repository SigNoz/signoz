import { AlertTypes } from './alertTypes';
import { ICompositeMetricQuery } from './compositeQuery';
import { Labels } from './def';

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
	version?: string;
	source?: string;
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
