import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { TreemapViewType } from 'container/MetricsExplorer/Summary/types';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

export interface MetricsTreeMapPayload {
	filters: TagFilter;
	limit?: number;
	treemap?: TreemapViewType;
}

export interface MetricsTreeMapResponse {
	status: string;
	data: {
		[TreemapViewType.TIMESERIES]: TimeseriesData[];
		[TreemapViewType.SAMPLES]: SamplesData[];
	};
}

export interface TimeseriesData {
	percentage: number;
	total_value: number;
	metric_name: string;
}

export interface SamplesData {
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
			message: response.data.status,
			payload: response.data,
			params: props,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};
