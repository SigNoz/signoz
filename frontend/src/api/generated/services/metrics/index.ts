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
	GetMetricAlertsParams,
	GetMetricAttributes200,
	GetMetricDashboards200,
	GetMetricDashboardsParams,
	GetMetricHighlights200,
	GetMetricHighlightsParams,
	GetMetricMetadata200,
	GetMetricMetadataParams,
	GetMetricsStats200,
	GetMetricsTreemap200,
	MetricsexplorertypesMetricAttributesRequestDTO,
	MetricsexplorertypesStatsRequestDTO,
	MetricsexplorertypesTreemapRequestDTO,
	MetricsexplorertypesUpdateMetricMetadataRequestDTO,
	RenderErrorResponseDTO,
	UpdateMetricMetadataPathParameters,
} from '../sigNoz.schemas';

type AwaitedInput<T> = PromiseLike<T> | T;

type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

/**
 * This endpoint returns associated alerts for a specified metric
 * @summary Get metric alerts
 */
export const getMetricAlerts = (
	params?: GetMetricAlertsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetMetricAlerts200>({
		url: `/api/v2/metric/alerts`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetMetricAlertsQueryKey = (params?: GetMetricAlertsParams) => {
	return ['getMetricAlerts', ...(params ? [params] : [])] as const;
};

export const getGetMetricAlertsQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricAlerts>>,
	TError = RenderErrorResponseDTO
>(
	params?: GetMetricAlertsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricAlerts>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetMetricAlertsQueryKey(params);

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getMetricAlerts>>> = ({
		signal,
	}) => getMetricAlerts(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
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
	params?: GetMetricAlertsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricAlerts>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMetricAlertsQueryOptions(params, options);

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
	params?: GetMetricAlertsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricAlertsQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint returns associated dashboards for a specified metric
 * @summary Get metric dashboards
 */
export const getMetricDashboards = (
	params?: GetMetricDashboardsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetMetricDashboards200>({
		url: `/api/v2/metric/dashboards`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetMetricDashboardsQueryKey = (
	params?: GetMetricDashboardsParams,
) => {
	return ['getMetricDashboards', ...(params ? [params] : [])] as const;
};

export const getGetMetricDashboardsQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricDashboards>>,
	TError = RenderErrorResponseDTO
>(
	params?: GetMetricDashboardsParams,
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
		queryOptions?.queryKey ?? getGetMetricDashboardsQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getMetricDashboards>>
	> = ({ signal }) => getMetricDashboards(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
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
	params?: GetMetricDashboardsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricDashboards>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMetricDashboardsQueryOptions(params, options);

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
	params?: GetMetricDashboardsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricDashboardsQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint returns highlights like number of datapoints, totaltimeseries, active time series, last received time for a specified metric
 * @summary Get metric highlights
 */
export const getMetricHighlights = (
	params?: GetMetricHighlightsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetMetricHighlights200>({
		url: `/api/v2/metric/highlights`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetMetricHighlightsQueryKey = (
	params?: GetMetricHighlightsParams,
) => {
	return ['getMetricHighlights', ...(params ? [params] : [])] as const;
};

export const getGetMetricHighlightsQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricHighlights>>,
	TError = RenderErrorResponseDTO
>(
	params?: GetMetricHighlightsParams,
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
		queryOptions?.queryKey ?? getGetMetricHighlightsQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getMetricHighlights>>
	> = ({ signal }) => getMetricHighlights(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
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
	params?: GetMetricHighlightsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricHighlights>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMetricHighlightsQueryOptions(params, options);

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
	params?: GetMetricHighlightsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricHighlightsQueryKey(params) },
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
 * This endpoint returns attribute keys and their unique values for a specified metric
 * @summary Get metric attributes
 */
export const getMetricAttributes = (
	metricsexplorertypesMetricAttributesRequestDTO: MetricsexplorertypesMetricAttributesRequestDTO,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetMetricAttributes200>({
		url: `/api/v2/metrics/attributes`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: metricsexplorertypesMetricAttributesRequestDTO,
		signal,
	});
};

export const getGetMetricAttributesMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getMetricAttributes>>,
		TError,
		{ data: MetricsexplorertypesMetricAttributesRequestDTO },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof getMetricAttributes>>,
	TError,
	{ data: MetricsexplorertypesMetricAttributesRequestDTO },
	TContext
> => {
	const mutationKey = ['getMetricAttributes'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof getMetricAttributes>>,
		{ data: MetricsexplorertypesMetricAttributesRequestDTO }
	> = (props) => {
		const { data } = props ?? {};

		return getMetricAttributes(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type GetMetricAttributesMutationResult = NonNullable<
	Awaited<ReturnType<typeof getMetricAttributes>>
>;
export type GetMetricAttributesMutationBody = MetricsexplorertypesMetricAttributesRequestDTO;
export type GetMetricAttributesMutationError = RenderErrorResponseDTO;

/**
 * @summary Get metric attributes
 */
export const useGetMetricAttributes = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getMetricAttributes>>,
		TError,
		{ data: MetricsexplorertypesMetricAttributesRequestDTO },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof getMetricAttributes>>,
	TError,
	{ data: MetricsexplorertypesMetricAttributesRequestDTO },
	TContext
> => {
	const mutationOptions = getGetMetricAttributesMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint returns metadata information like metric description, unit, type, temporality, monotonicity for a specified metric
 * @summary Get metric metadata
 */
export const getMetricMetadata = (
	params?: GetMetricMetadataParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetMetricMetadata200>({
		url: `/api/v2/metrics/metadata`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetMetricMetadataQueryKey = (
	params?: GetMetricMetadataParams,
) => {
	return ['getMetricMetadata', ...(params ? [params] : [])] as const;
};

export const getGetMetricMetadataQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricMetadata>>,
	TError = RenderErrorResponseDTO
>(
	params?: GetMetricMetadataParams,
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
		queryOptions?.queryKey ?? getGetMetricMetadataQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getMetricMetadata>>
	> = ({ signal }) => getMetricMetadata(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
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
	params?: GetMetricMetadataParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricMetadata>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMetricMetadataQueryOptions(params, options);

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
	params?: GetMetricMetadataParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricMetadataQueryKey(params) },
		options,
	);

	return queryClient;
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
