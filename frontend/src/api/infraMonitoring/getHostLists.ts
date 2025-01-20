import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

export interface HostListPayload {
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

export interface HostData {
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

export interface HostListResponse {
	status: string;
	data: {
		type: string;
		records: HostData[];
		groups: null;
		total: number;
		sentAnyHostMetricsData: boolean;
		isSendingK8SAgentMetrics: boolean;
	};
}

export const getHostLists = async (
	props: HostListPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<HostListResponse> | ErrorResponse> => {
	try {
		const response = await axios.post('/hosts/list', props, {
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
