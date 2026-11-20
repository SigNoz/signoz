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
	GetFlamegraph200,
	GetFlamegraphPathParameters,
	GetTraceAggregations200,
	GetTraceAggregationsPathParameters,
	GetTraceSummary200,
	GetTraceSummaryPathParameters,
	GetTraceThread200,
	GetTraceThreadParams,
	GetTraceThreadPathParameters,
	GetWaterfallV4200,
	GetWaterfallV4PathParameters,
	InspectTrace200,
	InspectTraceParams,
	InspectTracePathParameters,
	InspectTraceSpan200,
	InspectTraceSpanParams,
	InspectTraceSpanPathParameters,
	InspectTraceSpans200,
	InspectTraceSpansParams,
	InspectTraceSpansPathParameters,
	RenderErrorResponseDTO,
	SpantypesPostableFlamegraphDTO,
	SpantypesPostableTraceAggregationsDTO,
	SpantypesPostableWaterfallDTO,
} from '../sigNoz.schemas';

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

export const getGetTraceAggregationsMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getTraceAggregations>>,
		TError,
		{
			pathParams: GetTraceAggregationsPathParameters;
			data?: BodyType<SpantypesPostableTraceAggregationsDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof getTraceAggregations>>,
	TError,
	{
		pathParams: GetTraceAggregationsPathParameters;
		data?: BodyType<SpantypesPostableTraceAggregationsDTO>;
	},
	TContext
> => {
	const mutationKey = ['getTraceAggregations'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof getTraceAggregations>>,
		{
			pathParams: GetTraceAggregationsPathParameters;
			data?: BodyType<SpantypesPostableTraceAggregationsDTO>;
		}
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
		{
			pathParams: GetTraceAggregationsPathParameters;
			data?: BodyType<SpantypesPostableTraceAggregationsDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof getTraceAggregations>>,
	TError,
	{
		pathParams: GetTraceAggregationsPathParameters;
		data?: BodyType<SpantypesPostableTraceAggregationsDTO>;
	},
	TContext
> => {
	return useMutation(getGetTraceAggregationsMutationOptions(options));
};
/**
 * Returns the overview of a trace of any size: its identity with per-service totals, the spans where each error started, the failures not marked as errors, the slowest spans by own time, the most expensive gen_ai spans, the spans that link to other spans, and the top of the span tree. A small trace also returns each span's full record. Every list carries its total and a nextCursor when more items follow.
 * @summary Inspect a trace
 */
export const inspectTrace = (
	{ traceID }: InspectTracePathParameters,
	params?: InspectTraceParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<InspectTrace200>({
		url: `/api/v1/traces/${traceID}/inspect`,
		method: 'GET',
		params,
		signal,
	});
};

export const getInspectTraceQueryKey = (
	{ traceID }: InspectTracePathParameters,
	params?: InspectTraceParams,
) => {
	return [
		`/api/v1/traces/${traceID}/inspect`,
		...(params ? [params] : []),
	] as const;
};

export const getInspectTraceQueryOptions = <
	TData = Awaited<ReturnType<typeof inspectTrace>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID }: InspectTracePathParameters,
	params?: InspectTraceParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof inspectTrace>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getInspectTraceQueryKey({ traceID }, params);

	const queryFn: QueryFunction<Awaited<ReturnType<typeof inspectTrace>>> = ({
		signal,
	}) => inspectTrace({ traceID }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: traceID !== null && traceID !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof inspectTrace>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type InspectTraceQueryResult = NonNullable<
	Awaited<ReturnType<typeof inspectTrace>>
>;
export type InspectTraceQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Inspect a trace
 */

export function useInspectTrace<
	TData = Awaited<ReturnType<typeof inspectTrace>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID }: InspectTracePathParameters,
	params?: InspectTraceParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof inspectTrace>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getInspectTraceQueryOptions({ traceID }, params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Inspect a trace
 */
export const invalidateInspectTrace = async (
	queryClient: QueryClient,
	{ traceID }: InspectTracePathParameters,
	params?: InspectTraceParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getInspectTraceQueryKey({ traceID }, params) },
		options,
	);

	return queryClient;
};

/**
 * Returns the spans of a trace that match a search, each with its direct parent and where the words were found. Without a search it returns every span in tree order, or with under one span and the spans below it.
 * @summary Search or list the spans of a trace
 */
export const inspectTraceSpans = (
	{ traceID }: InspectTraceSpansPathParameters,
	params?: InspectTraceSpansParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<InspectTraceSpans200>({
		url: `/api/v1/traces/${traceID}/inspect/spans`,
		method: 'GET',
		params,
		signal,
	});
};

export const getInspectTraceSpansQueryKey = (
	{ traceID }: InspectTraceSpansPathParameters,
	params?: InspectTraceSpansParams,
) => {
	return [
		`/api/v1/traces/${traceID}/inspect/spans`,
		...(params ? [params] : []),
	] as const;
};

export const getInspectTraceSpansQueryOptions = <
	TData = Awaited<ReturnType<typeof inspectTraceSpans>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID }: InspectTraceSpansPathParameters,
	params?: InspectTraceSpansParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof inspectTraceSpans>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getInspectTraceSpansQueryKey({ traceID }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof inspectTraceSpans>>
	> = ({ signal }) => inspectTraceSpans({ traceID }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: traceID !== null && traceID !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof inspectTraceSpans>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type InspectTraceSpansQueryResult = NonNullable<
	Awaited<ReturnType<typeof inspectTraceSpans>>
>;
export type InspectTraceSpansQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Search or list the spans of a trace
 */

export function useInspectTraceSpans<
	TData = Awaited<ReturnType<typeof inspectTraceSpans>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID }: InspectTraceSpansPathParameters,
	params?: InspectTraceSpansParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof inspectTraceSpans>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getInspectTraceSpansQueryOptions(
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
 * @summary Search or list the spans of a trace
 */
export const invalidateInspectTraceSpans = async (
	queryClient: QueryClient,
	{ traceID }: InspectTraceSpansPathParameters,
	params?: InspectTraceSpansParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getInspectTraceSpansQueryKey({ traceID }, params) },
		options,
	);

	return queryClient;
};

/**
 * Returns one span in full: its summary and record, its nearest ancestors with the root, the spans below it level by level, and where its duration sits among recent spans of the same name and service. Long values are cut and listed in truncated; selectFields returns named attributes without the cut.
 * @summary Inspect a span of a trace
 */
export const inspectTraceSpan = (
	{ traceID, spanID }: InspectTraceSpanPathParameters,
	params?: InspectTraceSpanParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<InspectTraceSpan200>({
		url: `/api/v1/traces/${traceID}/inspect/spans/${spanID}`,
		method: 'GET',
		params,
		signal,
	});
};

export const getInspectTraceSpanQueryKey = (
	{ traceID, spanID }: InspectTraceSpanPathParameters,
	params?: InspectTraceSpanParams,
) => {
	return [
		`/api/v1/traces/${traceID}/inspect/spans/${spanID}`,
		...(params ? [params] : []),
	] as const;
};

export const getInspectTraceSpanQueryOptions = <
	TData = Awaited<ReturnType<typeof inspectTraceSpan>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID, spanID }: InspectTraceSpanPathParameters,
	params?: InspectTraceSpanParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof inspectTraceSpan>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getInspectTraceSpanQueryKey({ traceID, spanID }, params);

	const queryFn: QueryFunction<Awaited<ReturnType<typeof inspectTraceSpan>>> = ({
		signal,
	}) => inspectTraceSpan({ traceID, spanID }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled:
			traceID !== null &&
			traceID !== undefined &&
			spanID !== null &&
			spanID !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof inspectTraceSpan>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type InspectTraceSpanQueryResult = NonNullable<
	Awaited<ReturnType<typeof inspectTraceSpan>>
>;
export type InspectTraceSpanQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Inspect a span of a trace
 */

export function useInspectTraceSpan<
	TData = Awaited<ReturnType<typeof inspectTraceSpan>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID, spanID }: InspectTraceSpanPathParameters,
	params?: InspectTraceSpanParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof inspectTraceSpan>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getInspectTraceSpanQueryOptions(
		{ traceID, spanID },
		params,
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Inspect a span of a trace
 */
export const invalidateInspectTraceSpan = async (
	queryClient: QueryClient,
	{ traceID, spanID }: InspectTraceSpanPathParameters,
	params?: InspectTraceSpanParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getInspectTraceSpanQueryKey({ traceID, spanID }, params) },
		options,
	);

	return queryClient;
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
 * @summary Get summary for a trace
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
 * @summary Get thread view for a trace
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

