import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import { UnderscoreToDotMap } from '../utils';

export interface K8sPodsListPayload {
	filters: TagFilter;
	groupBy?: BaseAutocompleteData[];
	offset?: number;
	limit?: number;
	orderBy?: {
		columnName: string;
		order: 'asc' | 'desc';
	};
}

export interface TimeSeriesValue {
	timestamp: number;
	value: string;
}

export interface TimeSeries {
	labels: Record<string, string>;
	labelsArray: Array<Record<string, string>>;
	values: TimeSeriesValue[];
}

export interface K8sPodsData {
	podUID: string;
	podCPU: number;
	podCPURequest: number;
	podCPULimit: number;
	podMemory: number;
	podMemoryRequest: number;
	podMemoryLimit: number;
	restartCount: number;
	meta: {
		k8s_cronjob_name: string;
		k8s_daemonset_name: string;
		k8s_deployment_name: string;
		k8s_job_name: string;
		k8s_namespace_name: string;
		k8s_node_name: string;
		k8s_pod_name: string;
		k8s_pod_uid: string;
		k8s_statefulset_name: string;
		k8s_cluster_name: string;
	};
	countByPhase: {
		pending: number;
		running: number;
		succeeded: number;
		failed: number;
		unknown: number;
	};
}

export interface K8sPodsListResponse {
	status: string;
	data: {
		type: string;
		records: K8sPodsData[];
		groups: null;
		total: number;
		sentAnyHostMetricsData: boolean;
		isSendingK8SAgentMetrics: boolean;
	};
}

export const podsMetaMap = [
	{ dot: 'k8s.cronjob.name', under: 'k8s_cronjob_name' },
	{ dot: 'k8s.daemonset.name', under: 'k8s_daemonset_name' },
	{ dot: 'k8s.deployment.name', under: 'k8s_deployment_name' },
	{ dot: 'k8s.job.name', under: 'k8s_job_name' },
	{ dot: 'k8s.namespace.name', under: 'k8s_namespace_name' },
	{ dot: 'k8s.node.name', under: 'k8s_node_name' },
	{ dot: 'k8s.pod.name', under: 'k8s_pod_name' },
	{ dot: 'k8s.pod.uid', under: 'k8s_pod_uid' },
	{ dot: 'k8s.statefulset.name', under: 'k8s_statefulset_name' },
	{ dot: 'k8s.cluster.name', under: 'k8s_cluster_name' },
] as const;

export function mapPodsMeta(raw: Record<string, unknown>): K8sPodsData['meta'] {
	// clone everything
	const out: Record<string, unknown> = { ...raw };
	// overlay only the dot→under mappings
	podsMetaMap.forEach(({ dot, under }) => {
		if (dot in raw) {
			const v = raw[dot];
			out[under] = typeof v === 'string' ? v : raw[under];
		}
	});
	return out as K8sPodsData['meta'];
}

// getK8sPodsList
export const getK8sPodsList = async (
	props: K8sPodsListPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
	dotMetricsEnabled = false,
): Promise<SuccessResponse<K8sPodsListResponse> | ErrorResponse> => {
	try {
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
										acc.push({
											...item,
											key: { ...item.key, key: mappedKey },
										});
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

		const response = await axios.post('/pods/list', requestProps, {
			signal,
			headers,
		});
		const payload: K8sPodsListResponse = response.data;
		payload.data.records = payload.data.records.map((record) => ({
			...record,
			meta: mapPodsMeta(record.meta as Record<string, unknown>),
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
