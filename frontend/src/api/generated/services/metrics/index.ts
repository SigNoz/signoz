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

import type { CreateMetricReductionRule201 } from '../sigNoz.schemas/createMetricReductionRule201';

import type { DeleteMetricReductionRuleByIDPathParameters } from '../sigNoz.schemas/deleteMetricReductionRuleByIDPathParameters';

import type { GetMetricAlerts200 } from '../sigNoz.schemas/getMetricAlerts200';

import type { GetMetricAlertsParams } from '../sigNoz.schemas/getMetricAlertsParams';

import type { GetMetricAttributes200 } from '../sigNoz.schemas/getMetricAttributes200';

import type { GetMetricAttributesParams } from '../sigNoz.schemas/getMetricAttributesParams';

import type { GetMetricDashboardsV2200 } from '../sigNoz.schemas/getMetricDashboardsV2200';

import type { GetMetricDashboardsV2Params } from '../sigNoz.schemas/getMetricDashboardsV2Params';

import type { GetMetricHighlights200 } from '../sigNoz.schemas/getMetricHighlights200';

import type { GetMetricHighlightsParams } from '../sigNoz.schemas/getMetricHighlightsParams';

import type { GetMetricMetadata200 } from '../sigNoz.schemas/getMetricMetadata200';

import type { GetMetricMetadataParams } from '../sigNoz.schemas/getMetricMetadataParams';

import type { GetMetricReductionRuleByID200 } from '../sigNoz.schemas/getMetricReductionRuleByID200';

import type { GetMetricReductionRuleByIDPathParameters } from '../sigNoz.schemas/getMetricReductionRuleByIDPathParameters';

import type { GetMetricReductionRuleStats200 } from '../sigNoz.schemas/getMetricReductionRuleStats200';

import type { GetMetricReductionRuleTimeseries200 } from '../sigNoz.schemas/getMetricReductionRuleTimeseries200';

import type { GetMetricsOnboardingStatus200 } from '../sigNoz.schemas/getMetricsOnboardingStatus200';

import type { GetMetricsStats200 } from '../sigNoz.schemas/getMetricsStats200';

import type { GetMetricsTreemap200 } from '../sigNoz.schemas/getMetricsTreemap200';

import type { InspectMetrics200 } from '../sigNoz.schemas/inspectMetrics200';

import type { ListMetricReductionRules200 } from '../sigNoz.schemas/listMetricReductionRules200';

import type { ListMetricReductionRulesParams } from '../sigNoz.schemas/listMetricReductionRulesParams';

import type { ListMetrics200 } from '../sigNoz.schemas/listMetrics200';

import type { ListMetricsParams } from '../sigNoz.schemas/listMetricsParams';

import type { MetricreductionruletypesPostableReductionRuleDTO } from '../sigNoz.schemas/metricreductionruletypesPostableReductionRuleDTO';

import type { MetricreductionruletypesPostableReductionRulePreviewDTO } from '../sigNoz.schemas/metricreductionruletypesPostableReductionRulePreviewDTO';

import type { MetricreductionruletypesUpdatableReductionRuleDTO } from '../sigNoz.schemas/metricreductionruletypesUpdatableReductionRuleDTO';

import type { MetricsexplorertypesInspectMetricsRequestDTO } from '../sigNoz.schemas/metricsexplorertypesInspectMetricsRequestDTO';

import type { MetricsexplorertypesStatsRequestDTO } from '../sigNoz.schemas/metricsexplorertypesStatsRequestDTO';

import type { MetricsexplorertypesTreemapRequestDTO } from '../sigNoz.schemas/metricsexplorertypesTreemapRequestDTO';

import type { MetricsexplorertypesUpdateMetricMetadataRequestDTO } from '../sigNoz.schemas/metricsexplorertypesUpdateMetricMetadataRequestDTO';

import type { PreviewMetricReductionRule200 } from '../sigNoz.schemas/previewMetricReductionRule200';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

import type { UpdateMetricReductionRuleByID200 } from '../sigNoz.schemas/updateMetricReductionRuleByID200';

