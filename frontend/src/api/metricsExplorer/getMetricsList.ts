import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { TreemapViewType } from 'container/MetricsExplorer/Summary/types';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

export interface MetricsListPayload {
	filters: TagFilter;
	groupBy?: BaseAutocompleteData[];
	offset?: number;
	limit?: number;
	orderBy?: {
		columnName: string;
		order: 'asc' | 'desc';
	}[];
	heatmap: TreemapViewType;
}

export enum MetricType {
	SUM = 'sum',
	GAUGE = 'gauge',
	HISTOGRAM = 'histogram',
	SUMMARY = 'summary',
	EXPONENTIAL_HISTOGRAM = 'exponential_histogram',
}

export interface MetricsListItemData {
	name: string;
	description: string;
	type: MetricType;
	unit: string;
	cardinality: number;
	dataPoints: number;
	lastReceived: string;
}

export interface MetricsListResponse {
	status: string;
	data: {
		metrics: MetricsListItemData[];
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
			message: 'Success',
			payload: response.data,
			params: props,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};
