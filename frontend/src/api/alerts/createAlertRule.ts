import axios from 'api';
import { AlertDetectionTypes } from 'container/FormAlertRules';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import { Labels } from 'types/api/alerts/def';

interface ApiThreshold {
	name: string;
	target: number;
	matchType: string;
	op: string;
	selectedQuery: string;
	channels: string[];
}

export interface CreateAlertRuleProps {
	schemaVersion: string;
	alert: string;
	alertType: AlertTypes;
	ruleType: AlertDetectionTypes;
	evalWindow?: string;
	condition: {
		thresholds?: {
			kind: string;
			spec: ApiThreshold[];
		};
		compositeQuery: ICompositeMetricQuery;
		op?: string;
		target?: number;
		matchType?: string;
		algorithm?: string;
		seasonality?: string;
		selectedQueryName?: string;
		alertOnAbsent?: boolean;
		absentFor?: number;
		requireMinPoints?: boolean;
		requiredNumPoints?: number;
	};
	evaluation: {
		kind: 'rolling' | 'cumulative';
		spec: {
			evalWindow?: string;
			frequency: string;
			schedule?: {
				type: 'hourly' | 'daily' | 'monthly';
				minute?: number;
				hour?: number;
				day?: number;
			};
			timezone?: string;
		};
	};
	labels: Labels;
	annotations: {
		description: string;
		summary: string;
	};
	preferredChannels?: string[];
	notificationSettings: {
		notificationGroupBy: string[];
		renotify?: string;
		alertStates: string[];
		notificationPolicy: boolean;
	};
	version: string;
}

export interface CreateAlertRuleResponse {
	schemaVersion: string;
	state: string;
	alert: string;
	alertType: AlertTypes;
	ruleType: AlertDetectionTypes;
	evalWindow: string;
	condition: {
		thresholds: {
			kind: string;
			spec: ApiThreshold[];
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
		kind: string;
		spec: {
			evalWindow: string;
			frequency: string;
		};
	};
	labels?: Labels;
	annotations: {
		description: string;
		summary: string;
	};
	disabled: boolean;
	source: string;
	preferredChannels: string[];
	notificationSettings: {
		notificationGroupBy: string[];
	};
	renotify: string;
	version: string;
	createAt: string;
	createBy: string;
	updateAt: string;
	updateBy: string;
	broadcastToAll: boolean;
}

const createAlertRule = async (
	props: CreateAlertRuleProps,
): Promise<SuccessResponse<CreateAlertRuleResponse> | ErrorResponse> => {
	const response = await axios.post(`/rules`, {
		...props,
	});

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};

export default createAlertRule;
