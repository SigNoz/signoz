import { ApiBaseInstance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

export interface K8sClustersListPayload {
	filters: TagFilter;
	groupBy?: BaseAutocompleteData[];
	offset?: number;
	limit?: number;
	orderBy?: {
		columnName: string;
		order: 'asc' | 'desc';
	};
}

export interface K8sClustersData {
	clusterName: string;
	cpuUsage: number;
	memoryUsage: number;
	desiredPods: number;
	availablePods: number;
	cpuRequest: number;
	memoryRequest: number;
	cpuLimit: number;
	memoryLimit: number;
	restarts: number;
	meta: {
		k8s_cluster_name: string;
		k8s_namespace_name: string;
	};
}

export interface K8sClustersListResponse {
	status: string;
	data: {
		type: string;
		records: K8sClustersData[];
		groups: null;
		total: number;
		sentAnyHostMetricsData: boolean;
		isSendingK8SAgentMetrics: boolean;
	};
}

export const getK8sClustersList = async (
	props: K8sClustersListPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<K8sClustersListResponse> | ErrorResponse> => {
	try {
		const response = await ApiBaseInstance.post('/clusters/list', props, {
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
