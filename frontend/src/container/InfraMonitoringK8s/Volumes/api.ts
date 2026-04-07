import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { UnderscoreToDotMap } from 'api/utils';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';

import { K8sBaseFilters } from '../Base/K8sBaseList';

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
	const out: Record<string, unknown> = { ...rawMeta };

	volumesMetaMap.forEach(({ dot, under }) => {
		if (dot in rawMeta) {
			const val = rawMeta[dot];
			out[under] = typeof val === 'string' ? val : rawMeta[under];
		}
	});

	return out as K8sVolumesData['meta'];
}

export const getK8sVolumesList = async (
	props: K8sBaseFilters,
	signal?: AbortSignal,
	headers?: Record<string, string>,
	dotMetricsEnabled = false,
): Promise<SuccessResponse<K8sVolumesListResponse> | ErrorResponse> => {
	try {
		const { orderBy, ...rest } = props;
		const basePayload = {
			...rest,
			filters: props.filters ?? { items: [], op: 'and' },
			...(orderBy != null ? { orderBy } : {}),
		};

		const requestProps =
			dotMetricsEnabled && Array.isArray(basePayload.filters?.items)
				? {
						...basePayload,
						filters: {
							...basePayload.filters,
							items: basePayload.filters.items.reduce<
								typeof basePayload.filters.items
							>((acc, item) => {
								if (item.value === undefined) {
									return acc;
								}
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
							}, [] as typeof basePayload.filters.items),
						},
				  }
				: basePayload;

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
