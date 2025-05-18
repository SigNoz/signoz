import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

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

export const getK8sPodsList = async (
	props: K8sPodsListPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<K8sPodsListResponse> | ErrorResponse> => {
	try {
		const response = await axios.post('/pods/list', props, { signal, headers });
		const payload: K8sPodsListResponse = response.data;

		// define all dot→underscore mappings once
		const metaMappings: Array<{
			dot: keyof Record<string, unknown>;
			under: keyof K8sPodsData['meta'];
		}> = [
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
		];

		payload.data.records = payload.data.records.map((record) => {
			const rawMeta = record.meta as Record<string, unknown>;

			// build meta by looping
			const m = metaMappings.reduce((acc, { dot, under }) => {
				const v = rawMeta[dot];
				acc[under] = typeof v === 'string' ? v : (rawMeta[under] as string);
				return acc;
			}, {} as K8sPodsData['meta']);

			return { ...record, meta: m };
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