import type { UpdateMetricReductionRuleByIDPathParameters } from '../sigNoz.schemas/updateMetricReductionRuleByIDPathParameters';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

const withQueryKey = <T extends object, K>(
	query: T,
	queryKey: K,
): T & { queryKey: K } => {
	const result = { queryKey } as T & { queryKey: K };
	for (const key of Object.keys(query)) {
		// The explicit queryKey always wins, matching the previous
		// `{ ...query, queryKey }` spread where it was set last.
		if (key === 'queryKey') {
			continue;
		}
		Object.defineProperty(result, key, {
			enumerable: true,
			configurable: true,
			get: () => (query as Record<string, unknown>)[key],
		});
	}
	return result;
};

/**
 * Returns active metric volume-control (label reduction) rules.
 * @summary List metric reduction rules
 */
export const listMetricReductionRules = (
	params?: ListMetricReductionRulesParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListMetricReductionRules200>({
		url: `/api/v2/metric_reduction_rules`,
		method: 'GET',
		params,
		signal,
	});
};

export const getListMetricReductionRulesQueryKey = (
	params?: ListMetricReductionRulesParams,
) => {
	return [
		`/api/v2/metric_reduction_rules`,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListMetricReductionRules} query
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
 * Creates a volume-control rule for a metric and returns it with its id; fails if the metric already has a rule.
 * @summary Create a metric reduction rule
 */
export const createMetricReductionRule = (
	metricreductionruletypesPostableReductionRuleDTO?: BodyType<MetricreductionruletypesPostableReductionRuleDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateMetricReductionRule201>({
		url: `/api/v2/metric_reduction_rules`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: metricreductionruletypesPostableReductionRuleDTO,
		signal,
	});
};

export const getCreateMetricReductionRuleMutationKey = () =>
	['createMetricReductionRule'] as const;

export const getCreateMetricReductionRuleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createMetricReductionRule>>,
		TError,
		CreateMetricReductionRuleMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createMetricReductionRule>>,
	TError,
	CreateMetricReductionRuleMutationVariables,
	TContext
> => {
	const mutationKey = getCreateMetricReductionRuleMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createMetricReductionRule>>,
		CreateMetricReductionRuleMutationVariables
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
export type CreateMetricReductionRuleMutationVariables = {
	data?: BodyType<MetricreductionruletypesPostableReductionRuleDTO>;
};

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
		CreateMetricReductionRuleMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createMetricReductionRule>>,
	TError,
	CreateMetricReductionRuleMutationVariables,
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
		url: `/api/v2/metric_reduction_rules/${id}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteMetricReductionRuleByIDMutationKey = () =>
	['deleteMetricReductionRuleByID'] as const;

export const getDeleteMetricReductionRuleByIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteMetricReductionRuleByID>>,
		TError,
		DeleteMetricReductionRuleByIDMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteMetricReductionRuleByID>>,
	TError,
	DeleteMetricReductionRuleByIDMutationVariables,
	TContext
> => {
	const mutationKey = getDeleteMetricReductionRuleByIDMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteMetricReductionRuleByID>>,
		DeleteMetricReductionRuleByIDMutationVariables
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
export type DeleteMetricReductionRuleByIDMutationVariables = {
	pathParams: DeleteMetricReductionRuleByIDPathParameters;
};

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
		DeleteMetricReductionRuleByIDMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteMetricReductionRuleByID>>,
	TError,
	DeleteMetricReductionRuleByIDMutationVariables,
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
		url: `/api/v2/metric_reduction_rules/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetMetricReductionRuleByIDQueryKey = ({
	id,
}: GetMetricReductionRuleByIDPathParameters) => {
	return [`/api/v2/metric_reduction_rules/${id}`] as const;
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
		enabled: id !== null && id !== undefined,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetMetricReductionRuleByID} query
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
	metricreductionruletypesUpdatableReductionRuleDTO?: BodyType<MetricreductionruletypesUpdatableReductionRuleDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<UpdateMetricReductionRuleByID200>({
		url: `/api/v2/metric_reduction_rules/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: metricreductionruletypesUpdatableReductionRuleDTO,
		signal,
	});
};

export const getUpdateMetricReductionRuleByIDMutationKey = () =>
	['updateMetricReductionRuleByID'] as const;

export const getUpdateMetricReductionRuleByIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMetricReductionRuleByID>>,
		TError,
		UpdateMetricReductionRuleByIDMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateMetricReductionRuleByID>>,
	TError,
	UpdateMetricReductionRuleByIDMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateMetricReductionRuleByIDMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateMetricReductionRuleByID>>,
		UpdateMetricReductionRuleByIDMutationVariables
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
	| BodyType<MetricreductionruletypesUpdatableReductionRuleDTO>
	| undefined;
export type UpdateMetricReductionRuleByIDMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type UpdateMetricReductionRuleByIDMutationVariables = {
	pathParams: UpdateMetricReductionRuleByIDPathParameters;
	data?: BodyType<MetricreductionruletypesUpdatableReductionRuleDTO>;
};

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
		UpdateMetricReductionRuleByIDMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateMetricReductionRuleByID>>,
	TError,
	UpdateMetricReductionRuleByIDMutationVariables,
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
		url: `/api/v2/metric_reduction_rules/preview`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: metricreductionruletypesPostableReductionRulePreviewDTO,
		signal,
	});
};

export const getPreviewMetricReductionRuleMutationKey = () =>
	['previewMetricReductionRule'] as const;

export const getPreviewMetricReductionRuleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof previewMetricReductionRule>>,
		TError,
		PreviewMetricReductionRuleMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof previewMetricReductionRule>>,
	TError,
	PreviewMetricReductionRuleMutationVariables,
	TContext
> => {
	const mutationKey = getPreviewMetricReductionRuleMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof previewMetricReductionRule>>,
		PreviewMetricReductionRuleMutationVariables
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
export type PreviewMetricReductionRuleMutationVariables = {
	data?: BodyType<MetricreductionruletypesPostableReductionRulePreviewDTO>;
};

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
		PreviewMetricReductionRuleMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof previewMetricReductionRule>>,
	TError,
	PreviewMetricReductionRuleMutationVariables,
	TContext
> => {
	return useMutation(getPreviewMetricReductionRuleMutationOptions(options));
};
/**
 * Returns total ingested vs retained series and the estimated monthly savings across all volume-control rules.
 * @summary Metric reduction stats
 */
export const getMetricReductionRuleStats = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetMetricReductionRuleStats200>({
		url: `/api/v2/metric_reduction_rules/stats`,
		method: 'GET',
		signal,
	});
};

export const getGetMetricReductionRuleStatsQueryKey = () => {
	return [`/api/v2/metric_reduction_rules/stats`] as const;
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetMetricReductionRuleStats} query
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
 * Returns ingested vs retained series over time across all volume-control rules (hourly buckets), in the query-range time-series response shape.
 * @summary Metric reduction volume over time
 */
export const getMetricReductionRuleTimeseries = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetMetricReductionRuleTimeseries200>({
		url: `/api/v2/metric_reduction_rules/timeseries`,
		method: 'GET',
		signal,
	});
};

export const getGetMetricReductionRuleTimeseriesQueryKey = () => {
	return [`/api/v2/metric_reduction_rules/timeseries`] as const;
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetMetricReductionRuleTimeseries} query
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListMetrics} query
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
	params: GetMetricAlertsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetMetricAlerts200>({
		url: `/api/v2/metrics/alerts`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetMetricAlertsQueryKey = (params?: GetMetricAlertsParams) => {
	return [`/api/v2/metrics/alerts`, ...(params ? [params] : [])] as const;
};

export const getGetMetricAlertsQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricAlerts>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params: GetMetricAlertsParams,
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
export type GetMetricAlertsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get metric alerts
 */

export function useGetMetricAlerts<
	TData = Awaited<ReturnType<typeof getMetricAlerts>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params: GetMetricAlertsParams,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetMetricAlerts} query
 */
export const invalidateGetMetricAlerts = async (
	queryClient: QueryClient,
	params: GetMetricAlertsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricAlertsQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint returns attribute keys and their unique values for a specified metric
 * @summary Get metric attributes
 */
export const getMetricAttributes = (
	params: GetMetricAttributesParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetMetricAttributes200>({
		url: `/api/v2/metrics/attributes`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetMetricAttributesQueryKey = (
	params?: GetMetricAttributesParams,
) => {
	return [`/api/v2/metrics/attributes`, ...(params ? [params] : [])] as const;
};

export const getGetMetricAttributesQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricAttributes>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params: GetMetricAttributesParams,
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
		queryOptions?.queryKey ?? getGetMetricAttributesQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getMetricAttributes>>
	> = ({ signal }) => getMetricAttributes(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
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
	params: GetMetricAttributesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricAttributes>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMetricAttributesQueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetMetricAttributes} query
 */
export const invalidateGetMetricAttributes = async (
	queryClient: QueryClient,
	params: GetMetricAttributesParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricAttributesQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint returns highlights like number of datapoints, totaltimeseries, active time series, last received time for a specified metric
 * @summary Get metric highlights
 */
export const getMetricHighlights = (
	params: GetMetricHighlightsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetMetricHighlights200>({
		url: `/api/v2/metrics/highlights`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetMetricHighlightsQueryKey = (
	params?: GetMetricHighlightsParams,
) => {
	return [`/api/v2/metrics/highlights`, ...(params ? [params] : [])] as const;
};

export const getGetMetricHighlightsQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricHighlights>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params: GetMetricHighlightsParams,
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
export type GetMetricHighlightsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get metric highlights
 */

export function useGetMetricHighlights<
	TData = Awaited<ReturnType<typeof getMetricHighlights>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params: GetMetricHighlightsParams,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetMetricHighlights} query
 */
export const invalidateGetMetricHighlights = async (
	queryClient: QueryClient,
	params: GetMetricHighlightsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricHighlightsQueryKey(params) },
		options,
	);

	return queryClient;
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

export const getInspectMetricsMutationKey = () => ['inspectMetrics'] as const;

export const getInspectMetricsMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof inspectMetrics>>,
		TError,
		InspectMetricsMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof inspectMetrics>>,
	TError,
	InspectMetricsMutationVariables,
	TContext
> => {
	const mutationKey = getInspectMetricsMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof inspectMetrics>>,
		InspectMetricsMutationVariables
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
export type InspectMetricsMutationVariables = {
	data?: BodyType<MetricsexplorertypesInspectMetricsRequestDTO>;
};

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
		InspectMetricsMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof inspectMetrics>>,
	TError,
	InspectMetricsMutationVariables,
	TContext
> => {
	return useMutation(getInspectMetricsMutationOptions(options));
};
/**
 * This endpoint returns metadata information like metric description, unit, type, temporality, monotonicity for a specified metric
 * @summary Get metric metadata
 */
export const getMetricMetadata = (
	params: GetMetricMetadataParams,
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
	return [`/api/v2/metrics/metadata`, ...(params ? [params] : [])] as const;
};

export const getGetMetricMetadataQueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricMetadata>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params: GetMetricMetadataParams,
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
export type GetMetricMetadataQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get metric metadata
 */

export function useGetMetricMetadata<
	TData = Awaited<ReturnType<typeof getMetricMetadata>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params: GetMetricMetadataParams,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetMetricMetadata} query
 */
export const invalidateGetMetricMetadata = async (
	queryClient: QueryClient,
	params: GetMetricMetadataParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricMetadataQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint helps to update metadata information like metric description, unit, type, temporality, monotonicity for a specified metric
 * @summary Update metric metadata
 */
export const updateMetricMetadata = (
	metricsexplorertypesUpdateMetricMetadataRequestDTO?: BodyType<MetricsexplorertypesUpdateMetricMetadataRequestDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/metrics/metadata`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: metricsexplorertypesUpdateMetricMetadataRequestDTO,
		signal,
	});
};

export const getUpdateMetricMetadataMutationKey = () =>
	['updateMetricMetadata'] as const;

export const getUpdateMetricMetadataMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMetricMetadata>>,
		TError,
		UpdateMetricMetadataMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateMetricMetadata>>,
	TError,
	UpdateMetricMetadataMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateMetricMetadataMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateMetricMetadata>>,
		UpdateMetricMetadataMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return updateMetricMetadata(data);
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
export type UpdateMetricMetadataMutationVariables = {
	data?: BodyType<MetricsexplorertypesUpdateMetricMetadataRequestDTO>;
};

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
		UpdateMetricMetadataMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateMetricMetadata>>,
	TError,
	UpdateMetricMetadataMutationVariables,
	TContext
> => {
	return useMutation(getUpdateMetricMetadataMutationOptions(options));
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetMetricsOnboardingStatus} query
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

export const getGetMetricsStatsMutationKey = () => ['getMetricsStats'] as const;

export const getGetMetricsStatsMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getMetricsStats>>,
		TError,
		GetMetricsStatsMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof getMetricsStats>>,
	TError,
	GetMetricsStatsMutationVariables,
	TContext
> => {
	const mutationKey = getGetMetricsStatsMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof getMetricsStats>>,
		GetMetricsStatsMutationVariables
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
export type GetMetricsStatsMutationVariables = {
	data?: BodyType<MetricsexplorertypesStatsRequestDTO>;
};

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
		GetMetricsStatsMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof getMetricsStats>>,
	TError,
	GetMetricsStatsMutationVariables,
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

export const getGetMetricsTreemapMutationKey = () =>
	['getMetricsTreemap'] as const;

export const getGetMetricsTreemapMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getMetricsTreemap>>,
		TError,
		GetMetricsTreemapMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof getMetricsTreemap>>,
	TError,
	GetMetricsTreemapMutationVariables,
	TContext
> => {
	const mutationKey = getGetMetricsTreemapMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof getMetricsTreemap>>,
		GetMetricsTreemapMutationVariables
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
export type GetMetricsTreemapMutationVariables = {
	data?: BodyType<MetricsexplorertypesTreemapRequestDTO>;
};

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
		GetMetricsTreemapMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof getMetricsTreemap>>,
	TError,
	GetMetricsTreemapMutationVariables,
	TContext
> => {
	return useMutation(getGetMetricsTreemapMutationOptions(options));
};
/**
 * This endpoint returns associated v2 dashboards for a specified metric
 * @summary Get metric dashboards (v2)
 */
export const getMetricDashboardsV2 = (
	params: GetMetricDashboardsV2Params,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetMetricDashboardsV2200>({
		url: `/api/v3/metrics/dashboards`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetMetricDashboardsV2QueryKey = (
	params?: GetMetricDashboardsV2Params,
) => {
	return [`/api/v3/metrics/dashboards`, ...(params ? [params] : [])] as const;
};

export const getGetMetricDashboardsV2QueryOptions = <
	TData = Awaited<ReturnType<typeof getMetricDashboardsV2>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params: GetMetricDashboardsV2Params,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricDashboardsV2>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetMetricDashboardsV2QueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getMetricDashboardsV2>>
	> = ({ signal }) => getMetricDashboardsV2(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getMetricDashboardsV2>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetMetricDashboardsV2QueryResult = NonNullable<
	Awaited<ReturnType<typeof getMetricDashboardsV2>>
>;
export type GetMetricDashboardsV2QueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get metric dashboards (v2)
 */

export function useGetMetricDashboardsV2<
	TData = Awaited<ReturnType<typeof getMetricDashboardsV2>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params: GetMetricDashboardsV2Params,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getMetricDashboardsV2>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMetricDashboardsV2QueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetMetricDashboardsV2} query
 */
export const invalidateGetMetricDashboardsV2 = async (
	queryClient: QueryClient,
	params: GetMetricDashboardsV2Params,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMetricDashboardsV2QueryKey(params) },
		options,
	);

	return queryClient;
};
