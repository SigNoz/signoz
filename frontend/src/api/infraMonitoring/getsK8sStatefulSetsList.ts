import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

export interface K8sStatefulSetsListPayload {
	filters: TagFilter;
	groupBy?: BaseAutocompleteData[];
	offset?: number;
	limit?: number;
	orderBy?: {
		columnName: string;
		order: 'asc' | 'desc';
	};
}

export interface K8sStatefulSetsData {
	statefulSetName: string;
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
		k8s_statefulset_name: string;
		k8s_namespace_name: string;
	};
}

export interface K8sStatefulSetsListResponse {
	status: string;
	data: {
		type: string;
		records: K8sStatefulSetsData[];
		groups: null;
		total: number;
		sentAnyHostMetricsData: boolean;
		isSendingK8SAgentMetrics: boolean;
	};
}

export const getK8sStatefulSetsList = async (
	props: K8sStatefulSetsListPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<K8sStatefulSetsListResponse> | ErrorResponse> => {
	try {
		const response = await axios.post('/statefulsets/list', props, {
			signal,
			headers,
		});

		const payload: K8sStatefulSetsListResponse = response.data;
		payload.data.records = payload.data.records.map((record) => {
			// rawMeta may have either form
			const rawMeta = record.meta as Record<string, unknown>;

			// construct a fully-typed meta object, preferring dot-notation when present
			const m: K8sStatefulSetsData['meta'] = {
				k8s_statefulset_name:
					typeof rawMeta['k8s.statefulset.name'] === 'string'
						? rawMeta['k8s.statefulset.name']
						: (rawMeta.k8s_statefulset_name as string),
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
