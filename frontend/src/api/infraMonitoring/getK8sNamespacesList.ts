import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import { UnderscoreToDotMap } from '../utils';

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

export const namespacesMetaMap = [
	{ dot: 'k8s.cluster.name', under: 'k8s_cluster_name' },
	{ dot: 'k8s.namespace.name', under: 'k8s_namespace_name' },
] as const;

export function mapNamespacesMeta(
	raw: Record<string, unknown>,
): K8sNamespacesData['meta'] {
	const out: Record<string, unknown> = { ...raw };
	namespacesMetaMap.forEach(({ dot, under }) => {
		if (dot in raw) {
			const v = raw[dot];
			out[under] = typeof v === 'string' ? v : raw[under];
		}
	});
	return out as K8sNamespacesData['meta'];
}

export const getK8sNamespacesList = async (
	props: K8sNamespacesListPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
	dotMetricsEnabled = false,
): Promise<SuccessResponse<K8sNamespacesListResponse> | ErrorResponse> => {
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

		const response = await axios.post('/namespaces/list', requestProps, {
			signal,
			headers,
		});
		const payload: K8sNamespacesListResponse = response.data;

		payload.data.records = payload.data.records.map((record) => ({
			...record,
			meta: mapNamespacesMeta(record.meta as Record<string, unknown>),
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
