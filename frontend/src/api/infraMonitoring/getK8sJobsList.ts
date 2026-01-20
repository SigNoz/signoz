import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import { UnderscoreToDotMap } from '../utils';

export interface K8sJobsListPayload {
	filters: TagFilter;
	groupBy?: BaseAutocompleteData[];
	offset?: number;
	limit?: number;
	orderBy?: {
		columnName: string;
		order: 'asc' | 'desc';
	};
}

export interface K8sJobsData {
	jobName: string;
	cpuUsage: number;
	memoryUsage: number;
	cpuRequest: number;
	memoryRequest: number;
	cpuLimit: number;
	memoryLimit: number;
	restarts: number;
	desiredSuccessfulPods: number;
	activePods: number;
	failedPods: number;
	successfulPods: number;
	meta: {
		k8s_cluster_name: string;
		k8s_job_name: string;
		k8s_namespace_name: string;
	};
}

export interface K8sJobsListResponse {
	status: string;
	data: {
		type: string;
		records: K8sJobsData[];
		groups: null;
		total: number;
		sentAnyHostMetricsData: boolean;
		isSendingK8SAgentMetrics: boolean;
	};
}

export const jobsMetaMap = [
	{ dot: 'k8s.cluster.name', under: 'k8s_cluster_name' },
	{ dot: 'k8s.job.name', under: 'k8s_job_name' },
	{ dot: 'k8s.namespace.name', under: 'k8s_namespace_name' },
] as const;

export function mapJobsMeta(raw: Record<string, unknown>): K8sJobsData['meta'] {
	const out: Record<string, unknown> = { ...raw };
	jobsMetaMap.forEach(({ dot, under }) => {
		if (dot in raw) {
			const v = raw[dot];
			out[under] = typeof v === 'string' ? v : raw[under];
		}
	});
	return out as K8sJobsData['meta'];
}

export const getK8sJobsList = async (
	props: K8sJobsListPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
	dotMetricsEnabled = false,
): Promise<SuccessResponse<K8sJobsListResponse> | ErrorResponse> => {
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

		const response = await axios.post('/jobs/list', requestProps, {
			signal,
			headers,
		});
		const payload: K8sJobsListResponse = response.data;

		// one-liner meta mapping
		payload.data.records = payload.data.records.map((record) => ({
			...record,
			meta: mapJobsMeta(record.meta as Record<string, unknown>),
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
