import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

export interface K8sNamespacesListPayload {
	filters: TagFilter;
	groupBy?: BaseAutocompleteData[];
	offset?: number;
	limit?: number;
	orderBy?: {
		columnName: string;
		order: 'asc' | 'desc';
	};
}

export interface K8sNamespacesData {
	namespaceName: string;
	cpuUsage: number;
	memoryUsage: number;
	meta: {
		k8s_cluster_name: string;
		k8s_namespace_name: string;
	};
}

export interface K8sNamespacesListResponse {
	status: string;
	data: {
		type: string;
		records: K8sNamespacesData[];
		groups: null;
		total: number;
		sentAnyHostMetricsData: boolean;
		isSendingK8SAgentMetrics: boolean;
	};
}

export const getK8sNamespacesList = async (
	props: K8sNamespacesListPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<K8sNamespacesListResponse> | ErrorResponse> => {
	try {
		const response = await axios.post('/namespaces/list', props, {
			signal,
			headers,
		});

		const payload: K8sNamespacesListResponse = response.data;
		payload.data.records = payload.data.records.map((record) => {
			const rawMeta = record.meta as Record<string, unknown>;
			const m: K8sNamespacesData['meta'] = {
				k8s_cluster_name:
					typeof rawMeta['k8s.cluster.name'] === 'string'
						? rawMeta['k8s.cluster.name']
						: (rawMeta.k8s_cluster_name as string),
				k8s_namespace_name:
					typeof rawMeta['k8s.namespace.name'] === 'string'
						? rawMeta['k8s.namespace.name']
						: (rawMeta.k8s_namespace_name as string),
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
