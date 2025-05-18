import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

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

export const getK8sJobsList = async (
	props: K8sJobsListPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<K8sJobsListResponse> | ErrorResponse> => {
	try {
		const response = await axios.post('/jobs/list', props, {
			signal,
			headers,
		});

		const payload: K8sJobsListResponse = response.data;
		payload.data.records = payload.data.records.map((record) => {
			const rawMeta = record.meta as Record<string, unknown>;
			const m: K8sJobsData['meta'] = {
				k8s_cluster_name:
					typeof rawMeta['k8s.cluster.name'] === 'string'
						? rawMeta['k8s.cluster.name']
						: (rawMeta.k8s_cluster_name as string),
				k8s_job_name:
					typeof rawMeta['k8s.job.name'] === 'string'
						? rawMeta['k8s.job.name']
						: (rawMeta.k8s_job_name as string),
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
