import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

export interface K8sDeploymentsListPayload {
	filters: TagFilter;
	groupBy?: BaseAutocompleteData[];
	offset?: number;
	limit?: number;
	orderBy?: {
		columnName: string;
		order: 'asc' | 'desc';
	};
}

export interface K8sDeploymentsData {
	deploymentName: string;
	cpuUsage: number;
	memoryUsage: number;
	desiredPods: number;
	availablePods: number;
	cpuRequest: number;
	memoryRequest: number;
	cpuLimit: number;
	memoryLimit: number;
	restarts: number;
	meta: {
		k8s_cluster_name: string;
		k8s_deployment_name: string;
		k8s_namespace_name: string;
	};
}

export interface K8sDeploymentsListResponse {
	status: string;
	data: {
		type: string;
		records: K8sDeploymentsData[];
		groups: null;
		total: number;
		sentAnyHostMetricsData: boolean;
		isSendingK8SAgentMetrics: boolean;
	};
}

export const getK8sDeploymentsList = async (
	props: K8sDeploymentsListPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<K8sDeploymentsListResponse> | ErrorResponse> => {
	try {
		const response = await axios.post('/deployments/list', props, {
			signal,
			headers,
		});

		const payload: K8sDeploymentsListResponse = response.data;
		payload.data.records = payload.data.records.map((record) => {
			// loosened map to inspect both dot- and underscore-keys
			const rawMeta = record.meta as Record<string, unknown>;

			// assemble a fully-typed meta object
			const m: K8sDeploymentsData['meta'] = {
				k8s_cluster_name:
					typeof rawMeta['k8s.cluster.name'] === 'string'
						? rawMeta['k8s.cluster.name']
						: (rawMeta.k8s_cluster_name as string),
				k8s_deployment_name:
					typeof rawMeta['k8s.deployment.name'] === 'string'
						? rawMeta['k8s.deployment.name']
						: (rawMeta.k8s_deployment_name as string),
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
