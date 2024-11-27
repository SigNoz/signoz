import { ApiBaseInstance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

export interface K8sPodsListPayload {
	filters: TagFilter;
	groupBy: BaseAutocompleteData[];
	offset?: number;
	limit?: number;
	orderBy?: {
		columnName: string;
		order: 'asc' | 'desc';
	};
}

export interface TimeSeriesValue {
	timestamp: number;
	value: string;
}

export interface TimeSeries {
	labels: Record<string, string>;
	labelsArray: Array<Record<string, string>>;
	values: TimeSeriesValue[];
}

export interface K8sPodsData {
	hostName: string;
	active: boolean;
	os: string;
	cpu: number;
	cpuTimeSeries: TimeSeries;
	memory: number;
	memoryTimeSeries: TimeSeries;
	wait: number;
	waitTimeSeries: TimeSeries;
	load15: number;
	load15TimeSeries: TimeSeries;
}

export interface K8sPodsListResponse {
	status: string;
	data: {
		type: string;
		records: K8sPodsData[];
		groups: null;
		total: number;
		sentAnyHostMetricsData: boolean;
		isSendingK8SAgentMetrics: boolean;
	};
}

export const getK8sPodsList = async (
	props: K8sPodsListPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<K8sPodsListResponse> | ErrorResponse> => {
	try {
		const response = await ApiBaseInstance.post('/pods/list', props, {
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
