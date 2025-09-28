import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	ApiAlertRule,
	ApiEvaluation,
	ApiThreshold,
} from 'types/api/alerts/alertsV2';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import { Labels } from 'types/api/alerts/def';

export interface CreateAlertRuleProps {
	alert: string;
	alertType: AlertTypes;
	condition: {
		thresholds?: {
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
	renotify?: string;
	version: string;
	broadcastToAll: boolean;
}

const createAlertRule = async (
	props: CreateAlertRuleProps,
): Promise<SuccessResponse<ApiAlertRule> | ErrorResponse> => {
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
