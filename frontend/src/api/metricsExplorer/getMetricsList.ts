import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import {
	OrderByPayload,
	TreemapViewType,
} from 'container/MetricsExplorer/Summary/types';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

export interface MetricsListPayload {
	filters: TagFilter;
	groupBy?: BaseAutocompleteData[];
	offset?: number;
	limit?: number;
	orderBy?: OrderByPayload;
}

export enum MetricType {
	SUM = 'Sum',
	GAUGE = 'Gauge',
	HISTOGRAM = 'Histogram',
	SUMMARY = 'Summary',
	EXPONENTIAL_HISTOGRAM = 'ExponentialHistogram',
}

export interface MetricsListItemData {
	metric_name: string;
	description: string;
	type: MetricType;
	unit: string;
	[TreemapViewType.TIMESERIES]: number;
	[TreemapViewType.SAMPLES]: number;
	lastReceived: string;
}

export interface MetricsListResponse {
	status: string;
	data: {
		metrics: MetricsListItemData[];
		total?: number;
	};
}

export const getMetricsList = async (
	props: MetricsListPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<MetricsListResponse> | ErrorResponse> => {
	try {
		const response = await axios.post('/metrics', props, {
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