export const getGetFlamegraphMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getFlamegraph>>,
		TError,
		{
			pathParams: GetFlamegraphPathParameters;
			data?: BodyType<SpantypesPostableFlamegraphDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof getFlamegraph>>,
	TError,
	{
		pathParams: GetFlamegraphPathParameters;
		data?: BodyType<SpantypesPostableFlamegraphDTO>;
	},
	TContext
> => {
	const mutationKey = ['getFlamegraph'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof getFlamegraph>>,
		{
			pathParams: GetFlamegraphPathParameters;
			data?: BodyType<SpantypesPostableFlamegraphDTO>;
		}
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
		{
			pathParams: GetFlamegraphPathParameters;
			data?: BodyType<SpantypesPostableFlamegraphDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof getFlamegraph>>,
	TError,
	{
		pathParams: GetFlamegraphPathParameters;
		data?: BodyType<SpantypesPostableFlamegraphDTO>;
	},
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

export const getGetWaterfallV4MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getWaterfallV4>>,
		TError,
		{
			pathParams: GetWaterfallV4PathParameters;
			data?: BodyType<SpantypesPostableWaterfallDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof getWaterfallV4>>,
	TError,
	{
		pathParams: GetWaterfallV4PathParameters;
		data?: BodyType<SpantypesPostableWaterfallDTO>;
	},
	TContext
> => {
	const mutationKey = ['getWaterfallV4'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof getWaterfallV4>>,
		{
			pathParams: GetWaterfallV4PathParameters;
			data?: BodyType<SpantypesPostableWaterfallDTO>;
		}
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
		{
			pathParams: GetWaterfallV4PathParameters;
			data?: BodyType<SpantypesPostableWaterfallDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof getWaterfallV4>>,
	TError,
	{
		pathParams: GetWaterfallV4PathParameters;
		data?: BodyType<SpantypesPostableWaterfallDTO>;
	},
	TContext
> => {
	return useMutation(getGetWaterfallV4MutationOptions(options));
};
