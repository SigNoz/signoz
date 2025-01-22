import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

export interface K8sVolumesListPayload {
	filters: TagFilter;
	groupBy?: BaseAutocompleteData[];
	offset?: number;
	limit?: number;
	orderBy?: {
		columnName: string;
		order: 'asc' | 'desc';
	};
}

export interface K8sVolumesData {
	persistentVolumeClaimName: string;
	volumeAvailable: number;
	volumeCapacity: number;
	volumeInodes: number;
	volumeInodesFree: number;
	volumeInodesUsed: number;
	volumeUsage: number;
	meta: {
		k8s_cluster_name: string;
		k8s_namespace_name: string;
		k8s_node_name: string;
		k8s_persistentvolumeclaim_name: string;
		k8s_pod_name: string;
		k8s_pod_uid: string;
		k8s_statefulset_name: string;
	};
}

export interface K8sVolumesListResponse {
	status: string;
	data: {
		type: string;
		records: K8sVolumesData[];
		groups: null;
		total: number;
		sentAnyHostMetricsData: boolean;
		isSendingK8SAgentMetrics: boolean;
	};
}

export const getK8sVolumesList = async (
	props: K8sVolumesListPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<K8sVolumesListResponse> | ErrorResponse> => {
	try {
		const response = await axios.post('/pvcs/list', props, {
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
