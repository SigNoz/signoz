/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import { useMutation, useQuery } from 'react-query';
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

import type {
	CreateMetricReductionRule201,
	DeleteMetricReductionRuleByIDPathParameters,
	DeleteMetricReductionRulePathParameters,
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
	GetMetricReductionRule200,
	GetMetricReductionRuleByID200,
	GetMetricReductionRuleByIDPathParameters,
	GetMetricReductionRulePathParameters,
	GetMetricReductionRuleStats200,
	GetMetricReductionRuleTimeseries200,
	GetMetricsOnboardingStatus200,
	GetMetricsStats200,
	GetMetricsTreemap200,
	InspectMetrics200,
	ListMetricReductionRules200,
	ListMetricReductionRulesParams,
	ListMetrics200,
	ListMetricsParams,
	MetricreductionruletypesPostableReductionRuleDTO,
	MetricreductionruletypesPostableReductionRulePreviewDTO,
	MetricsexplorertypesInspectMetricsRequestDTO,
	MetricsexplorertypesStatsRequestDTO,
	MetricsexplorertypesTreemapRequestDTO,
	MetricsexplorertypesUpdateMetricMetadataRequestDTO,
	PreviewMetricReductionRule200,
	RenderErrorResponseDTO,
	UpdateMetricMetadataPathParameters,
	UpdateMetricReductionRuleByID200,
	UpdateMetricReductionRuleByIDPathParameters,
	UpsertMetricReductionRule200,
	UpsertMetricReductionRulePathParameters,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

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
	return [`/api/v2/metrics`, ...(params ? [params] : [])] as const;
};

export const getListMetricsQueryOptions = <
	TData = Awaited<ReturnType<typeof listMetrics>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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
export type ListMetricsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List metric names
 */

export function useListMetrics<
	TData = Awaited<ReturnType<typeof listMetrics>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return { ...query, queryKey: queryOptions.queryKey };
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
	return [`/api/v2/metrics/${metricName}/alerts`] as const;
};

export const getGetMetricAlertsQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricAlerts>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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
export type GetMetricAlertsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get metric alerts
 */

export function useGetMetricAlerts<
	TData = Awaited<ReturnType<typeof getMetricAlerts>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return { ...query, queryKey: queryOptions.queryKey };
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
	return [
		`/api/v2/metrics/${metricName}/attributes`,
		...(params ? [params] : []),
	] as const;
};

export const getGetMetricAttributesQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricAttributes>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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
export type GetMetricAttributesQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get metric attributes
 */

export function useGetMetricAttributes<
	TData = Awaited<ReturnType<typeof getMetricAttributes>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return { ...query, queryKey: queryOptions.queryKey };
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
	return [`/api/v2/metrics/${metricName}/dashboards`] as const;
};

export const getGetMetricDashboardsQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricDashboards>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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
export type GetMetricDashboardsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get metric dashboards
 */

export function useGetMetricDashboards<
	TData = Awaited<ReturnType<typeof getMetricDashboards>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return { ...query, queryKey: queryOptions.queryKey };
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
	return [`/api/v2/metrics/${metricName}/highlights`] as const;
};

export const getGetMetricHighlightsQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricHighlights>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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
export type GetMetricHighlightsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get metric highlights
 */

export function useGetMetricHighlights<
	TData = Awaited<ReturnType<typeof getMetricHighlights>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return { ...query, queryKey: queryOptions.queryKey };
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
	return [`/api/v2/metrics/${metricName}/metadata`] as const;
};

export const getGetMetricMetadataQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricMetadata>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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
export type GetMetricMetadataQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get metric metadata
 */

