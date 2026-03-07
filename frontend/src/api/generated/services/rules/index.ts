/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'yarn generate:api'
 * SigNoz
 */
import type {
	InvalidateOptions,
	QueryClient,
	QueryFunction,
	QueryKey,
	UseQueryOptions,
	UseQueryResult,
} from 'react-query';
import { useQuery } from 'react-query';

import type { ErrorType } from '../../../generatedAPIInstance';
import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type {
	GetRuleHistoryFilterKeys200,
	GetRuleHistoryFilterKeysParams,
	GetRuleHistoryFilterKeysPathParameters,
	GetRuleHistoryFilterValues200,
	GetRuleHistoryFilterValuesParams,
	GetRuleHistoryFilterValuesPathParameters,
	GetRuleHistoryOverallStatus200,
	GetRuleHistoryOverallStatusParams,
	GetRuleHistoryOverallStatusPathParameters,
	GetRuleHistoryStats200,
	GetRuleHistoryStatsParams,
	GetRuleHistoryStatsPathParameters,
	GetRuleHistoryTimeline200,
	GetRuleHistoryTimelineParams,
	GetRuleHistoryTimelinePathParameters,
	GetRuleHistoryTopContributors200,
	GetRuleHistoryTopContributorsParams,
	GetRuleHistoryTopContributorsPathParameters,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

/**
 * Returns distinct label keys from rule history entries for the selected range.
 * @summary Get rule history filter keys
 */
export const getRuleHistoryFilterKeys = (
	{ id }: GetRuleHistoryFilterKeysPathParameters,
	params?: GetRuleHistoryFilterKeysParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetRuleHistoryFilterKeys200>({
		url: `/api/v2/rules/${id}/history/filter_keys`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetRuleHistoryFilterKeysQueryKey = (
	{ id }: GetRuleHistoryFilterKeysPathParameters,
	params?: GetRuleHistoryFilterKeysParams,
) => {
	return [
		`/api/v2/rules/${id}/history/filter_keys`,
		...(params ? [params] : []),
	] as const;
};

export const getGetRuleHistoryFilterKeysQueryOptions = <
	TData = Awaited<ReturnType<typeof getRuleHistoryFilterKeys>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetRuleHistoryFilterKeysPathParameters,
	params?: GetRuleHistoryFilterKeysParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryFilterKeys>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetRuleHistoryFilterKeysQueryKey({ id }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getRuleHistoryFilterKeys>>
	> = ({ signal }) => getRuleHistoryFilterKeys({ id }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getRuleHistoryFilterKeys>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetRuleHistoryFilterKeysQueryResult = NonNullable<
	Awaited<ReturnType<typeof getRuleHistoryFilterKeys>>
>;
export type GetRuleHistoryFilterKeysQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get rule history filter keys
 */

export function useGetRuleHistoryFilterKeys<
	TData = Awaited<ReturnType<typeof getRuleHistoryFilterKeys>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetRuleHistoryFilterKeysPathParameters,
	params?: GetRuleHistoryFilterKeysParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryFilterKeys>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetRuleHistoryFilterKeysQueryOptions(
		{ id },
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
 * @summary Get rule history filter keys
 */
export const invalidateGetRuleHistoryFilterKeys = async (
	queryClient: QueryClient,
	{ id }: GetRuleHistoryFilterKeysPathParameters,
	params?: GetRuleHistoryFilterKeysParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetRuleHistoryFilterKeysQueryKey({ id }, params) },
		options,
	);

	return queryClient;
};

/**
 * Returns distinct label values for a given key from rule history entries.
 * @summary Get rule history filter values
 */
export const getRuleHistoryFilterValues = (
	{ id }: GetRuleHistoryFilterValuesPathParameters,
	params?: GetRuleHistoryFilterValuesParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetRuleHistoryFilterValues200>({
		url: `/api/v2/rules/${id}/history/filter_values`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetRuleHistoryFilterValuesQueryKey = (
	{ id }: GetRuleHistoryFilterValuesPathParameters,
	params?: GetRuleHistoryFilterValuesParams,
) => {
	return [
		`/api/v2/rules/${id}/history/filter_values`,
		...(params ? [params] : []),
	] as const;
};

export const getGetRuleHistoryFilterValuesQueryOptions = <
	TData = Awaited<ReturnType<typeof getRuleHistoryFilterValues>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetRuleHistoryFilterValuesPathParameters,
	params?: GetRuleHistoryFilterValuesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryFilterValues>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getGetRuleHistoryFilterValuesQueryKey({ id }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getRuleHistoryFilterValues>>
	> = ({ signal }) => getRuleHistoryFilterValues({ id }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getRuleHistoryFilterValues>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetRuleHistoryFilterValuesQueryResult = NonNullable<
	Awaited<ReturnType<typeof getRuleHistoryFilterValues>>
>;
export type GetRuleHistoryFilterValuesQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get rule history filter values
 */

export function useGetRuleHistoryFilterValues<
	TData = Awaited<ReturnType<typeof getRuleHistoryFilterValues>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetRuleHistoryFilterValuesPathParameters,
	params?: GetRuleHistoryFilterValuesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryFilterValues>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetRuleHistoryFilterValuesQueryOptions(
		{ id },
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
 * @summary Get rule history filter values
 */
export const invalidateGetRuleHistoryFilterValues = async (
	queryClient: QueryClient,
	{ id }: GetRuleHistoryFilterValuesPathParameters,
	params?: GetRuleHistoryFilterValuesParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetRuleHistoryFilterValuesQueryKey({ id }, params) },
		options,
	);

	return queryClient;
};

/**
 * Returns overall firing/inactive intervals for a rule in the selected time range.
 * @summary Get rule overall status timeline
 */
export const getRuleHistoryOverallStatus = (
	{ id }: GetRuleHistoryOverallStatusPathParameters,
	params: GetRuleHistoryOverallStatusParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetRuleHistoryOverallStatus200>({
		url: `/api/v2/rules/${id}/history/overall_status`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetRuleHistoryOverallStatusQueryKey = (
	{ id }: GetRuleHistoryOverallStatusPathParameters,
	params?: GetRuleHistoryOverallStatusParams,
) => {
	return [
		`/api/v2/rules/${id}/history/overall_status`,
		...(params ? [params] : []),
	] as const;
};

export const getGetRuleHistoryOverallStatusQueryOptions = <
	TData = Awaited<ReturnType<typeof getRuleHistoryOverallStatus>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetRuleHistoryOverallStatusPathParameters,
	params: GetRuleHistoryOverallStatusParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryOverallStatus>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getGetRuleHistoryOverallStatusQueryKey({ id }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getRuleHistoryOverallStatus>>
	> = ({ signal }) => getRuleHistoryOverallStatus({ id }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getRuleHistoryOverallStatus>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetRuleHistoryOverallStatusQueryResult = NonNullable<
	Awaited<ReturnType<typeof getRuleHistoryOverallStatus>>
>;
export type GetRuleHistoryOverallStatusQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get rule overall status timeline
 */

export function useGetRuleHistoryOverallStatus<
	TData = Awaited<ReturnType<typeof getRuleHistoryOverallStatus>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetRuleHistoryOverallStatusPathParameters,
	params: GetRuleHistoryOverallStatusParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryOverallStatus>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetRuleHistoryOverallStatusQueryOptions(
		{ id },
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
 * @summary Get rule overall status timeline
 */
export const invalidateGetRuleHistoryOverallStatus = async (
	queryClient: QueryClient,
	{ id }: GetRuleHistoryOverallStatusPathParameters,
	params: GetRuleHistoryOverallStatusParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetRuleHistoryOverallStatusQueryKey({ id }, params) },
		options,
	);

	return queryClient;
};

/**
 * Returns trigger and resolution statistics for a rule in the selected time range.
 * @summary Get rule history stats
 */
export const getRuleHistoryStats = (
	{ id }: GetRuleHistoryStatsPathParameters,
	params: GetRuleHistoryStatsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetRuleHistoryStats200>({
		url: `/api/v2/rules/${id}/history/stats`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetRuleHistoryStatsQueryKey = (
	{ id }: GetRuleHistoryStatsPathParameters,
	params?: GetRuleHistoryStatsParams,
) => {
	return [
		`/api/v2/rules/${id}/history/stats`,
		...(params ? [params] : []),
	] as const;
};

export const getGetRuleHistoryStatsQueryOptions = <
	TData = Awaited<ReturnType<typeof getRuleHistoryStats>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetRuleHistoryStatsPathParameters,
	params: GetRuleHistoryStatsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryStats>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetRuleHistoryStatsQueryKey({ id }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getRuleHistoryStats>>
	> = ({ signal }) => getRuleHistoryStats({ id }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getRuleHistoryStats>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetRuleHistoryStatsQueryResult = NonNullable<
	Awaited<ReturnType<typeof getRuleHistoryStats>>
>;
export type GetRuleHistoryStatsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get rule history stats
 */

export function useGetRuleHistoryStats<
	TData = Awaited<ReturnType<typeof getRuleHistoryStats>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetRuleHistoryStatsPathParameters,
	params: GetRuleHistoryStatsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryStats>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetRuleHistoryStatsQueryOptions(
		{ id },
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
 * @summary Get rule history stats
 */
export const invalidateGetRuleHistoryStats = async (
	queryClient: QueryClient,
	{ id }: GetRuleHistoryStatsPathParameters,
	params: GetRuleHistoryStatsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetRuleHistoryStatsQueryKey({ id }, params) },
		options,
	);

	return queryClient;
};

/**
 * Returns paginated timeline entries for rule state transitions.
 * @summary Get rule history timeline
 */
export const getRuleHistoryTimeline = (
	{ id }: GetRuleHistoryTimelinePathParameters,
	params: GetRuleHistoryTimelineParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetRuleHistoryTimeline200>({
		url: `/api/v2/rules/${id}/history/timeline`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetRuleHistoryTimelineQueryKey = (
	{ id }: GetRuleHistoryTimelinePathParameters,
	params?: GetRuleHistoryTimelineParams,
) => {
	return [
		`/api/v2/rules/${id}/history/timeline`,
		...(params ? [params] : []),
	] as const;
};

export const getGetRuleHistoryTimelineQueryOptions = <
	TData = Awaited<ReturnType<typeof getRuleHistoryTimeline>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetRuleHistoryTimelinePathParameters,
	params: GetRuleHistoryTimelineParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryTimeline>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetRuleHistoryTimelineQueryKey({ id }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getRuleHistoryTimeline>>
	> = ({ signal }) => getRuleHistoryTimeline({ id }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getRuleHistoryTimeline>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetRuleHistoryTimelineQueryResult = NonNullable<
	Awaited<ReturnType<typeof getRuleHistoryTimeline>>
>;
export type GetRuleHistoryTimelineQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get rule history timeline
 */

export function useGetRuleHistoryTimeline<
	TData = Awaited<ReturnType<typeof getRuleHistoryTimeline>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetRuleHistoryTimelinePathParameters,
	params: GetRuleHistoryTimelineParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryTimeline>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetRuleHistoryTimelineQueryOptions(
		{ id },
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
 * @summary Get rule history timeline
 */
export const invalidateGetRuleHistoryTimeline = async (
	queryClient: QueryClient,
	{ id }: GetRuleHistoryTimelinePathParameters,
	params: GetRuleHistoryTimelineParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetRuleHistoryTimelineQueryKey({ id }, params) },
		options,
	);

	return queryClient;
};

/**
 * Returns top label combinations contributing to rule firing in the selected time range.
 * @summary Get top contributors to rule firing
 */
export const getRuleHistoryTopContributors = (
	{ id }: GetRuleHistoryTopContributorsPathParameters,
	params: GetRuleHistoryTopContributorsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetRuleHistoryTopContributors200>({
		url: `/api/v2/rules/${id}/history/top_contributors`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetRuleHistoryTopContributorsQueryKey = (
	{ id }: GetRuleHistoryTopContributorsPathParameters,
	params?: GetRuleHistoryTopContributorsParams,
) => {
	return [
		`/api/v2/rules/${id}/history/top_contributors`,
		...(params ? [params] : []),
	] as const;
};

export const getGetRuleHistoryTopContributorsQueryOptions = <
	TData = Awaited<ReturnType<typeof getRuleHistoryTopContributors>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetRuleHistoryTopContributorsPathParameters,
	params: GetRuleHistoryTopContributorsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryTopContributors>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getGetRuleHistoryTopContributorsQueryKey({ id }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getRuleHistoryTopContributors>>
	> = ({ signal }) => getRuleHistoryTopContributors({ id }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getRuleHistoryTopContributors>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetRuleHistoryTopContributorsQueryResult = NonNullable<
	Awaited<ReturnType<typeof getRuleHistoryTopContributors>>
>;
export type GetRuleHistoryTopContributorsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get top contributors to rule firing
 */

export function useGetRuleHistoryTopContributors<
	TData = Awaited<ReturnType<typeof getRuleHistoryTopContributors>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetRuleHistoryTopContributorsPathParameters,
	params: GetRuleHistoryTopContributorsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryTopContributors>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetRuleHistoryTopContributorsQueryOptions(
		{ id },
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
 * @summary Get top contributors to rule firing
 */
export const invalidateGetRuleHistoryTopContributors = async (
	queryClient: QueryClient,
	{ id }: GetRuleHistoryTopContributorsPathParameters,
	params: GetRuleHistoryTopContributorsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetRuleHistoryTopContributorsQueryKey({ id }, params) },
		options,
	);

	return queryClient;
};
