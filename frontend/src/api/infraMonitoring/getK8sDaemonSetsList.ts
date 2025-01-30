import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

export interface K8sDaemonSetsListPayload {
	filters: TagFilter;
	groupBy?: BaseAutocompleteData[];
	offset?: number;
	limit?: number;
	orderBy?: {
		columnName: string;
		order: 'asc' | 'desc';
	};
}

export interface K8sDaemonSetsData {
	daemonSetName: string;
	cpuUsage: number;
	memoryUsage: number;
	cpuRequest: number;
	memoryRequest: number;
	cpuLimit: number;
	memoryLimit: number;
	restarts: number;
	desiredNodes: number;
	availableNodes: number;
	meta: {
		k8s_cluster_name: string;
		k8s_daemonset_name: string;
		k8s_namespace_name: string;
	};
}

export interface K8sDaemonSetsListResponse {
	status: string;
	data: {
		type: string;
		records: K8sDaemonSetsData[];
		groups: null;
		total: number;
		sentAnyHostMetricsData: boolean;
		isSendingK8SAgentMetrics: boolean;
	};
}

export const getK8sDaemonSetsList = async (
	props: K8sDaemonSetsListPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<K8sDaemonSetsListResponse> | ErrorResponse> => {
	try {
		const response = await axios.post('/daemonsets/list', props, {
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
