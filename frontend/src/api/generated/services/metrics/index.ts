/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'yarn generate:api'
 * SigNoz
 */
import type {
	InvalidateOptions,
	MutationFunction,
	QueryClient,
	QueryFunction,
	QueryKey,
	UseMutationOptions,
	UseMutationResult,
	UseQueryOptions,
	UseQueryResult,
} from 'react-query';
import { useMutation, useQuery } from 'react-query';

import { GeneratedAPIInstance } from '../../../index';
import type {
	GetMetricAlerts200,
	GetMetricAlertsPathParameters,
	GetMetricAttributes200,
	GetMetricAttributesParams,
	GetMetricAttributesPathParameters,
	GetMetricDashboards200,
	GetMetricDashboardsPathParameters,
	GetMetricHighlights200,
	GetMetricHighlightsPathParameters,
	GetMetricMetadata200,
	GetMetricMetadataPathParameters,
	GetMetricsStats200,
	GetMetricsTreemap200,
	ListMetrics200,
	ListMetricsParams,
	MetricsexplorertypesStatsRequestDTO,
	MetricsexplorertypesTreemapRequestDTO,
	MetricsexplorertypesUpdateMetricMetadataRequestDTO,
	RenderErrorResponseDTO,
	UpdateMetricMetadataPathParameters,
} from '../sigNoz.schemas';

type AwaitedInput<T> = PromiseLike<T> | T;

type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

/**
 * This endpoint returns a list of distinct metric names within the specified time range
 * @summary List metric names
 */
export const listMetrics = (
	params?: ListMetricsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListMetrics200>({
		url: `/api/v2/metrics`,
		method: 'GET',
		params,
		signal,
	});
};

export const getListMetricsQueryKey = (params?: ListMetricsParams) => {
	return ['listMetrics', ...(params ? [params] : [])] as const;
};

export const getListMetricsQueryOptions = <
	TData = Awaited<ReturnType<typeof listMetrics>>,
	TError = RenderErrorResponseDTO
