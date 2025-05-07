import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

export interface InspectMetricsRequest {
	metricName: string;
	start: number;
	end: number;
	filters: TagFilter;
}

export interface InspectMetricsResponse {
	status: string;
	data: {
		series: InspectMetricsSeries[];
	};
}

export interface InspectMetricsSeries {
	title?: string;
	strokeColor?: string;
	labels: Record<string, string>;
	labelsArray: Array<Record<string, string>>;
	values: InspectMetricsTimestampValue[];
}

interface InspectMetricsTimestampValue {
	timestamp: number;
	value: string;
}

export const getInspectMetricsDetails = async (
	request: InspectMetricsRequest,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<InspectMetricsResponse> | ErrorResponse> => {
	try {
		const response = await axios.post(`/metrics/inspect`, request, {
			signal,
			headers,
		});

		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};
