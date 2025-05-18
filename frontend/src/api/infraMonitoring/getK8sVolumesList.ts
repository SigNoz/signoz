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

		const payload: K8sVolumesListResponse = response.data;
		payload.data.records = payload.data.records.map((record) => {
			const rawMeta = record.meta as Record<string, unknown>;

			const m: K8sVolumesData['meta'] = {
				k8s_cluster_name:
					typeof rawMeta['k8s.cluster.name'] === 'string'
						? rawMeta['k8s.cluster.name']
						: (rawMeta.k8s_cluster_name as string),
				k8s_namespace_name:
					typeof rawMeta['k8s.namespace.name'] === 'string'
						? rawMeta['k8s.namespace.name']
						: (rawMeta.k8s_namespace_name as string),
				k8s_node_name:
					typeof rawMeta['k8s.node.name'] === 'string'
						? rawMeta['k8s.node.name']
						: (rawMeta.k8s_node_name as string),
				k8s_persistentvolumeclaim_name:
					typeof rawMeta['k8s.persistentvolumeclaim.name'] === 'string'
						? rawMeta['k8s.persistentvolumeclaim.name']
						: (rawMeta.k8s_persistentvolumeclaim_name as string),
				k8s_pod_name:
					typeof rawMeta['k8s.pod.name'] === 'string'
						? rawMeta['k8s.pod.name']
						: (rawMeta.k8s_pod_name as string),
				k8s_pod_uid:
					typeof rawMeta['k8s.pod.uid'] === 'string'
						? rawMeta['k8s.pod.uid']
						: (rawMeta.k8s_pod_uid as string),
				k8s_statefulset_name:
					typeof rawMeta['k8s.statefulset.name'] === 'string'
						? rawMeta['k8s.statefulset.name']
						: (rawMeta.k8s_statefulset_name as string),
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