export function useGetMetricMetadata<
	TData = Awaited<ReturnType<typeof getMetricMetadata>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return { ...query, queryKey: queryOptions.queryKey };
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
	metricsexplorertypesUpdateMetricMetadataRequestDTO?: BodyType<MetricsexplorertypesUpdateMetricMetadataRequestDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/metrics/${metricName}/metadata`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: metricsexplorertypesUpdateMetricMetadataRequestDTO,
		signal,
	});
};

export const getUpdateMetricMetadataMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMetricMetadata>>,
		TError,
		{
			pathParams: UpdateMetricMetadataPathParameters;
			data?: BodyType<MetricsexplorertypesUpdateMetricMetadataRequestDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateMetricMetadata>>,
	TError,
	{
		pathParams: UpdateMetricMetadataPathParameters;
		data?: BodyType<MetricsexplorertypesUpdateMetricMetadataRequestDTO>;
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
			data?: BodyType<MetricsexplorertypesUpdateMetricMetadataRequestDTO>;
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
export type UpdateMetricMetadataMutationBody =
	| BodyType<MetricsexplorertypesUpdateMetricMetadataRequestDTO>
	| undefined;
export type UpdateMetricMetadataMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update metric metadata
 */
export const useUpdateMetricMetadata = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMetricMetadata>>,
		TError,
		{
			pathParams: UpdateMetricMetadataPathParameters;
			data?: BodyType<MetricsexplorertypesUpdateMetricMetadataRequestDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateMetricMetadata>>,
	TError,
	{
		pathParams: UpdateMetricMetadataPathParameters;
		data?: BodyType<MetricsexplorertypesUpdateMetricMetadataRequestDTO>;
	},
	TContext
> => {
	return useMutation(getUpdateMetricMetadataMutationOptions(options));
};
/**
 * Removes the volume-control (label reduction) rule for a specified metric, reverting it to full fidelity. Admin only; enterprise feature.
 * @summary Delete a metric reduction rule
 */
export const deleteMetricReductionRule = (
	{ metricName }: DeleteMetricReductionRulePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/metrics/${metricName}/reduction_rule`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteMetricReductionRuleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteMetricReductionRule>>,
		TError,
		{ pathParams: DeleteMetricReductionRulePathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteMetricReductionRule>>,
	TError,
	{ pathParams: DeleteMetricReductionRulePathParameters },
	TContext
> => {
	const mutationKey = ['deleteMetricReductionRule'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteMetricReductionRule>>,
		{ pathParams: DeleteMetricReductionRulePathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteMetricReductionRule(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteMetricReductionRuleMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteMetricReductionRule>>
>;

export type DeleteMetricReductionRuleMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete a metric reduction rule
 */
export const useDeleteMetricReductionRule = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteMetricReductionRule>>,
		TError,
		{ pathParams: DeleteMetricReductionRulePathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteMetricReductionRule>>,
	TError,
	{ pathParams: DeleteMetricReductionRulePathParameters },
	TContext
> => {
	return useMutation(getDeleteMetricReductionRuleMutationOptions(options));
};
/**
 * Returns the active volume-control (label reduction) rule for a specified metric.
 * @summary Get a metric reduction rule
 */
export const getMetricReductionRule = (
	{ metricName }: GetMetricReductionRulePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetMetricReductionRule200>({
		url: `/api/v2/metrics/${metricName}/reduction_rule`,
		method: 'GET',
		signal,
	});
};

export const getGetMetricReductionRuleQueryKey = ({
	metricName,
}: GetMetricReductionRulePathParameters) => {
	return [`/api/v2/metrics/${metricName}/reduction_rule`] as const;
};

export const getGetMetricReductionRuleQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricReductionRule>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ metricName }: GetMetricReductionRulePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricReductionRule>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetMetricReductionRuleQueryKey({ metricName });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getMetricReductionRule>>
	> = ({ signal }) => getMetricReductionRule({ metricName }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!metricName,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getMetricReductionRule>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetMetricReductionRuleQueryResult = NonNullable<
	Awaited<ReturnType<typeof getMetricReductionRule>>
>;
export type GetMetricReductionRuleQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get a metric reduction rule
 */

export function useGetMetricReductionRule<
	TData = Awaited<ReturnType<typeof getMetricReductionRule>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ metricName }: GetMetricReductionRulePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricReductionRule>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMetricReductionRuleQueryOptions(
		{ metricName },
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get a metric reduction rule
 */
export const invalidateGetMetricReductionRule = async (
	queryClient: QueryClient,
	{ metricName }: GetMetricReductionRulePathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricReductionRuleQueryKey({ metricName }) },
		options,
	);

	return queryClient;
};

/**
 * Creates or updates the volume-control (label reduction) rule for a specified metric. The rule takes effect after a short activation delay. Admin only; enterprise feature.
 * @summary Create or update a metric reduction rule
 */
export const upsertMetricReductionRule = (
	{ metricName }: UpsertMetricReductionRulePathParameters,
	metricreductionruletypesPostableReductionRuleDTO?: BodyType<MetricreductionruletypesPostableReductionRuleDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<UpsertMetricReductionRule200>({
		url: `/api/v2/metrics/${metricName}/reduction_rule`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: metricreductionruletypesPostableReductionRuleDTO,
		signal,
	});
};

export const getUpsertMetricReductionRuleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof upsertMetricReductionRule>>,
		TError,
		{
			pathParams: UpsertMetricReductionRulePathParameters;
			data?: BodyType<MetricreductionruletypesPostableReductionRuleDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof upsertMetricReductionRule>>,
	TError,
	{
		pathParams: UpsertMetricReductionRulePathParameters;
		data?: BodyType<MetricreductionruletypesPostableReductionRuleDTO>;
	},
	TContext
> => {
	const mutationKey = ['upsertMetricReductionRule'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof upsertMetricReductionRule>>,
		{
			pathParams: UpsertMetricReductionRulePathParameters;
			data?: BodyType<MetricreductionruletypesPostableReductionRuleDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return upsertMetricReductionRule(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpsertMetricReductionRuleMutationResult = NonNullable<
	Awaited<ReturnType<typeof upsertMetricReductionRule>>
>;
export type UpsertMetricReductionRuleMutationBody =
	| BodyType<MetricreductionruletypesPostableReductionRuleDTO>
	| undefined;
export type UpsertMetricReductionRuleMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create or update a metric reduction rule
 */
export const useUpsertMetricReductionRule = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof upsertMetricReductionRule>>,
		TError,
		{
			pathParams: UpsertMetricReductionRulePathParameters;
			data?: BodyType<MetricreductionruletypesPostableReductionRuleDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof upsertMetricReductionRule>>,
	TError,
	{
		pathParams: UpsertMetricReductionRulePathParameters;
		data?: BodyType<MetricreductionruletypesPostableReductionRuleDTO>;
	},
	TContext
> => {
	return useMutation(getUpsertMetricReductionRuleMutationOptions(options));
};
/**
 * Returns raw time series data points for a metric within a time range (max 30 minutes). Each series includes labels and timestamp/value pairs.
 * @summary Inspect raw metric data points
 */
export const inspectMetrics = (
	metricsexplorertypesInspectMetricsRequestDTO?: BodyType<MetricsexplorertypesInspectMetricsRequestDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<InspectMetrics200>({
		url: `/api/v2/metrics/inspect`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: metricsexplorertypesInspectMetricsRequestDTO,
		signal,
	});
};

export const getInspectMetricsMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof inspectMetrics>>,
		TError,
		{ data?: BodyType<MetricsexplorertypesInspectMetricsRequestDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof inspectMetrics>>,
	TError,
	{ data?: BodyType<MetricsexplorertypesInspectMetricsRequestDTO> },
	TContext
> => {
	const mutationKey = ['inspectMetrics'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof inspectMetrics>>,
		{ data?: BodyType<MetricsexplorertypesInspectMetricsRequestDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return inspectMetrics(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type InspectMetricsMutationResult = NonNullable<
	Awaited<ReturnType<typeof inspectMetrics>>
>;
export type InspectMetricsMutationBody =
	| BodyType<MetricsexplorertypesInspectMetricsRequestDTO>
	| undefined;
export type InspectMetricsMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Inspect raw metric data points
 */
export const useInspectMetrics = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof inspectMetrics>>,
		TError,
		{ data?: BodyType<MetricsexplorertypesInspectMetricsRequestDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof inspectMetrics>>,
	TError,
	{ data?: BodyType<MetricsexplorertypesInspectMetricsRequestDTO> },
	TContext
> => {
	return useMutation(getInspectMetricsMutationOptions(options));
};
/**
 * Lightweight endpoint that checks if any non-SigNoz metrics have been ingested, used for onboarding status detection
 * @summary Check if non-SigNoz metrics have been received
 */
export const getMetricsOnboardingStatus = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetMetricsOnboardingStatus200>({
		url: `/api/v2/metrics/onboarding`,
		method: 'GET',
		signal,
	});
};

export const getGetMetricsOnboardingStatusQueryKey = () => {
	return [`/api/v2/metrics/onboarding`] as const;
};

export const getGetMetricsOnboardingStatusQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricsOnboardingStatus>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getMetricsOnboardingStatus>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetMetricsOnboardingStatusQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getMetricsOnboardingStatus>>
	> = ({ signal }) => getMetricsOnboardingStatus(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getMetricsOnboardingStatus>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetMetricsOnboardingStatusQueryResult = NonNullable<
	Awaited<ReturnType<typeof getMetricsOnboardingStatus>>
>;
export type GetMetricsOnboardingStatusQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Check if non-SigNoz metrics have been received
 */

export function useGetMetricsOnboardingStatus<
	TData = Awaited<ReturnType<typeof getMetricsOnboardingStatus>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getMetricsOnboardingStatus>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMetricsOnboardingStatusQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Check if non-SigNoz metrics have been received
 */
export const invalidateGetMetricsOnboardingStatus = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricsOnboardingStatusQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * Returns active metric volume-control (label reduction) rules, sorted and paginated server-side.
 * @summary List metric reduction rules
 */
export const listMetricReductionRules = (
	params?: ListMetricReductionRulesParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListMetricReductionRules200>({
		url: `/api/v2/metrics/reduction_rules`,
		method: 'GET',
		params,
		signal,
	});
};

export const getListMetricReductionRulesQueryKey = (
	params?: ListMetricReductionRulesParams,
) => {
	return [
		`/api/v2/metrics/reduction_rules`,
		...(params ? [params] : []),
	] as const;
};

export const getListMetricReductionRulesQueryOptions = <
	TData = Awaited<ReturnType<typeof listMetricReductionRules>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: ListMetricReductionRulesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listMetricReductionRules>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getListMetricReductionRulesQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listMetricReductionRules>>
	> = ({ signal }) => listMetricReductionRules(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listMetricReductionRules>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListMetricReductionRulesQueryResult = NonNullable<
	Awaited<ReturnType<typeof listMetricReductionRules>>
>;
export type ListMetricReductionRulesQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List metric reduction rules
 */

export function useListMetricReductionRules<
	TData = Awaited<ReturnType<typeof listMetricReductionRules>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: ListMetricReductionRulesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listMetricReductionRules>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListMetricReductionRulesQueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary List metric reduction rules
 */
export const invalidateListMetricReductionRules = async (
	queryClient: QueryClient,
	params?: ListMetricReductionRulesParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListMetricReductionRulesQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * Creates a volume-control rule for a metric and returns it with its id; fails if the metric already has a rule. Intended for Terraform/operators.
 * @summary Create a metric reduction rule
 */
export const createMetricReductionRule = (
	metricreductionruletypesPostableReductionRuleDTO?: BodyType<MetricreductionruletypesPostableReductionRuleDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateMetricReductionRule201>({
		url: `/api/v2/metrics/reduction_rules`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: metricreductionruletypesPostableReductionRuleDTO,
		signal,
	});
};

export const getCreateMetricReductionRuleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createMetricReductionRule>>,
		TError,
		{ data?: BodyType<MetricreductionruletypesPostableReductionRuleDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createMetricReductionRule>>,
	TError,
	{ data?: BodyType<MetricreductionruletypesPostableReductionRuleDTO> },
	TContext
> => {
	const mutationKey = ['createMetricReductionRule'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createMetricReductionRule>>,
		{ data?: BodyType<MetricreductionruletypesPostableReductionRuleDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createMetricReductionRule(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateMetricReductionRuleMutationResult = NonNullable<
	Awaited<ReturnType<typeof createMetricReductionRule>>
>;
export type CreateMetricReductionRuleMutationBody =
	| BodyType<MetricreductionruletypesPostableReductionRuleDTO>
	| undefined;
export type CreateMetricReductionRuleMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create a metric reduction rule
 */
export const useCreateMetricReductionRule = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createMetricReductionRule>>,
		TError,
		{ data?: BodyType<MetricreductionruletypesPostableReductionRuleDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createMetricReductionRule>>,
	TError,
	{ data?: BodyType<MetricreductionruletypesPostableReductionRuleDTO> },
	TContext
> => {
	return useMutation(getCreateMetricReductionRuleMutationOptions(options));
};
/**
 * Deletes a volume-control rule by its id.
 * @summary Delete a metric reduction rule by id
 */
export const deleteMetricReductionRuleByID = (
	{ id }: DeleteMetricReductionRuleByIDPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/metrics/reduction_rules/${id}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteMetricReductionRuleByIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteMetricReductionRuleByID>>,
		TError,
		{ pathParams: DeleteMetricReductionRuleByIDPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteMetricReductionRuleByID>>,
	TError,
	{ pathParams: DeleteMetricReductionRuleByIDPathParameters },
	TContext
> => {
	const mutationKey = ['deleteMetricReductionRuleByID'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteMetricReductionRuleByID>>,
		{ pathParams: DeleteMetricReductionRuleByIDPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteMetricReductionRuleByID(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteMetricReductionRuleByIDMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteMetricReductionRuleByID>>
>;

export type DeleteMetricReductionRuleByIDMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete a metric reduction rule by id
 */
export const useDeleteMetricReductionRuleByID = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteMetricReductionRuleByID>>,
		TError,
		{ pathParams: DeleteMetricReductionRuleByIDPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteMetricReductionRuleByID>>,
	TError,
	{ pathParams: DeleteMetricReductionRuleByIDPathParameters },
	TContext
> => {
	return useMutation(getDeleteMetricReductionRuleByIDMutationOptions(options));
};
/**
 * Returns a single volume-control rule by its id.
 * @summary Get a metric reduction rule by id
 */
export const getMetricReductionRuleByID = (
	{ id }: GetMetricReductionRuleByIDPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetMetricReductionRuleByID200>({
		url: `/api/v2/metrics/reduction_rules/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetMetricReductionRuleByIDQueryKey = ({
	id,
}: GetMetricReductionRuleByIDPathParameters) => {
	return [`/api/v2/metrics/reduction_rules/${id}`] as const;
};

export const getGetMetricReductionRuleByIDQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricReductionRuleByID>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetMetricReductionRuleByIDPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricReductionRuleByID>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetMetricReductionRuleByIDQueryKey({ id });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getMetricReductionRuleByID>>
	> = ({ signal }) => getMetricReductionRuleByID({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getMetricReductionRuleByID>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetMetricReductionRuleByIDQueryResult = NonNullable<
	Awaited<ReturnType<typeof getMetricReductionRuleByID>>
>;
export type GetMetricReductionRuleByIDQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get a metric reduction rule by id
 */

export function useGetMetricReductionRuleByID<
	TData = Awaited<ReturnType<typeof getMetricReductionRuleByID>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetMetricReductionRuleByIDPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricReductionRuleByID>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMetricReductionRuleByIDQueryOptions(
		{ id },
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get a metric reduction rule by id
 */
export const invalidateGetMetricReductionRuleByID = async (
	queryClient: QueryClient,
	{ id }: GetMetricReductionRuleByIDPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricReductionRuleByIDQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * Updates the match type and labels of a volume-control rule by its id; the metric name is immutable.
 * @summary Update a metric reduction rule by id
 */
export const updateMetricReductionRuleByID = (
	{ id }: UpdateMetricReductionRuleByIDPathParameters,
	metricreductionruletypesPostableReductionRuleDTO?: BodyType<MetricreductionruletypesPostableReductionRuleDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<UpdateMetricReductionRuleByID200>({
		url: `/api/v2/metrics/reduction_rules/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: metricreductionruletypesPostableReductionRuleDTO,
		signal,
	});
};

export const getUpdateMetricReductionRuleByIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMetricReductionRuleByID>>,
		TError,
		{
			pathParams: UpdateMetricReductionRuleByIDPathParameters;
			data?: BodyType<MetricreductionruletypesPostableReductionRuleDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateMetricReductionRuleByID>>,
	TError,
	{
		pathParams: UpdateMetricReductionRuleByIDPathParameters;
		data?: BodyType<MetricreductionruletypesPostableReductionRuleDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateMetricReductionRuleByID'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateMetricReductionRuleByID>>,
		{
			pathParams: UpdateMetricReductionRuleByIDPathParameters;
			data?: BodyType<MetricreductionruletypesPostableReductionRuleDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateMetricReductionRuleByID(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateMetricReductionRuleByIDMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateMetricReductionRuleByID>>
>;
export type UpdateMetricReductionRuleByIDMutationBody =
	| BodyType<MetricreductionruletypesPostableReductionRuleDTO>
	| undefined;
export type UpdateMetricReductionRuleByIDMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update a metric reduction rule by id
 */
export const useUpdateMetricReductionRuleByID = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMetricReductionRuleByID>>,
		TError,
		{
			pathParams: UpdateMetricReductionRuleByIDPathParameters;
			data?: BodyType<MetricreductionruletypesPostableReductionRuleDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateMetricReductionRuleByID>>,
	TError,
	{
		pathParams: UpdateMetricReductionRuleByIDPathParameters;
		data?: BodyType<MetricreductionruletypesPostableReductionRuleDTO>;
	},
	TContext
> => {
	return useMutation(getUpdateMetricReductionRuleByIDMutationOptions(options));
};
/**
 * Estimates the series reduction and related-asset impact of a candidate volume-control rule without persisting it.
 * @summary Preview a metric reduction rule
 */
export const previewMetricReductionRule = (
	metricreductionruletypesPostableReductionRulePreviewDTO?: BodyType<MetricreductionruletypesPostableReductionRulePreviewDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<PreviewMetricReductionRule200>({
		url: `/api/v2/metrics/reduction_rules/preview`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: metricreductionruletypesPostableReductionRulePreviewDTO,
		signal,
	});
};

export const getPreviewMetricReductionRuleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof previewMetricReductionRule>>,
		TError,
		{ data?: BodyType<MetricreductionruletypesPostableReductionRulePreviewDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof previewMetricReductionRule>>,
	TError,
	{ data?: BodyType<MetricreductionruletypesPostableReductionRulePreviewDTO> },
	TContext
> => {
	const mutationKey = ['previewMetricReductionRule'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof previewMetricReductionRule>>,
		{ data?: BodyType<MetricreductionruletypesPostableReductionRulePreviewDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return previewMetricReductionRule(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type PreviewMetricReductionRuleMutationResult = NonNullable<
	Awaited<ReturnType<typeof previewMetricReductionRule>>
>;
export type PreviewMetricReductionRuleMutationBody =
	| BodyType<MetricreductionruletypesPostableReductionRulePreviewDTO>
	| undefined;
export type PreviewMetricReductionRuleMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Preview a metric reduction rule
 */
export const usePreviewMetricReductionRule = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof previewMetricReductionRule>>,
		TError,
		{ data?: BodyType<MetricreductionruletypesPostableReductionRulePreviewDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof previewMetricReductionRule>>,
	TError,
	{ data?: BodyType<MetricreductionruletypesPostableReductionRulePreviewDTO> },
	TContext
> => {
	return useMutation(getPreviewMetricReductionRuleMutationOptions(options));
};
/**
 * Returns total ingested vs reduced series and the estimated monthly savings across all volume-control rules.
 * @summary Metric reduction stats
 */
export const getMetricReductionRuleStats = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetMetricReductionRuleStats200>({
		url: `/api/v2/metrics/reduction_rules/stats`,
		method: 'GET',
		signal,
	});
};

export const getGetMetricReductionRuleStatsQueryKey = () => {
	return [`/api/v2/metrics/reduction_rules/stats`] as const;
};

export const getGetMetricReductionRuleStatsQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricReductionRuleStats>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getMetricReductionRuleStats>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetMetricReductionRuleStatsQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getMetricReductionRuleStats>>
	> = ({ signal }) => getMetricReductionRuleStats(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getMetricReductionRuleStats>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetMetricReductionRuleStatsQueryResult = NonNullable<
	Awaited<ReturnType<typeof getMetricReductionRuleStats>>
>;
export type GetMetricReductionRuleStatsQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Metric reduction stats
 */

export function useGetMetricReductionRuleStats<
	TData = Awaited<ReturnType<typeof getMetricReductionRuleStats>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getMetricReductionRuleStats>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMetricReductionRuleStatsQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Metric reduction stats
 */
export const invalidateGetMetricReductionRuleStats = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricReductionRuleStatsQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * Returns ingested vs reduced series over time across all volume-control rules (hourly buckets), in the query-range time-series response shape.
 * @summary Metric reduction volume over time
 */
export const getMetricReductionRuleTimeseries = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetMetricReductionRuleTimeseries200>({
		url: `/api/v2/metrics/reduction_rules/timeseries`,
		method: 'GET',
		signal,
	});
};

export const getGetMetricReductionRuleTimeseriesQueryKey = () => {
	return [`/api/v2/metrics/reduction_rules/timeseries`] as const;
};

export const getGetMetricReductionRuleTimeseriesQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricReductionRuleTimeseries>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getMetricReductionRuleTimeseries>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetMetricReductionRuleTimeseriesQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getMetricReductionRuleTimeseries>>
	> = ({ signal }) => getMetricReductionRuleTimeseries(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getMetricReductionRuleTimeseries>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetMetricReductionRuleTimeseriesQueryResult = NonNullable<
	Awaited<ReturnType<typeof getMetricReductionRuleTimeseries>>
>;
export type GetMetricReductionRuleTimeseriesQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Metric reduction volume over time
 */

export function useGetMetricReductionRuleTimeseries<
	TData = Awaited<ReturnType<typeof getMetricReductionRuleTimeseries>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getMetricReductionRuleTimeseries>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMetricReductionRuleTimeseriesQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Metric reduction volume over time
 */
export const invalidateGetMetricReductionRuleTimeseries = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricReductionRuleTimeseriesQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint provides list of metrics with their number of samples and timeseries for the given time range
 * @summary Get metrics statistics
 */
export const getMetricsStats = (
	metricsexplorertypesStatsRequestDTO?: BodyType<MetricsexplorertypesStatsRequestDTO>,
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
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getMetricsStats>>,
		TError,
		{ data?: BodyType<MetricsexplorertypesStatsRequestDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof getMetricsStats>>,
	TError,
	{ data?: BodyType<MetricsexplorertypesStatsRequestDTO> },
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
		{ data?: BodyType<MetricsexplorertypesStatsRequestDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return getMetricsStats(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type GetMetricsStatsMutationResult = NonNullable<
	Awaited<ReturnType<typeof getMetricsStats>>
>;
export type GetMetricsStatsMutationBody =
	| BodyType<MetricsexplorertypesStatsRequestDTO>
	| undefined;
export type GetMetricsStatsMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get metrics statistics
 */
export const useGetMetricsStats = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getMetricsStats>>,
		TError,
		{ data?: BodyType<MetricsexplorertypesStatsRequestDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof getMetricsStats>>,
	TError,
	{ data?: BodyType<MetricsexplorertypesStatsRequestDTO> },
	TContext
> => {
	return useMutation(getGetMetricsStatsMutationOptions(options));
};
/**
 * This endpoint returns a treemap visualization showing the proportional distribution of metrics by sample count or time series count
 * @summary Get metrics treemap
 */
export const getMetricsTreemap = (
	metricsexplorertypesTreemapRequestDTO?: BodyType<MetricsexplorertypesTreemapRequestDTO>,
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
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getMetricsTreemap>>,
		TError,
		{ data?: BodyType<MetricsexplorertypesTreemapRequestDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof getMetricsTreemap>>,
	TError,
	{ data?: BodyType<MetricsexplorertypesTreemapRequestDTO> },
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
		{ data?: BodyType<MetricsexplorertypesTreemapRequestDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return getMetricsTreemap(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type GetMetricsTreemapMutationResult = NonNullable<
	Awaited<ReturnType<typeof getMetricsTreemap>>
>;
export type GetMetricsTreemapMutationBody =
	| BodyType<MetricsexplorertypesTreemapRequestDTO>
	| undefined;
export type GetMetricsTreemapMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get metrics treemap
 */
export const useGetMetricsTreemap = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getMetricsTreemap>>,
		TError,
		{ data?: BodyType<MetricsexplorertypesTreemapRequestDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof getMetricsTreemap>>,
	TError,
	{ data?: BodyType<MetricsexplorertypesTreemapRequestDTO> },
	TContext
> => {
	return useMutation(getGetMetricsTreemapMutationOptions(options));
};
