import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

export interface MetricsTreeMapPayload {
	filters: TagFilter;
	limit?: number;
	heatmap?: 'cardinality' | 'datapoints';
}

export interface MetricsTreeMapResponse {
	status: string;
	data: {
		heatmap: {
			cardinality: CardinalityData[];
			datapoints: DatapointsData[];
		};
	};
}

export interface CardinalityData {
	relative_percentage: number;
	total_value: number;
	metric_name: string;
}

export interface DatapointsData {
	percentage: number;
	metric_name: string;
}

export const getMetricsTreeMap = async (
	props: MetricsTreeMapPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<MetricsTreeMapResponse> | ErrorResponse> => {
	try {
		const response = await axios.post('/metrics/treemap', props, {
			signal,
			headers,
		});

		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload: response.data,
			params: props,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};
