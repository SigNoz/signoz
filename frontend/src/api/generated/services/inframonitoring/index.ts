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
	InframonitoringtypesPostablePodsDTO,
	ListHosts200,
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
 * Returns a paginated list of Kubernetes pods with key metrics: CPU usage, CPU request/limit utilization, memory working set, memory request/limit utilization, current pod phase (pending/running/succeeded/failed/unknown), and pod age (ms since start time). Each pod includes metadata attributes (namespace, node, workload owner such as deployment/statefulset/daemonset/job/cronjob, cluster). Supports filtering via a filter expression, custom groupBy to aggregate pods by any attribute, ordering by any of the six metrics (cpu, cpu_request, cpu_limit, memory, memory_request, memory_limit), and pagination via offset/limit. The response type is 'list' for the default k8s.pod.uid grouping (each row is one pod with its current phase) or 'grouped_list' for custom groupBy keys (each row aggregates pods in the group with per-phase counts: pendingPodCount, runningPodCount, succeededPodCount, failedPodCount, unknownPodCount derived from each pod's latest phase in the window). Also reports missing required metrics and whether the requested time range falls before the data retention boundary. Numeric metric fields (podCPU, podCPURequest, podCPULimit, podMemory, podMemoryRequest, podMemoryLimit, podAge) return -1 as a sentinel when no data is available for that field.
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
