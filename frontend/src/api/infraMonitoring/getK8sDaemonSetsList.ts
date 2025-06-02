import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import { UnderscoreToDotMap } from '../utils';

export interface K8sDaemonSetsListPayload {
	filters: TagFilter;
	groupBy?: BaseAutocompleteData[];
	offset?: number;
	limit?: number;
	orderBy?: {
		columnName: string;
		order: 'asc' | 'desc';
	};
}

export interface K8sDaemonSetsData {
	daemonSetName: string;
	cpuUsage: number;
	memoryUsage: number;
	cpuRequest: number;
	memoryRequest: number;
	cpuLimit: number;
	memoryLimit: number;
	restarts: number;
	desiredNodes: number;
	availableNodes: number;
	meta: {
		k8s_cluster_name: string;
		k8s_daemonset_name: string;
		k8s_namespace_name: string;
	};
}

export interface K8sDaemonSetsListResponse {
	status: string;
	data: {
		type: string;
		records: K8sDaemonSetsData[];
		groups: null;
		total: number;
		sentAnyHostMetricsData: boolean;
		isSendingK8SAgentMetrics: boolean;
	};
}

export const daemonSetsMetaMap = [
	{ dot: 'k8s.namespace.name', under: 'k8s_namespace_name' },
	{ dot: 'k8s.daemonset.name', under: 'k8s_daemonset_name' },
	{ dot: 'k8s.cluster.name', under: 'k8s_cluster_name' },
] as const;

export function mapDaemonSetsMeta(
	raw: Record<string, unknown>,
): K8sDaemonSetsData['meta'] {
	const out: Record<string, unknown> = { ...raw };
	daemonSetsMetaMap.forEach(({ dot, under }) => {
		if (dot in raw) {
			const v = raw[dot];
			out[under] = typeof v === 'string' ? v : raw[under];
		}
	});
	return out as K8sDaemonSetsData['meta'];
}

export const getK8sDaemonSetsList = async (
	props: K8sDaemonSetsListPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
	dotMetricsEnabled = false,
): Promise<SuccessResponse<K8sDaemonSetsListResponse> | ErrorResponse> => {
	try {
		// filter prep (unchanged)…
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

		const response = await axios.post('/daemonsets/list', requestProps, {
			signal,
			headers,
		});
		const payload: K8sDaemonSetsListResponse = response.data;

		// single-line meta mapping
		payload.data.records = payload.data.records.map((record) => ({
			...record,
			meta: mapDaemonSetsMeta(record.meta as Record<string, unknown>),
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
