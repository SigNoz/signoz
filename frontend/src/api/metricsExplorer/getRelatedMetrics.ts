import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export interface RelatedMetricsPayload {
	start: number;
	end: number;
	currentMetricName: string;
}

export interface RelatedMetricDashboard {
	dashboard_name: string;
	dashboard_id: string;
	widget_id: string;
	widget_name: string;
}

export interface RelatedMetricAlert {
	alert_name: string;
	alert_id: string;
}

export interface RelatedMetric {
	name: string;
	query: IBuilderQuery;
	dashboards: RelatedMetricDashboard[];
	alerts: RelatedMetricAlert[];
}

export interface RelatedMetricsResponse {
	status: 'success';
	data: {
		related_metrics: RelatedMetric[];
	};
}

export const getRelatedMetrics = async (
	props: RelatedMetricsPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<RelatedMetricsResponse> | ErrorResponse> => {
	try {
		const response = await axios.post('/metrics/related', props, {
			signal,
			headers,
		});

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data,
			params: props,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};
