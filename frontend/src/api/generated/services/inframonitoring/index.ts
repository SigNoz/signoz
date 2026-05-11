/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'yarn generate:api'
 * SigNoz
 */
import { useMutation } from 'react-query';
import type {
	MutationFunction,
	UseMutationOptions,
	UseMutationResult,
} from 'react-query';

import type {
	InframonitoringtypesPostableHostsDTO,
	InframonitoringtypesPostableNamespacesDTO,
	InframonitoringtypesPostableNodesDTO,
	InframonitoringtypesPostablePodsDTO,
	ListHosts200,
	ListNamespaces200,
	ListNodes200,
	ListPods200,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * Returns a paginated list of hosts with key infrastructure metrics: CPU usage (%), memory usage (%), I/O wait (%), disk usage (%), and 15-minute load average. Each host includes its current status (active/inactive based on metrics reported in the last 10 minutes) and metadata attributes (e.g., os.type). Supports filtering via a filter expression, filtering by host status, custom groupBy to aggregate hosts by any attribute, ordering by any of the five metrics, and pagination via offset/limit. The response type is 'list' for the default host.name grouping or 'grouped_list' for custom groupBy keys. Also reports missing required metrics and whether the requested time range falls before the data retention boundary. Numeric metric fields (cpu, memory, wait, load15, diskUsage) return -1 as a sentinel when no data is available for that field.
 * @summary List Hosts for Infra Monitoring
 */
export const listHosts = (
	inframonitoringtypesPostableHostsDTO: BodyType<InframonitoringtypesPostableHostsDTO>,
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
		{ data: BodyType<InframonitoringtypesPostableHostsDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof listHosts>>,
	TError,
	{ data: BodyType<InframonitoringtypesPostableHostsDTO> },
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
		{ data: BodyType<InframonitoringtypesPostableHostsDTO> }
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
	BodyType<InframonitoringtypesPostableHostsDTO>;
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
		{ data: BodyType<InframonitoringtypesPostableHostsDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof listHosts>>,
	TError,
	{ data: BodyType<InframonitoringtypesPostableHostsDTO> },
	TContext
> => {
	const mutationOptions = getListHostsMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Returns a paginated list of Kubernetes namespaces with key aggregated pod metrics: CPU usage and memory working set (summed across pods in the group), plus per-group podCountsByPhase ({ pending, running, succeeded, failed, unknown } from each pod's latest k8s.pod.phase value in the window). Each namespace includes metadata attributes (k8s.namespace.name, k8s.cluster.name). The response type is 'list' for the default k8s.namespace.name grouping or 'grouped_list' for custom groupBy keys; in both modes every row aggregates pods in the group. Supports filtering via a filter expression, custom groupBy, ordering by cpu / memory, and pagination via offset/limit. Also reports missing required metrics and whether the requested time range falls before the data retention boundary. Numeric metric fields (namespaceCPU, namespaceMemory) return -1 as a sentinel when no data is available for that field.
 * @summary List Namespaces for Infra Monitoring
 */
export const listNamespaces = (
	inframonitoringtypesPostableNamespacesDTO: BodyType<InframonitoringtypesPostableNamespacesDTO>,
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
		{ data: BodyType<InframonitoringtypesPostableNamespacesDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof listNamespaces>>,
	TError,
	{ data: BodyType<InframonitoringtypesPostableNamespacesDTO> },
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
		{ data: BodyType<InframonitoringtypesPostableNamespacesDTO> }
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
	BodyType<InframonitoringtypesPostableNamespacesDTO>;
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
		{ data: BodyType<InframonitoringtypesPostableNamespacesDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof listNamespaces>>,
	TError,
	{ data: BodyType<InframonitoringtypesPostableNamespacesDTO> },
	TContext
> => {
	const mutationOptions = getListNamespacesMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Returns a paginated list of Kubernetes nodes with key metrics: CPU usage, CPU allocatable, memory working set, memory allocatable, per-group nodeCountsByReadiness ({ ready, notReady } from each node's latest k8s.node.condition_ready in the window) and per-group podCountsByPhase ({ pending, running, succeeded, failed, unknown } for pods scheduled on the listed nodes). Each node includes metadata attributes (k8s.node.uid, k8s.cluster.name). The response type is 'list' for the default k8s.node.name grouping (each row is one node with its current condition string: ready / not_ready / no_data) or 'grouped_list' for custom groupBy keys (each row aggregates nodes in the group; condition stays no_data). Supports filtering via a filter expression, custom groupBy, ordering by cpu / cpu_allocatable / memory / memory_allocatable, and pagination via offset/limit. Also reports missing required metrics and whether the requested time range falls before the data retention boundary. Numeric metric fields (nodeCPU, nodeCPUAllocatable, nodeMemory, nodeMemoryAllocatable) return -1 as a sentinel when no data is available for that field.
 * @summary List Nodes for Infra Monitoring
 */
export const listNodes = (
	inframonitoringtypesPostableNodesDTO: BodyType<InframonitoringtypesPostableNodesDTO>,
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
		{ data: BodyType<InframonitoringtypesPostableNodesDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof listNodes>>,
	TError,
	{ data: BodyType<InframonitoringtypesPostableNodesDTO> },
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
		{ data: BodyType<InframonitoringtypesPostableNodesDTO> }
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
	BodyType<InframonitoringtypesPostableNodesDTO>;
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
		{ data: BodyType<InframonitoringtypesPostableNodesDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof listNodes>>,
	TError,
	{ data: BodyType<InframonitoringtypesPostableNodesDTO> },
	TContext
> => {
	const mutationOptions = getListNodesMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Returns a paginated list of Kubernetes pods with key metrics: CPU usage, CPU request/limit utilization, memory working set, memory request/limit utilization, current pod phase (pending/running/succeeded/failed/unknown/no_data), and pod age (ms since start time). Each pod includes metadata attributes (namespace, node, workload owner such as deployment/statefulset/daemonset/job/cronjob, cluster). Supports filtering via a filter expression, custom groupBy to aggregate pods by any attribute, ordering by any of the six metrics (cpu, cpu_request, cpu_limit, memory, memory_request, memory_limit), and pagination via offset/limit. The response type is 'list' for the default k8s.pod.uid grouping (each row is one pod with its current phase) or 'grouped_list' for custom groupBy keys (each row aggregates pods in the group with per-phase counts under podCountsByPhase: { pending, running, succeeded, failed, unknown } derived from each pod's latest phase in the window). Also reports missing required metrics and whether the requested time range falls before the data retention boundary. Numeric metric fields (podCPU, podCPURequest, podCPULimit, podMemory, podMemoryRequest, podMemoryLimit, podAge) return -1 as a sentinel when no data is available for that field.
 * @summary List Pods for Infra Monitoring
 */
export const listPods = (
	inframonitoringtypesPostablePodsDTO: BodyType<InframonitoringtypesPostablePodsDTO>,
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
		{ data: BodyType<InframonitoringtypesPostablePodsDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof listPods>>,
	TError,
	{ data: BodyType<InframonitoringtypesPostablePodsDTO> },
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
		{ data: BodyType<InframonitoringtypesPostablePodsDTO> }
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
	BodyType<InframonitoringtypesPostablePodsDTO>;
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
		{ data: BodyType<InframonitoringtypesPostablePodsDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof listPods>>,
	TError,
	{ data: BodyType<InframonitoringtypesPostablePodsDTO> },
	TContext
> => {
	const mutationOptions = getListPodsMutationOptions(options);

	return useMutation(mutationOptions);
};
