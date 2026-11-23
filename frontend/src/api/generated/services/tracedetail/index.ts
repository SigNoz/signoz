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

import type { GetFlamegraph200 } from '../sigNoz.schemas/getFlamegraph200';

import type { GetFlamegraphPathParameters } from '../sigNoz.schemas/getFlamegraphPathParameters';

import type { GetTraceAggregations200 } from '../sigNoz.schemas/getTraceAggregations200';

import type { GetTraceAggregationsPathParameters } from '../sigNoz.schemas/getTraceAggregationsPathParameters';

import type { GetTraceSummary200 } from '../sigNoz.schemas/getTraceSummary200';

import type { GetTraceSummaryPathParameters } from '../sigNoz.schemas/getTraceSummaryPathParameters';

import type { GetTraceThread200 } from '../sigNoz.schemas/getTraceThread200';

import type { GetTraceThreadParams } from '../sigNoz.schemas/getTraceThreadParams';

import type { GetTraceThreadPathParameters } from '../sigNoz.schemas/getTraceThreadPathParameters';

import type { GetWaterfallV4200 } from '../sigNoz.schemas/getWaterfallV4200';

import type { GetWaterfallV4PathParameters } from '../sigNoz.schemas/getWaterfallV4PathParameters';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

import type { SpantypesPostableFlamegraphDTO } from '../sigNoz.schemas/spantypesPostableFlamegraphDTO';

import type { SpantypesPostableTraceAggregationsDTO } from '../sigNoz.schemas/spantypesPostableTraceAggregationsDTO';

import type { SpantypesPostableWaterfallDTO } from '../sigNoz.schemas/spantypesPostableWaterfallDTO';

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
 * Computes span aggregations grouped by requested field.
 * @summary Get aggregations for a trace
 */
export const getTraceAggregations = (
	{ traceID }: GetTraceAggregationsPathParameters,
	spantypesPostableTraceAggregationsDTO?: BodyType<SpantypesPostableTraceAggregationsDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetTraceAggregations200>({
		url: `/api/v1/traces/${traceID}/aggregations`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: spantypesPostableTraceAggregationsDTO,
		signal,
	});
};

export const getGetTraceAggregationsMutationKey = () =>
	['getTraceAggregations'] as const;

export const getGetTraceAggregationsMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getTraceAggregations>>,
		TError,
		GetTraceAggregationsMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof getTraceAggregations>>,
	TError,
	GetTraceAggregationsMutationVariables,
	TContext
> => {
	const mutationKey = getGetTraceAggregationsMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof getTraceAggregations>>,
		GetTraceAggregationsMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return getTraceAggregations(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type GetTraceAggregationsMutationResult = NonNullable<
	Awaited<ReturnType<typeof getTraceAggregations>>
>;
export type GetTraceAggregationsMutationBody =
	| BodyType<SpantypesPostableTraceAggregationsDTO>
	| undefined;
export type GetTraceAggregationsMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type GetTraceAggregationsMutationVariables = {
	pathParams: GetTraceAggregationsPathParameters;
	data?: BodyType<SpantypesPostableTraceAggregationsDTO>;
};

/**
 * @summary Get aggregations for a trace
 */
export const useGetTraceAggregations = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getTraceAggregations>>,
		TError,
		GetTraceAggregationsMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof getTraceAggregations>>,
	TError,
	GetTraceAggregationsMutationVariables,
	TContext
> => {
	return useMutation(getGetTraceAggregationsMutationOptions(options));
};
/**
 * Returns the trace's time range, root span, span and error counts, and whether any spans are missing. AI traces also include token and cost totals.
 * @summary Get summary for a trace
 */
export const getTraceSummary = (
	{ traceID }: GetTraceSummaryPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetTraceSummary200>({
		url: `/api/v1/traces/${traceID}/summary`,
		method: 'GET',
		signal,
	});
};

export const getGetTraceSummaryQueryKey = ({
	traceID,
}: GetTraceSummaryPathParameters) => {
	return [`/api/v1/traces/${traceID}/summary`] as const;
};

export const getGetTraceSummaryQueryOptions = <
	TData = Awaited<ReturnType<typeof getTraceSummary>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID }: GetTraceSummaryPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getTraceSummary>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetTraceSummaryQueryKey({ traceID });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getTraceSummary>>> = ({
		signal,
	}) => getTraceSummary({ traceID }, signal);

	return {
		queryKey,
		queryFn,
		enabled: traceID !== null && traceID !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getTraceSummary>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetTraceSummaryQueryResult = NonNullable<
	Awaited<ReturnType<typeof getTraceSummary>>
>;
export type GetTraceSummaryQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get summary for a trace
 */

export function useGetTraceSummary<
	TData = Awaited<ReturnType<typeof getTraceSummary>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID }: GetTraceSummaryPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getTraceSummary>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetTraceSummaryQueryOptions({ traceID }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetTraceSummary} query
 */
export const invalidateGetTraceSummary = async (
	queryClient: QueryClient,
	{ traceID }: GetTraceSummaryPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetTraceSummaryQueryKey({ traceID }) },
		options,
	);

	return queryClient;
};

/**
 * Returns the gen_ai spans of a trace, model calls, tool calls and agent spans, in timestamp order. The messages a span carries are decoded into formattedInput and formattedOutput, with formatterWarnings holding what the converter could not resolve; a span without messages has both empty. Pass nextCursor as after or prevCursor as before to page, or spanId to open the page around a span.
 * @summary Get thread view for a trace
 */
