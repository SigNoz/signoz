import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import { UnderscoreToDotMap } from '../utils';

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

export const volumesMetaMap: Array<{
	dot: keyof Record<string, unknown>;
	under: keyof K8sVolumesData['meta'];
}> = [
	{ dot: 'k8s.cluster.name', under: 'k8s_cluster_name' },
	{ dot: 'k8s.namespace.name', under: 'k8s_namespace_name' },
	{ dot: 'k8s.node.name', under: 'k8s_node_name' },
	{
		dot: 'k8s.persistentvolumeclaim.name',
		under: 'k8s_persistentvolumeclaim_name',
	},
	{ dot: 'k8s.pod.name', under: 'k8s_pod_name' },
	{ dot: 'k8s.pod.uid', under: 'k8s_pod_uid' },
	{ dot: 'k8s.statefulset.name', under: 'k8s_statefulset_name' },
];

export function mapVolumesMeta(
	rawMeta: Record<string, unknown>,
): K8sVolumesData['meta'] {
	// start with everything that was already there
	const out: Record<string, unknown> = { ...rawMeta };

	// for each dot→under rule, if the raw has the dot, overwrite the underscore
	volumesMetaMap.forEach(({ dot, under }) => {
		if (dot in rawMeta) {
			const val = rawMeta[dot];
			out[under] = typeof val === 'string' ? val : rawMeta[under];
		}
	});

	return out as K8sVolumesData['meta'];
}

export const getK8sVolumesList = async (
	props: K8sVolumesListPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
	dotMetricsEnabled = false,
): Promise<SuccessResponse<K8sVolumesListResponse> | ErrorResponse> => {
	try {
		// Prepare filters
		const requestProps =
			dotMetricsEnabled && Array.isArray(props.filters?.items)
				? {
						...props,
						filters: {
							...props.filters,
							items: props.filters.items.reduce<typeof props.filters.items>(
								(acc, item) => {
									if (item.value === undefined) return acc;
									if (
										item.key &&
										typeof item.key === 'object' &&
										'key' in item.key &&
										typeof item.key.key === 'string'
									) {
										const mappedKey = UnderscoreToDotMap[item.key.key] ?? item.key.key;
										acc.push({ ...item, key: { ...item.key, key: mappedKey } });
									} else {
										acc.push(item);
									}
									return acc;
								},
								[] as typeof props.filters.items,
							),
						},
				  }
				: props;

		const response = await axios.post('/pvcs/list', requestProps, {
			signal,
			headers,
		});
		const payload: K8sVolumesListResponse = response.data;

		payload.data.records = payload.data.records.map((record) => ({
			...record,
			meta: mapVolumesMeta(record.meta as Record<string, unknown>),
		}));

		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload,
			params: requestProps,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};
