import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

export interface K8sNodesListPayload {
	filters: TagFilter;
	groupBy?: BaseAutocompleteData[];
	offset?: number;
	limit?: number;
	orderBy?: {
		columnName: string;
		order: 'asc' | 'desc';
	};
}

export interface K8sNodesData {
	nodeUID: string;
	nodeCPUUsage: number;
	nodeCPUAllocatable: number;
	nodeMemoryUsage: number;
	nodeMemoryAllocatable: number;
	meta: {
		k8s_node_name: string;
		k8s_node_uid: string;
		k8s_cluster_name: string;
	};
}

export interface K8sNodesListResponse {
	status: string;
	data: {
		type: string;
		records: K8sNodesData[];
		groups: null;
		total: number;
		sentAnyHostMetricsData: boolean;
		isSendingK8SAgentMetrics: boolean;
	};
}

export const getK8sNodesList = async (
	props: K8sNodesListPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<K8sNodesListResponse> | ErrorResponse> => {
	try {
		const response = await axios.post('/nodes/list', props, {
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