export const getTraceThread = (
	{ traceID }: GetTraceThreadPathParameters,
	params?: GetTraceThreadParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetTraceThread200>({
		url: `/api/v1/traces/${traceID}/thread`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetTraceThreadQueryKey = (
	{ traceID }: GetTraceThreadPathParameters,
	params?: GetTraceThreadParams,
) => {
	return [
		`/api/v1/traces/${traceID}/thread`,
		...(params ? [params] : []),
	] as const;
};

export const getGetTraceThreadQueryOptions = <
	TData = Awaited<ReturnType<typeof getTraceThread>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID }: GetTraceThreadPathParameters,
	params?: GetTraceThreadParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getTraceThread>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetTraceThreadQueryKey({ traceID }, params);

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getTraceThread>>> = ({
		signal,
	}) => getTraceThread({ traceID }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: traceID !== null && traceID !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getTraceThread>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetTraceThreadQueryResult = NonNullable<
	Awaited<ReturnType<typeof getTraceThread>>
>;
export type GetTraceThreadQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get thread view for a trace
 */

export function useGetTraceThread<
	TData = Awaited<ReturnType<typeof getTraceThread>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID }: GetTraceThreadPathParameters,
	params?: GetTraceThreadParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getTraceThread>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetTraceThreadQueryOptions(
		{ traceID },
		params,
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetTraceThread} query
 */
export const invalidateGetTraceThread = async (
	queryClient: QueryClient,
	{ traceID }: GetTraceThreadPathParameters,
	params?: GetTraceThreadParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetTraceThreadQueryKey({ traceID }, params) },
		options,
	);

	return queryClient;
};

/**
 * Returns the flamegraph view of spans for a given trace ID.
 * @summary Get flamegraph view for a trace
 */
export const getFlamegraph = (
	{ traceID }: GetFlamegraphPathParameters,
	spantypesPostableFlamegraphDTO?: BodyType<SpantypesPostableFlamegraphDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetFlamegraph200>({
		url: `/api/v3/traces/${traceID}/flamegraph`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: spantypesPostableFlamegraphDTO,
		signal,
	});
};

export const getGetFlamegraphMutationKey = () => ['getFlamegraph'] as const;

export const getGetFlamegraphMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getFlamegraph>>,
		TError,
		GetFlamegraphMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof getFlamegraph>>,
	TError,
	GetFlamegraphMutationVariables,
	TContext
> => {
	const mutationKey = getGetFlamegraphMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof getFlamegraph>>,
		GetFlamegraphMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return getFlamegraph(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type GetFlamegraphMutationResult = NonNullable<
	Awaited<ReturnType<typeof getFlamegraph>>
>;
export type GetFlamegraphMutationBody =
	| BodyType<SpantypesPostableFlamegraphDTO>
	| undefined;
export type GetFlamegraphMutationError = ErrorType<RenderErrorResponseDTO>;
export type GetFlamegraphMutationVariables = {
	pathParams: GetFlamegraphPathParameters;
	data?: BodyType<SpantypesPostableFlamegraphDTO>;
};

/**
 * @summary Get flamegraph view for a trace
 */
export const useGetFlamegraph = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getFlamegraph>>,
		TError,
		GetFlamegraphMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof getFlamegraph>>,
	TError,
	GetFlamegraphMutationVariables,
	TContext
> => {
	return useMutation(getGetFlamegraphMutationOptions(options));
};
/**
 * Returns the waterfall view of spans including all spans if total spans are under a limit, a max count otherwise. Aggregations are dropped compared to v3. A span carrying gen_ai input or output messages also has them decoded into formattedInput and formattedOutput, with formatterWarnings holding what the converter could not resolve.
 * @summary Get waterfall view for a trace
 */
export const getWaterfallV4 = (
	{ traceID }: GetWaterfallV4PathParameters,
	spantypesPostableWaterfallDTO?: BodyType<SpantypesPostableWaterfallDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetWaterfallV4200>({
		url: `/api/v4/traces/${traceID}/waterfall`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: spantypesPostableWaterfallDTO,
		signal,
	});
};

export const getGetWaterfallV4MutationKey = () => ['getWaterfallV4'] as const;

export const getGetWaterfallV4MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getWaterfallV4>>,
		TError,
		GetWaterfallV4MutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof getWaterfallV4>>,
	TError,
	GetWaterfallV4MutationVariables,
	TContext
> => {
	const mutationKey = getGetWaterfallV4MutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof getWaterfallV4>>,
		GetWaterfallV4MutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return getWaterfallV4(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type GetWaterfallV4MutationResult = NonNullable<
	Awaited<ReturnType<typeof getWaterfallV4>>
>;
export type GetWaterfallV4MutationBody =
	| BodyType<SpantypesPostableWaterfallDTO>
	| undefined;
export type GetWaterfallV4MutationError = ErrorType<RenderErrorResponseDTO>;
export type GetWaterfallV4MutationVariables = {
	pathParams: GetWaterfallV4PathParameters;
	data?: BodyType<SpantypesPostableWaterfallDTO>;
};

/**
 * @summary Get waterfall view for a trace
 */
export const useGetWaterfallV4 = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getWaterfallV4>>,
		TError,
		GetWaterfallV4MutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof getWaterfallV4>>,
	TError,
	GetWaterfallV4MutationVariables,
	TContext
> => {
	return useMutation(getGetWaterfallV4MutationOptions(options));
};
