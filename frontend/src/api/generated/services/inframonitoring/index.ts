/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 * OpenAPI spec version: 0.0.1
 */
import { useMutation } from 'react-query';
import type {
	MutationFunction,
	UseMutationOptions,
	UseMutationResult,
} from 'react-query';

import type {
	InframonitoringtypesPostableClustersDTO,
	InframonitoringtypesPostableDeploymentsDTO,
	InframonitoringtypesPostableHostsDTO,
	InframonitoringtypesPostableJobsDTO,
	InframonitoringtypesPostableNamespacesDTO,
	InframonitoringtypesPostableNodesDTO,
	InframonitoringtypesPostablePodsDTO,
	InframonitoringtypesPostableStatefulSetsDTO,
	InframonitoringtypesPostableVolumesDTO,
	ListClusters200,
	ListDeployments200,
	ListHosts200,
	ListJobs200,
	ListNamespaces200,
	ListNodes200,
	ListPods200,
	ListStatefulSets200,
	ListVolumes200,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * Returns a paginated list of Kubernetes clusters with key aggregated metrics derived by summing per-node values within the group: CPU usage, CPU allocatable, memory working set, memory allocatable. Each row also reports per-group nodeCountsByReadiness ({ ready, notReady } from each node's latest k8s.node.condition_ready value) and per-group podCountsByPhase ({ pending, running, succeeded, failed, unknown } from each pod's latest k8s.pod.phase value). Each cluster includes metadata attributes (k8s.cluster.name). The response type is 'list' for the default k8s.cluster.name grouping or 'grouped_list' for custom groupBy keys; in both modes every row aggregates nodes and pods in the group. Supports filtering via a filter expression, custom groupBy, ordering by cpu / cpu_allocatable / memory / memory_allocatable, and pagination via offset/limit. Also reports missing required metrics and whether the requested time range falls before the data retention boundary. Numeric metric fields (clusterCPU, clusterCPUAllocatable, clusterMemory, clusterMemoryAllocatable) return -1 as a sentinel when no data is available for that field.
 * @summary List Clusters for Infra Monitoring
 */
export const listClusters = (
	inframonitoringtypesPostableClustersDTO?: BodyType<InframonitoringtypesPostableClustersDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListClusters200>({
		url: `/api/v2/infra_monitoring/clusters`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: inframonitoringtypesPostableClustersDTO,
		signal,
	});
};

export const getListClustersMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listClusters>>,
		TError,
		{ data?: BodyType<InframonitoringtypesPostableClustersDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof listClusters>>,
	TError,
	{ data?: BodyType<InframonitoringtypesPostableClustersDTO> },
	TContext
> => {
	const mutationKey = ['listClusters'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof listClusters>>,
		{ data?: BodyType<InframonitoringtypesPostableClustersDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return listClusters(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ListClustersMutationResult = NonNullable<
	Awaited<ReturnType<typeof listClusters>>
>;
export type ListClustersMutationBody =
	| BodyType<InframonitoringtypesPostableClustersDTO>
	| undefined;
export type ListClustersMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List Clusters for Infra Monitoring
 */
export const useListClusters = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listClusters>>,
		TError,
		{ data?: BodyType<InframonitoringtypesPostableClustersDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof listClusters>>,
	TError,
	{ data?: BodyType<InframonitoringtypesPostableClustersDTO> },
	TContext
> => {
	return useMutation(getListClustersMutationOptions(options));
};
/**
 * Returns a paginated list of Kubernetes Deployments with key aggregated pod metrics: CPU usage and memory working set summed across pods owned by the deployment, plus average CPU/memory request and limit utilization (deploymentCPURequest, deploymentCPULimit, deploymentMemoryRequest, deploymentMemoryLimit). Each row also reports the latest known desiredPods (k8s.deployment.desired) and availablePods (k8s.deployment.available) replica counts and per-group podCountsByPhase ({ pending, running, succeeded, failed, unknown } from each pod's latest k8s.pod.phase value). Each deployment includes metadata attributes (k8s.deployment.name, k8s.namespace.name, k8s.cluster.name). The response type is 'list' for the default k8s.deployment.name grouping or 'grouped_list' for custom groupBy keys; in both modes every row aggregates pods owned by deployments in the group. Supports filtering via a filter expression, custom groupBy, ordering by cpu / cpu_request / cpu_limit / memory / memory_request / memory_limit / desired_pods / available_pods, and pagination via offset/limit. Also reports missing required metrics and whether the requested time range falls before the data retention boundary. Numeric metric fields (deploymentCPU, deploymentCPURequest, deploymentCPULimit, deploymentMemory, deploymentMemoryRequest, deploymentMemoryLimit, desiredPods, availablePods) return -1 as a sentinel when no data is available for that field.
 * @summary List Deployments for Infra Monitoring
 */
export const listDeployments = (
	inframonitoringtypesPostableDeploymentsDTO?: BodyType<InframonitoringtypesPostableDeploymentsDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListDeployments200>({
		url: `/api/v2/infra_monitoring/deployments`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: inframonitoringtypesPostableDeploymentsDTO,
		signal,
	});
};

export const getListDeploymentsMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listDeployments>>,
		TError,
		{ data?: BodyType<InframonitoringtypesPostableDeploymentsDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof listDeployments>>,
	TError,
	{ data?: BodyType<InframonitoringtypesPostableDeploymentsDTO> },
	TContext
> => {
	const mutationKey = ['listDeployments'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof listDeployments>>,
		{ data?: BodyType<InframonitoringtypesPostableDeploymentsDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return listDeployments(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ListDeploymentsMutationResult = NonNullable<
	Awaited<ReturnType<typeof listDeployments>>
>;
export type ListDeploymentsMutationBody =
	| BodyType<InframonitoringtypesPostableDeploymentsDTO>
	| undefined;
export type ListDeploymentsMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List Deployments for Infra Monitoring
 */
export const useListDeployments = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listDeployments>>,
		TError,
		{ data?: BodyType<InframonitoringtypesPostableDeploymentsDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof listDeployments>>,
	TError,
	{ data?: BodyType<InframonitoringtypesPostableDeploymentsDTO> },
	TContext
> => {
	return useMutation(getListDeploymentsMutationOptions(options));
};
/**
 * Returns a paginated list of hosts with key infrastructure metrics: CPU usage (%), memory usage (%), I/O wait (%), disk usage (%), and 15-minute load average. Each host includes its current status (active/inactive based on metrics reported in the last 10 minutes) and metadata attributes (e.g., os.type). Supports filtering via a filter expression, filtering by host status, custom groupBy to aggregate hosts by any attribute, ordering by any of the five metrics, and pagination via offset/limit. The response type is 'list' for the default host.name grouping or 'grouped_list' for custom groupBy keys. Also reports missing required metrics and whether the requested time range falls before the data retention boundary. Numeric metric fields (cpu, memory, wait, load15, diskUsage) return -1 as a sentinel when no data is available for that field.
 * @summary List Hosts for Infra Monitoring
 */
export const listHosts = (
	inframonitoringtypesPostableHostsDTO?: BodyType<InframonitoringtypesPostableHostsDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListHosts200>({
		url: `/api/v2/infra_monitoring/hosts`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: inframonitoringtypesPostableHostsDTO,
		signal,
	});
};

export const getListHostsMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listHosts>>,
		TError,
		{ data?: BodyType<InframonitoringtypesPostableHostsDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof listHosts>>,
	TError,
	{ data?: BodyType<InframonitoringtypesPostableHostsDTO> },
	TContext
> => {
	const mutationKey = ['listHosts'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof listHosts>>,
		{ data?: BodyType<InframonitoringtypesPostableHostsDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return listHosts(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ListHostsMutationResult = NonNullable<
	Awaited<ReturnType<typeof listHosts>>
>;
export type ListHostsMutationBody =
	| BodyType<InframonitoringtypesPostableHostsDTO>
	| undefined;
export type ListHostsMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List Hosts for Infra Monitoring
 */
export const useListHosts = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listHosts>>,
		TError,
		{ data?: BodyType<InframonitoringtypesPostableHostsDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof listHosts>>,
	TError,
	{ data?: BodyType<InframonitoringtypesPostableHostsDTO> },
	TContext
> => {
	return useMutation(getListHostsMutationOptions(options));
};
/**
 * Returns a paginated list of Kubernetes Jobs with key aggregated pod metrics: CPU usage and memory working set summed across pods owned by the job, plus average CPU/memory request and limit utilization (jobCPURequest, jobCPULimit, jobMemoryRequest, jobMemoryLimit). Each row also reports the latest known job-level counters from kube-state-metrics: desiredSuccessfulPods (k8s.job.desired_successful_pods, the target completion count), activePods (k8s.job.active_pods), failedPods (k8s.job.failed_pods, cumulative across the lifetime of the job), and successfulPods (k8s.job.successful_pods, cumulative). It also reports per-group podCountsByPhase ({ pending, running, succeeded, failed, unknown } from each pod's latest k8s.pod.phase value); note podCountsByPhase.failed (current pod-phase) is distinct from failedPods (cumulative job kube-state-metric). Each job includes metadata attributes (k8s.job.name, k8s.namespace.name, k8s.cluster.name). The response type is 'list' for the default k8s.job.name grouping or 'grouped_list' for custom groupBy keys; in both modes every row aggregates pods owned by jobs in the group. Supports filtering via a filter expression, custom groupBy, ordering by cpu / cpu_request / cpu_limit / memory / memory_request / memory_limit / desired_successful_pods / active_pods / failed_pods / successful_pods, and pagination via offset/limit. Also reports missing required metrics and whether the requested time range falls before the data retention boundary. Numeric metric fields (jobCPU, jobCPURequest, jobCPULimit, jobMemory, jobMemoryRequest, jobMemoryLimit, desiredSuccessfulPods, activePods, failedPods, successfulPods) return -1 as a sentinel when no data is available for that field.
 * @summary List Jobs for Infra Monitoring
 */
export const listJobs = (
	inframonitoringtypesPostableJobsDTO?: BodyType<InframonitoringtypesPostableJobsDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListJobs200>({
		url: `/api/v2/infra_monitoring/jobs`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: inframonitoringtypesPostableJobsDTO,
		signal,
	});
};

export const getListJobsMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listJobs>>,
		TError,
		{ data?: BodyType<InframonitoringtypesPostableJobsDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof listJobs>>,
	TError,
	{ data?: BodyType<InframonitoringtypesPostableJobsDTO> },
	TContext
> => {
	const mutationKey = ['listJobs'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof listJobs>>,
		{ data?: BodyType<InframonitoringtypesPostableJobsDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return listJobs(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ListJobsMutationResult = NonNullable<
	Awaited<ReturnType<typeof listJobs>>
>;
export type ListJobsMutationBody =
	| BodyType<InframonitoringtypesPostableJobsDTO>
	| undefined;
export type ListJobsMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List Jobs for Infra Monitoring
 */
export const useListJobs = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listJobs>>,
		TError,
		{ data?: BodyType<InframonitoringtypesPostableJobsDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof listJobs>>,
	TError,
	{ data?: BodyType<InframonitoringtypesPostableJobsDTO> },
	TContext
> => {
	return useMutation(getListJobsMutationOptions(options));
};
/**
 * Returns a paginated list of Kubernetes namespaces with key aggregated pod metrics: CPU usage and memory working set (summed across pods in the group), plus per-group podCountsByPhase ({ pending, running, succeeded, failed, unknown } from each pod's latest k8s.pod.phase value in the window). Each namespace includes metadata attributes (k8s.namespace.name, k8s.cluster.name). The response type is 'list' for the default k8s.namespace.name grouping or 'grouped_list' for custom groupBy keys; in both modes every row aggregates pods in the group. Supports filtering via a filter expression, custom groupBy, ordering by cpu / memory, and pagination via offset/limit. Also reports missing required metrics and whether the requested time range falls before the data retention boundary. Numeric metric fields (namespaceCPU, namespaceMemory) return -1 as a sentinel when no data is available for that field.
 * @summary List Namespaces for Infra Monitoring
 */
export const listNamespaces = (
	inframonitoringtypesPostableNamespacesDTO?: BodyType<InframonitoringtypesPostableNamespacesDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListNamespaces200>({
		url: `/api/v2/infra_monitoring/namespaces`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: inframonitoringtypesPostableNamespacesDTO,
		signal,
	});
};

export const getListNamespacesMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listNamespaces>>,
		TError,
		{ data?: BodyType<InframonitoringtypesPostableNamespacesDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof listNamespaces>>,
	TError,
	{ data?: BodyType<InframonitoringtypesPostableNamespacesDTO> },
	TContext
> => {
	const mutationKey = ['listNamespaces'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof listNamespaces>>,
		{ data?: BodyType<InframonitoringtypesPostableNamespacesDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return listNamespaces(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ListNamespacesMutationResult = NonNullable<
	Awaited<ReturnType<typeof listNamespaces>>
>;
export type ListNamespacesMutationBody =
	| BodyType<InframonitoringtypesPostableNamespacesDTO>
	| undefined;
export type ListNamespacesMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List Namespaces for Infra Monitoring
 */
export const useListNamespaces = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listNamespaces>>,
		TError,
		{ data?: BodyType<InframonitoringtypesPostableNamespacesDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof listNamespaces>>,
	TError,
	{ data?: BodyType<InframonitoringtypesPostableNamespacesDTO> },
	TContext
> => {
	return useMutation(getListNamespacesMutationOptions(options));
};
/**
 * Returns a paginated list of Kubernetes nodes with key metrics: CPU usage, CPU allocatable, memory working set, memory allocatable, per-group nodeCountsByReadiness ({ ready, notReady } from each node's latest k8s.node.condition_ready in the window) and per-group podCountsByPhase ({ pending, running, succeeded, failed, unknown } for pods scheduled on the listed nodes). Each node includes metadata attributes (k8s.node.uid, k8s.cluster.name). The response type is 'list' for the default k8s.node.name grouping (each row is one node with its current condition string: ready / not_ready / no_data) or 'grouped_list' for custom groupBy keys (each row aggregates nodes in the group; condition stays no_data). Supports filtering via a filter expression, custom groupBy, ordering by cpu / cpu_allocatable / memory / memory_allocatable, and pagination via offset/limit. Also reports missing required metrics and whether the requested time range falls before the data retention boundary. Numeric metric fields (nodeCPU, nodeCPUAllocatable, nodeMemory, nodeMemoryAllocatable) return -1 as a sentinel when no data is available for that field.
 * @summary List Nodes for Infra Monitoring
 */
export const listNodes = (
	inframonitoringtypesPostableNodesDTO?: BodyType<InframonitoringtypesPostableNodesDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListNodes200>({
		url: `/api/v2/infra_monitoring/nodes`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: inframonitoringtypesPostableNodesDTO,
		signal,
	});
};

export const getListNodesMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listNodes>>,
		TError,
		{ data?: BodyType<InframonitoringtypesPostableNodesDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof listNodes>>,
	TError,
	{ data?: BodyType<InframonitoringtypesPostableNodesDTO> },
	TContext
> => {
	const mutationKey = ['listNodes'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof listNodes>>,
		{ data?: BodyType<InframonitoringtypesPostableNodesDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return listNodes(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ListNodesMutationResult = NonNullable<
	Awaited<ReturnType<typeof listNodes>>
>;
export type ListNodesMutationBody =
	| BodyType<InframonitoringtypesPostableNodesDTO>
	| undefined;
export type ListNodesMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List Nodes for Infra Monitoring
 */
export const useListNodes = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listNodes>>,
		TError,
		{ data?: BodyType<InframonitoringtypesPostableNodesDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof listNodes>>,
	TError,
	{ data?: BodyType<InframonitoringtypesPostableNodesDTO> },
	TContext
> => {
	return useMutation(getListNodesMutationOptions(options));
};
/**
 * Returns a paginated list of Kubernetes pods with key metrics: CPU usage, CPU request/limit utilization, memory working set, memory request/limit utilization, current pod phase (pending/running/succeeded/failed/unknown/no_data), and pod age (ms since start time). Each pod includes metadata attributes (namespace, node, workload owner such as deployment/statefulset/daemonset/job/cronjob, cluster). Supports filtering via a filter expression, custom groupBy to aggregate pods by any attribute, ordering by any of the six metrics (cpu, cpu_request, cpu_limit, memory, memory_request, memory_limit), and pagination via offset/limit. The response type is 'list' for the default k8s.pod.uid grouping (each row is one pod with its current phase) or 'grouped_list' for custom groupBy keys (each row aggregates pods in the group with per-phase counts under podCountsByPhase: { pending, running, succeeded, failed, unknown } derived from each pod's latest phase in the window). Also reports missing required metrics and whether the requested time range falls before the data retention boundary. Numeric metric fields (podCPU, podCPURequest, podCPULimit, podMemory, podMemoryRequest, podMemoryLimit, podAge) return -1 as a sentinel when no data is available for that field.
 * @summary List Pods for Infra Monitoring
 */
export const listPods = (
	inframonitoringtypesPostablePodsDTO?: BodyType<InframonitoringtypesPostablePodsDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListPods200>({
		url: `/api/v2/infra_monitoring/pods`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: inframonitoringtypesPostablePodsDTO,
		signal,
	});
};

export const getListPodsMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listPods>>,
		TError,
		{ data?: BodyType<InframonitoringtypesPostablePodsDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof listPods>>,
	TError,
	{ data?: BodyType<InframonitoringtypesPostablePodsDTO> },
	TContext
> => {
	const mutationKey = ['listPods'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof listPods>>,
		{ data?: BodyType<InframonitoringtypesPostablePodsDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return listPods(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ListPodsMutationResult = NonNullable<
	Awaited<ReturnType<typeof listPods>>
>;
export type ListPodsMutationBody =
	| BodyType<InframonitoringtypesPostablePodsDTO>
	| undefined;
export type ListPodsMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List Pods for Infra Monitoring
 */
export const useListPods = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listPods>>,
		TError,
		{ data?: BodyType<InframonitoringtypesPostablePodsDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof listPods>>,
	TError,
	{ data?: BodyType<InframonitoringtypesPostablePodsDTO> },
	TContext
> => {
	return useMutation(getListPodsMutationOptions(options));
};
/**
 * Returns a paginated list of Kubernetes persistent volume claims (PVCs) with key volume metrics: available bytes, capacity bytes, usage (capacity - available), inodes, free inodes, and used inodes. Each row also includes metadata attributes (k8s.persistentvolumeclaim.name, k8s.pod.uid, k8s.pod.name, k8s.namespace.name, k8s.node.name, k8s.statefulset.name, k8s.cluster.name). Supports filtering via a filter expression, custom groupBy to aggregate volumes by any attribute, ordering by any of the six metrics (available, capacity, usage, inodes, inodes_free, inodes_used), and pagination via offset/limit. The response type is 'list' for the default k8s.persistentvolumeclaim.name grouping or 'grouped_list' for custom groupBy keys; in both modes every row aggregates volumes in the group. Also reports missing required metrics and whether the requested time range falls before the data retention boundary. Numeric metric fields (volumeAvailable, volumeCapacity, volumeUsage, volumeInodes, volumeInodesFree, volumeInodesUsed) return -1 as a sentinel when no data is available for that field.
 * @summary List Volumes for Infra Monitoring
 */
export const listVolumes = (
	inframonitoringtypesPostableVolumesDTO?: BodyType<InframonitoringtypesPostableVolumesDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListVolumes200>({
		url: `/api/v2/infra_monitoring/pvcs`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: inframonitoringtypesPostableVolumesDTO,
		signal,
	});
};

export const getListVolumesMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listVolumes>>,
		TError,
		{ data?: BodyType<InframonitoringtypesPostableVolumesDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof listVolumes>>,
	TError,
	{ data?: BodyType<InframonitoringtypesPostableVolumesDTO> },
	TContext
> => {
	const mutationKey = ['listVolumes'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof listVolumes>>,
		{ data?: BodyType<InframonitoringtypesPostableVolumesDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return listVolumes(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ListVolumesMutationResult = NonNullable<
	Awaited<ReturnType<typeof listVolumes>>
>;
export type ListVolumesMutationBody =
	| BodyType<InframonitoringtypesPostableVolumesDTO>
	| undefined;
export type ListVolumesMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List Volumes for Infra Monitoring
 */
export const useListVolumes = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listVolumes>>,
		TError,
		{ data?: BodyType<InframonitoringtypesPostableVolumesDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof listVolumes>>,
	TError,
	{ data?: BodyType<InframonitoringtypesPostableVolumesDTO> },
	TContext
> => {
	return useMutation(getListVolumesMutationOptions(options));
};
/**
 * Returns a paginated list of Kubernetes StatefulSets with key aggregated pod metrics: CPU usage and memory working set summed across pods owned by the statefulset, plus average CPU/memory request and limit utilization (statefulSetCPURequest, statefulSetCPULimit, statefulSetMemoryRequest, statefulSetMemoryLimit). Each row also reports the latest known desiredPods (k8s.statefulset.desired_pods) and currentPods (k8s.statefulset.current_pods) replica counts and per-group podCountsByPhase ({ pending, running, succeeded, failed, unknown } from each pod's latest k8s.pod.phase value). Each statefulset includes metadata attributes (k8s.statefulset.name, k8s.namespace.name, k8s.cluster.name). The response type is 'list' for the default k8s.statefulset.name grouping or 'grouped_list' for custom groupBy keys; in both modes every row aggregates pods owned by statefulsets in the group. Supports filtering via a filter expression, custom groupBy, ordering by cpu / cpu_request / cpu_limit / memory / memory_request / memory_limit / desired_pods / current_pods, and pagination via offset/limit. Also reports missing required metrics and whether the requested time range falls before the data retention boundary. Numeric metric fields (statefulSetCPU, statefulSetCPURequest, statefulSetCPULimit, statefulSetMemory, statefulSetMemoryRequest, statefulSetMemoryLimit, desiredPods, currentPods) return -1 as a sentinel when no data is available for that field.
 * @summary List StatefulSets for Infra Monitoring
 */
export const listStatefulSets = (
	inframonitoringtypesPostableStatefulSetsDTO?: BodyType<InframonitoringtypesPostableStatefulSetsDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListStatefulSets200>({
		url: `/api/v2/infra_monitoring/statefulsets`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: inframonitoringtypesPostableStatefulSetsDTO,
		signal,
	});
};

export const getListStatefulSetsMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listStatefulSets>>,
		TError,
		{ data?: BodyType<InframonitoringtypesPostableStatefulSetsDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof listStatefulSets>>,
	TError,
	{ data?: BodyType<InframonitoringtypesPostableStatefulSetsDTO> },
	TContext
> => {
	const mutationKey = ['listStatefulSets'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof listStatefulSets>>,
		{ data?: BodyType<InframonitoringtypesPostableStatefulSetsDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return listStatefulSets(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ListStatefulSetsMutationResult = NonNullable<
	Awaited<ReturnType<typeof listStatefulSets>>
>;
export type ListStatefulSetsMutationBody =
	| BodyType<InframonitoringtypesPostableStatefulSetsDTO>
	| undefined;
export type ListStatefulSetsMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List StatefulSets for Infra Monitoring
 */
export const useListStatefulSets = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listStatefulSets>>,
		TError,
		{ data?: BodyType<InframonitoringtypesPostableStatefulSetsDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof listStatefulSets>>,
	TError,
	{ data?: BodyType<InframonitoringtypesPostableStatefulSetsDTO> },
	TContext
> => {
	return useMutation(getListStatefulSetsMutationOptions(options));
};