>(
	params?: ListMetricsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listMetrics>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListMetricsQueryKey(params);

	const queryFn: QueryFunction<Awaited<ReturnType<typeof listMetrics>>> = ({
		signal,
	}) => listMetrics(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listMetrics>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListMetricsQueryResult = NonNullable<
	Awaited<ReturnType<typeof listMetrics>>
>;
export type ListMetricsQueryError = RenderErrorResponseDTO;

/**
 * @summary List metric names
 */

export function useListMetrics<
	TData = Awaited<ReturnType<typeof listMetrics>>,
	TError = RenderErrorResponseDTO
>(
	params?: ListMetricsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listMetrics>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListMetricsQueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List metric names
 */
export const invalidateListMetrics = async (
	queryClient: QueryClient,
	params?: ListMetricsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListMetricsQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint returns associated alerts for a specified metric
 * @summary Get metric alerts
 */
export const getMetricAlerts = (
	{ metricName }: GetMetricAlertsPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetMetricAlerts200>({
		url: `/api/v2/metrics/${metricName}/alerts`,
		method: 'GET',
		signal,
	});
};

export const getGetMetricAlertsQueryKey = ({
	metricName,
}: GetMetricAlertsPathParameters) => {
	return ['getMetricAlerts'] as const;
};

export const getGetMetricAlertsQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricAlerts>>,
	TError = RenderErrorResponseDTO
>(
	{ metricName }: GetMetricAlertsPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricAlerts>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetMetricAlertsQueryKey({ metricName });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getMetricAlerts>>> = ({
		signal,
	}) => getMetricAlerts({ metricName }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!metricName,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getMetricAlerts>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetMetricAlertsQueryResult = NonNullable<
	Awaited<ReturnType<typeof getMetricAlerts>>
>;
export type GetMetricAlertsQueryError = RenderErrorResponseDTO;

/**
 * @summary Get metric alerts
 */

export function useGetMetricAlerts<
	TData = Awaited<ReturnType<typeof getMetricAlerts>>,
	TError = RenderErrorResponseDTO
>(
	{ metricName }: GetMetricAlertsPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricAlerts>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMetricAlertsQueryOptions({ metricName }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get metric alerts
 */
export const invalidateGetMetricAlerts = async (
	queryClient: QueryClient,
	{ metricName }: GetMetricAlertsPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricAlertsQueryKey({ metricName }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint returns attribute keys and their unique values for a specified metric
 * @summary Get metric attributes
 */
export const getMetricAttributes = (
	{ metricName }: GetMetricAttributesPathParameters,
	params?: GetMetricAttributesParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetMetricAttributes200>({
		url: `/api/v2/metrics/${metricName}/attributes`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetMetricAttributesQueryKey = (
	{ metricName }: GetMetricAttributesPathParameters,
	params?: GetMetricAttributesParams,
) => {
	return ['getMetricAttributes', ...(params ? [params] : [])] as const;
};

export const getGetMetricAttributesQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricAttributes>>,
	TError = RenderErrorResponseDTO
>(
	{ metricName }: GetMetricAttributesPathParameters,
	params?: GetMetricAttributesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricAttributes>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getGetMetricAttributesQueryKey({ metricName }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getMetricAttributes>>
	> = ({ signal }) => getMetricAttributes({ metricName }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!metricName,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getMetricAttributes>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetMetricAttributesQueryResult = NonNullable<
	Awaited<ReturnType<typeof getMetricAttributes>>
>;
export type GetMetricAttributesQueryError = RenderErrorResponseDTO;

/**
 * @summary Get metric attributes
 */

export function useGetMetricAttributes<
	TData = Awaited<ReturnType<typeof getMetricAttributes>>,
	TError = RenderErrorResponseDTO
>(
	{ metricName }: GetMetricAttributesPathParameters,
	params?: GetMetricAttributesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricAttributes>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMetricAttributesQueryOptions(
		{ metricName },
		params,
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get metric attributes
 */
export const invalidateGetMetricAttributes = async (
	queryClient: QueryClient,
	{ metricName }: GetMetricAttributesPathParameters,
	params?: GetMetricAttributesParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricAttributesQueryKey({ metricName }, params) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint returns associated dashboards for a specified metric
 * @summary Get metric dashboards
 */
export const getMetricDashboards = (
	{ metricName }: GetMetricDashboardsPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetMetricDashboards200>({
		url: `/api/v2/metrics/${metricName}/dashboards`,
		method: 'GET',
		signal,
	});
};

export const getGetMetricDashboardsQueryKey = ({
	metricName,
}: GetMetricDashboardsPathParameters) => {
	return ['getMetricDashboards'] as const;
};

export const getGetMetricDashboardsQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricDashboards>>,
	TError = RenderErrorResponseDTO
>(
	{ metricName }: GetMetricDashboardsPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricDashboards>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetMetricDashboardsQueryKey({ metricName });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getMetricDashboards>>
	> = ({ signal }) => getMetricDashboards({ metricName }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!metricName,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getMetricDashboards>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetMetricDashboardsQueryResult = NonNullable<
	Awaited<ReturnType<typeof getMetricDashboards>>
>;
export type GetMetricDashboardsQueryError = RenderErrorResponseDTO;

/**
 * @summary Get metric dashboards
 */

export function useGetMetricDashboards<
	TData = Awaited<ReturnType<typeof getMetricDashboards>>,
	TError = RenderErrorResponseDTO
>(
	{ metricName }: GetMetricDashboardsPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricDashboards>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMetricDashboardsQueryOptions(
		{ metricName },
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get metric dashboards
 */
export const invalidateGetMetricDashboards = async (
	queryClient: QueryClient,
	{ metricName }: GetMetricDashboardsPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricDashboardsQueryKey({ metricName }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint returns highlights like number of datapoints, totaltimeseries, active time series, last received time for a specified metric
 * @summary Get metric highlights
 */
export const getMetricHighlights = (
	{ metricName }: GetMetricHighlightsPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetMetricHighlights200>({
		url: `/api/v2/metrics/${metricName}/highlights`,
		method: 'GET',
		signal,
	});
};

export const getGetMetricHighlightsQueryKey = ({
	metricName,
}: GetMetricHighlightsPathParameters) => {
	return ['getMetricHighlights'] as const;
};

export const getGetMetricHighlightsQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricHighlights>>,
	TError = RenderErrorResponseDTO
>(
	{ metricName }: GetMetricHighlightsPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricHighlights>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetMetricHighlightsQueryKey({ metricName });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getMetricHighlights>>
	> = ({ signal }) => getMetricHighlights({ metricName }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!metricName,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getMetricHighlights>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetMetricHighlightsQueryResult = NonNullable<
	Awaited<ReturnType<typeof getMetricHighlights>>
>;
export type GetMetricHighlightsQueryError = RenderErrorResponseDTO;

/**
 * @summary Get metric highlights
 */

export function useGetMetricHighlights<
	TData = Awaited<ReturnType<typeof getMetricHighlights>>,
	TError = RenderErrorResponseDTO
>(
	{ metricName }: GetMetricHighlightsPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricHighlights>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMetricHighlightsQueryOptions(
		{ metricName },
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get metric highlights
 */
export const invalidateGetMetricHighlights = async (
	queryClient: QueryClient,
	{ metricName }: GetMetricHighlightsPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricHighlightsQueryKey({ metricName }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint returns metadata information like metric description, unit, type, temporality, monotonicity for a specified metric
 * @summary Get metric metadata
 */
export const getMetricMetadata = (
	{ metricName }: GetMetricMetadataPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetMetricMetadata200>({
		url: `/api/v2/metrics/${metricName}/metadata`,
		method: 'GET',
		signal,
	});
};

export const getGetMetricMetadataQueryKey = ({
	metricName,
}: GetMetricMetadataPathParameters) => {
	return ['getMetricMetadata'] as const;
};

export const getGetMetricMetadataQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricMetadata>>,
	TError = RenderErrorResponseDTO
>(
	{ metricName }: GetMetricMetadataPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricMetadata>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetMetricMetadataQueryKey({ metricName });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getMetricMetadata>>
	> = ({ signal }) => getMetricMetadata({ metricName }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!metricName,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getMetricMetadata>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetMetricMetadataQueryResult = NonNullable<
	Awaited<ReturnType<typeof getMetricMetadata>>
>;
export type GetMetricMetadataQueryError = RenderErrorResponseDTO;

/**
 * @summary Get metric metadata
 */

export function useGetMetricMetadata<
	TData = Awaited<ReturnType<typeof getMetricMetadata>>,
	TError = RenderErrorResponseDTO
>(
	{ metricName }: GetMetricMetadataPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricMetadata>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMetricMetadataQueryOptions({ metricName }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get metric metadata
 */
export const invalidateGetMetricMetadata = async (
	queryClient: QueryClient,
	{ metricName }: GetMetricMetadataPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricMetadataQueryKey({ metricName }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint helps to update metadata information like metric description, unit, type, temporality, monotonicity for a specified metric
 * @summary Update metric metadata
 */
export const updateMetricMetadata = (
	{ metricName }: UpdateMetricMetadataPathParameters,
	metricsexplorertypesUpdateMetricMetadataRequestDTO: MetricsexplorertypesUpdateMetricMetadataRequestDTO,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<string>({
		url: `/api/v2/metrics/${metricName}/metadata`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: metricsexplorertypesUpdateMetricMetadataRequestDTO,
		signal,
	});
};

export const getUpdateMetricMetadataMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMetricMetadata>>,
		TError,
		{
			pathParams: UpdateMetricMetadataPathParameters;
			data: MetricsexplorertypesUpdateMetricMetadataRequestDTO;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateMetricMetadata>>,
	TError,
	{
		pathParams: UpdateMetricMetadataPathParameters;
		data: MetricsexplorertypesUpdateMetricMetadataRequestDTO;
	},
	TContext
> => {
	const mutationKey = ['updateMetricMetadata'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateMetricMetadata>>,
		{
			pathParams: UpdateMetricMetadataPathParameters;
			data: MetricsexplorertypesUpdateMetricMetadataRequestDTO;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateMetricMetadata(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateMetricMetadataMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateMetricMetadata>>
>;
export type UpdateMetricMetadataMutationBody = MetricsexplorertypesUpdateMetricMetadataRequestDTO;
export type UpdateMetricMetadataMutationError = RenderErrorResponseDTO;

/**
 * @summary Update metric metadata
 */
export const useUpdateMetricMetadata = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMetricMetadata>>,
		TError,
		{
			pathParams: UpdateMetricMetadataPathParameters;
			data: MetricsexplorertypesUpdateMetricMetadataRequestDTO;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateMetricMetadata>>,
	TError,
	{
		pathParams: UpdateMetricMetadataPathParameters;
		data: MetricsexplorertypesUpdateMetricMetadataRequestDTO;
	},
	TContext
> => {
	const mutationOptions = getUpdateMetricMetadataMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint provides list of metrics with their number of samples and timeseries for the given time range
 * @summary Get metrics statistics
 */
export const getMetricsStats = (
	metricsexplorertypesStatsRequestDTO: MetricsexplorertypesStatsRequestDTO,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetMetricsStats200>({
		url: `/api/v2/metrics/stats`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: metricsexplorertypesStatsRequestDTO,
		signal,
	});
};

export const getGetMetricsStatsMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getMetricsStats>>,
		TError,
		{ data: MetricsexplorertypesStatsRequestDTO },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof getMetricsStats>>,
	TError,
	{ data: MetricsexplorertypesStatsRequestDTO },
	TContext
> => {
	const mutationKey = ['getMetricsStats'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof getMetricsStats>>,
		{ data: MetricsexplorertypesStatsRequestDTO }
	> = (props) => {
		const { data } = props ?? {};

		return getMetricsStats(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type GetMetricsStatsMutationResult = NonNullable<
	Awaited<ReturnType<typeof getMetricsStats>>
>;
export type GetMetricsStatsMutationBody = MetricsexplorertypesStatsRequestDTO;
export type GetMetricsStatsMutationError = RenderErrorResponseDTO;

/**
 * @summary Get metrics statistics
 */
export const useGetMetricsStats = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getMetricsStats>>,
		TError,
		{ data: MetricsexplorertypesStatsRequestDTO },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof getMetricsStats>>,
	TError,
	{ data: MetricsexplorertypesStatsRequestDTO },
	TContext
> => {
	const mutationOptions = getGetMetricsStatsMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint returns a treemap visualization showing the proportional distribution of metrics by sample count or time series count
 * @summary Get metrics treemap
 */
export const getMetricsTreemap = (
	metricsexplorertypesTreemapRequestDTO: MetricsexplorertypesTreemapRequestDTO,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetMetricsTreemap200>({
		url: `/api/v2/metrics/treemap`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: metricsexplorertypesTreemapRequestDTO,
		signal,
	});
};

export const getGetMetricsTreemapMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getMetricsTreemap>>,
		TError,
		{ data: MetricsexplorertypesTreemapRequestDTO },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof getMetricsTreemap>>,
	TError,
	{ data: MetricsexplorertypesTreemapRequestDTO },
	TContext
> => {
	const mutationKey = ['getMetricsTreemap'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof getMetricsTreemap>>,
		{ data: MetricsexplorertypesTreemapRequestDTO }
	> = (props) => {
		const { data } = props ?? {};

		return getMetricsTreemap(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type GetMetricsTreemapMutationResult = NonNullable<
	Awaited<ReturnType<typeof getMetricsTreemap>>
>;
export type GetMetricsTreemapMutationBody = MetricsexplorertypesTreemapRequestDTO;
export type GetMetricsTreemapMutationError = RenderErrorResponseDTO;

/**
 * @summary Get metrics treemap
 */
export const useGetMetricsTreemap = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getMetricsTreemap>>,
		TError,
		{ data: MetricsexplorertypesTreemapRequestDTO },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof getMetricsTreemap>>,
	TError,
	{ data: MetricsexplorertypesTreemapRequestDTO },
	TContext
> => {
	const mutationOptions = getGetMetricsTreemapMutationOptions(options);

	return useMutation(mutationOptions);
};
