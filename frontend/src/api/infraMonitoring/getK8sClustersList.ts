import axios from 'api';
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
	clusterUID: string;
	cpuUsage: number;
	cpuAllocatable: number;
	memoryUsage: number;
	memoryAllocatable: number;
	meta: {
		k8s_cluster_name: string;
		k8s_cluster_uid: string;
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
		const response = await axios.post('/clusters/list', props, {
			signal,
			headers,
		});

		const payload: K8sClustersListResponse = response.data;
		payload.data.records = payload.data.records.map((record) => {
			const rawMeta = record.meta as Record<string, unknown>;
			const m: K8sClustersData['meta'] = {
				k8s_cluster_name:
					typeof rawMeta['k8s.cluster.name'] === 'string'
						? rawMeta['k8s.cluster.name']
						: (rawMeta.k8s_cluster_name as string),
				k8s_cluster_uid:
					typeof rawMeta['k8s.cluster.uid'] === 'string'
						? rawMeta['k8s.cluster.uid']
						: (rawMeta.k8s_cluster_uid as string),
			};

			return {
				...record,
				meta: m,
			};
		});

		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload,
			params: props,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};
