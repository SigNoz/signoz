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
	GetTraceHighlights200,
	GetTraceHighlightsParams,
	GetTraceHighlightsPathParameters,
	GetTraceSpan200,
	GetTraceSpanPathParameters,
	GetTraceSummary200,
	GetTraceSummaryPathParameters,
	GetTraceThread200,
	GetTraceThreadParams,
	GetTraceThreadPathParameters,
	GetWaterfallV4200,
	GetWaterfallV4PathParameters,
	ListTraceSpanAncestors200,
	ListTraceSpanAncestorsParams,
	ListTraceSpanAncestorsPathParameters,
	ListTraceSpanChildren200,
	ListTraceSpanChildrenParams,
	ListTraceSpanChildrenPathParameters,
	ListTraceSpanDescendants200,
	ListTraceSpanDescendantsParams,
	ListTraceSpanDescendantsPathParameters,
	ListTraceSpans200,
	ListTraceSpansParams,
	ListTraceSpansPathParameters,
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
 * Returns the trace summary plus the spans to look at, for a trace of any size: per-service totals and the first spans of each view of the span list. The summary is the one the trace summary route returns. views names the lists to return; without it every view except all is returned. Read more of a list from the span list with the view of the same name.
 * @summary Get highlights of a trace
 */
export const getTraceHighlights = (
	{ traceID }: GetTraceHighlightsPathParameters,
	params?: GetTraceHighlightsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetTraceHighlights200>({
		url: `/api/v1/traces/${traceID}/highlights`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetTraceHighlightsQueryKey = (
	{ traceID }: GetTraceHighlightsPathParameters,
	params?: GetTraceHighlightsParams,
) => {
	return [
		`/api/v1/traces/${traceID}/highlights`,
		...(params ? [params] : []),
	] as const;
};

export const getGetTraceHighlightsQueryOptions = <
	TData = Awaited<ReturnType<typeof getTraceHighlights>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID }: GetTraceHighlightsPathParameters,
	params?: GetTraceHighlightsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getTraceHighlights>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetTraceHighlightsQueryKey({ traceID }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getTraceHighlights>>
	> = ({ signal }) => getTraceHighlights({ traceID }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: traceID !== null && traceID !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getTraceHighlights>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetTraceHighlightsQueryResult = NonNullable<
	Awaited<ReturnType<typeof getTraceHighlights>>
>;
export type GetTraceHighlightsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get highlights of a trace
 */

export function useGetTraceHighlights<
	TData = Awaited<ReturnType<typeof getTraceHighlights>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID }: GetTraceHighlightsPathParameters,
	params?: GetTraceHighlightsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getTraceHighlights>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetTraceHighlightsQueryOptions(
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
 * @summary Get highlights of a trace
 */
export const invalidateGetTraceHighlights = async (
	queryClient: QueryClient,
	{ traceID }: GetTraceHighlightsPathParameters,
	params?: GetTraceHighlightsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetTraceHighlightsQueryKey({ traceID }, params) },
		options,
	);

	return queryClient;
};

/**
 * Returns a page of the spans of a trace, in tree order from the top: a span is followed by the spans below it. view keeps only the spans of one kind, query narrows them, and selectFields names the attributes to fill. Values are returned whole.
 * @summary List spans of a trace
 */
export const listTraceSpans = (
	{ traceID }: ListTraceSpansPathParameters,
	params?: ListTraceSpansParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListTraceSpans200>({
		url: `/api/v1/traces/${traceID}/spans`,
		method: 'GET',
		params,
		signal,
	});
};

export const getListTraceSpansQueryKey = (
	{ traceID }: ListTraceSpansPathParameters,
	params?: ListTraceSpansParams,
) => {
	return [
		`/api/v1/traces/${traceID}/spans`,
		...(params ? [params] : []),
	] as const;
};

export const getListTraceSpansQueryOptions = <
	TData = Awaited<ReturnType<typeof listTraceSpans>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID }: ListTraceSpansPathParameters,
	params?: ListTraceSpansParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listTraceSpans>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getListTraceSpansQueryKey({ traceID }, params);

	const queryFn: QueryFunction<Awaited<ReturnType<typeof listTraceSpans>>> = ({
		signal,
	}) => listTraceSpans({ traceID }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: traceID !== null && traceID !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof listTraceSpans>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListTraceSpansQueryResult = NonNullable<
	Awaited<ReturnType<typeof listTraceSpans>>
>;
export type ListTraceSpansQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List spans of a trace
 */

export function useListTraceSpans<
	TData = Awaited<ReturnType<typeof listTraceSpans>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID }: ListTraceSpansPathParameters,
	params?: ListTraceSpansParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listTraceSpans>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListTraceSpansQueryOptions(
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
 * @summary List spans of a trace
 */
export const invalidateListTraceSpans = async (
	queryClient: QueryClient,
	{ traceID }: ListTraceSpansPathParameters,
	params?: ListTraceSpansParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListTraceSpansQueryKey({ traceID }, params) },
		options,
	);

	return queryClient;
};

/**
 * Returns one span with every attribute, resource attribute and event. Values are returned whole. It returns only the stored span: its tree stats come with it in any span list, and the spans around it come from the children, descendants and ancestors routes.
 * @summary Get span of a trace
 */
export const getTraceSpan = (
	{ traceID, spanID }: GetTraceSpanPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetTraceSpan200>({
		url: `/api/v1/traces/${traceID}/spans/${spanID}`,
		method: 'GET',
		signal,
	});
};

export const getGetTraceSpanQueryKey = ({
	traceID,
	spanID,
}: GetTraceSpanPathParameters) => {
	return [`/api/v1/traces/${traceID}/spans/${spanID}`] as const;
};

export const getGetTraceSpanQueryOptions = <
	TData = Awaited<ReturnType<typeof getTraceSpan>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID, spanID }: GetTraceSpanPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getTraceSpan>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetTraceSpanQueryKey({ traceID, spanID });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getTraceSpan>>> = ({
		signal,
	}) => getTraceSpan({ traceID, spanID }, signal);

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
		Awaited<ReturnType<typeof getTraceSpan>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetTraceSpanQueryResult = NonNullable<
	Awaited<ReturnType<typeof getTraceSpan>>
>;
export type GetTraceSpanQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get span of a trace
 */

export function useGetTraceSpan<
	TData = Awaited<ReturnType<typeof getTraceSpan>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID, spanID }: GetTraceSpanPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getTraceSpan>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetTraceSpanQueryOptions({ traceID, spanID }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Get span of a trace
 */
export const invalidateGetTraceSpan = async (
	queryClient: QueryClient,
	{ traceID, spanID }: GetTraceSpanPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetTraceSpanQueryKey({ traceID, spanID }) },
		options,
	);

	return queryClient;
};

/**
 * Returns a page of the spans above a span: the chain of parents from the span up to its root, the parent first, and nothing from other branches. The span itself is not included. It takes the same parameters as the span list. The list is empty for a root, and stops where a parent was never received.
 * @summary List ancestors of a span
 */
export const listTraceSpanAncestors = (
	{ traceID, spanID }: ListTraceSpanAncestorsPathParameters,
	params?: ListTraceSpanAncestorsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListTraceSpanAncestors200>({
		url: `/api/v1/traces/${traceID}/spans/${spanID}/ancestors`,
		method: 'GET',
		params,
		signal,
	});
};

export const getListTraceSpanAncestorsQueryKey = (
	{ traceID, spanID }: ListTraceSpanAncestorsPathParameters,
	params?: ListTraceSpanAncestorsParams,
) => {
	return [
		`/api/v1/traces/${traceID}/spans/${spanID}/ancestors`,
		...(params ? [params] : []),
	] as const;
};

export const getListTraceSpanAncestorsQueryOptions = <
	TData = Awaited<ReturnType<typeof listTraceSpanAncestors>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID, spanID }: ListTraceSpanAncestorsPathParameters,
	params?: ListTraceSpanAncestorsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listTraceSpanAncestors>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getListTraceSpanAncestorsQueryKey({ traceID, spanID }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listTraceSpanAncestors>>
	> = ({ signal }) =>
		listTraceSpanAncestors({ traceID, spanID }, params, signal);

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
		Awaited<ReturnType<typeof listTraceSpanAncestors>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListTraceSpanAncestorsQueryResult = NonNullable<
	Awaited<ReturnType<typeof listTraceSpanAncestors>>
>;
export type ListTraceSpanAncestorsQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List ancestors of a span
 */

export function useListTraceSpanAncestors<
	TData = Awaited<ReturnType<typeof listTraceSpanAncestors>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID, spanID }: ListTraceSpanAncestorsPathParameters,
	params?: ListTraceSpanAncestorsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listTraceSpanAncestors>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListTraceSpanAncestorsQueryOptions(
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
 * @summary List ancestors of a span
 */
export const invalidateListTraceSpanAncestors = async (
	queryClient: QueryClient,
	{ traceID, spanID }: ListTraceSpanAncestorsPathParameters,
	params?: ListTraceSpanAncestorsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListTraceSpanAncestorsQueryKey({ traceID, spanID }, params) },
		options,
	);

	return queryClient;
};

/**
 * Returns a page of the direct children of a span, one level below it and nothing deeper, in start order. It takes the same parameters as the span list. The list is empty for a span without children.
 * @summary List children of a span
 */
export const listTraceSpanChildren = (
	{ traceID, spanID }: ListTraceSpanChildrenPathParameters,
	params?: ListTraceSpanChildrenParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListTraceSpanChildren200>({
		url: `/api/v1/traces/${traceID}/spans/${spanID}/children`,
		method: 'GET',
		params,
		signal,
	});
};

export const getListTraceSpanChildrenQueryKey = (
	{ traceID, spanID }: ListTraceSpanChildrenPathParameters,
	params?: ListTraceSpanChildrenParams,
) => {
	return [
		`/api/v1/traces/${traceID}/spans/${spanID}/children`,
		...(params ? [params] : []),
	] as const;
};

export const getListTraceSpanChildrenQueryOptions = <
	TData = Awaited<ReturnType<typeof listTraceSpanChildren>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID, spanID }: ListTraceSpanChildrenPathParameters,
	params?: ListTraceSpanChildrenParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listTraceSpanChildren>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getListTraceSpanChildrenQueryKey({ traceID, spanID }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listTraceSpanChildren>>
	> = ({ signal }) => listTraceSpanChildren({ traceID, spanID }, params, signal);

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
		Awaited<ReturnType<typeof listTraceSpanChildren>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListTraceSpanChildrenQueryResult = NonNullable<
	Awaited<ReturnType<typeof listTraceSpanChildren>>
>;
export type ListTraceSpanChildrenQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List children of a span
 */

export function useListTraceSpanChildren<
	TData = Awaited<ReturnType<typeof listTraceSpanChildren>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID, spanID }: ListTraceSpanChildrenPathParameters,
	params?: ListTraceSpanChildrenParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listTraceSpanChildren>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListTraceSpanChildrenQueryOptions(
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
 * @summary List children of a span
 */
export const invalidateListTraceSpanChildren = async (
	queryClient: QueryClient,
	{ traceID, spanID }: ListTraceSpanChildrenPathParameters,
	params?: ListTraceSpanChildrenParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListTraceSpanChildrenQueryKey({ traceID, spanID }, params) },
		options,
	);

	return queryClient;
};

/**
 * Returns a page of the spans below a span, at any depth, in tree order. It takes the same parameters as the span list, so view=error_origins returns the errors that started below the span.
 * @summary List descendants of a span
 */
export const listTraceSpanDescendants = (
	{ traceID, spanID }: ListTraceSpanDescendantsPathParameters,
	params?: ListTraceSpanDescendantsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListTraceSpanDescendants200>({
		url: `/api/v1/traces/${traceID}/spans/${spanID}/descendants`,
		method: 'GET',
		params,
		signal,
	});
};

export const getListTraceSpanDescendantsQueryKey = (
	{ traceID, spanID }: ListTraceSpanDescendantsPathParameters,
	params?: ListTraceSpanDescendantsParams,
) => {
	return [
		`/api/v1/traces/${traceID}/spans/${spanID}/descendants`,
		...(params ? [params] : []),
	] as const;
};

export const getListTraceSpanDescendantsQueryOptions = <
	TData = Awaited<ReturnType<typeof listTraceSpanDescendants>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID, spanID }: ListTraceSpanDescendantsPathParameters,
	params?: ListTraceSpanDescendantsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listTraceSpanDescendants>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getListTraceSpanDescendantsQueryKey({ traceID, spanID }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listTraceSpanDescendants>>
	> = ({ signal }) =>
		listTraceSpanDescendants({ traceID, spanID }, params, signal);

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
		Awaited<ReturnType<typeof listTraceSpanDescendants>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListTraceSpanDescendantsQueryResult = NonNullable<
	Awaited<ReturnType<typeof listTraceSpanDescendants>>
>;
export type ListTraceSpanDescendantsQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List descendants of a span
 */

export function useListTraceSpanDescendants<
	TData = Awaited<ReturnType<typeof listTraceSpanDescendants>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ traceID, spanID }: ListTraceSpanDescendantsPathParameters,
	params?: ListTraceSpanDescendantsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listTraceSpanDescendants>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListTraceSpanDescendantsQueryOptions(
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
 * @summary List descendants of a span
 */
export const invalidateListTraceSpanDescendants = async (
	queryClient: QueryClient,
	{ traceID, spanID }: ListTraceSpanDescendantsPathParameters,
	params?: ListTraceSpanDescendantsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{
			queryKey: getListTraceSpanDescendantsQueryKey({ traceID, spanID }, params),
		},
		options,
	);

	return queryClient;
};

/**
 * Returns the totals of a trace and no spans: its time range, root span, span and error counts, and whether any spans are missing. AI traces also include model and tool call counts, and token and cost totals. For the spans to look at, use the trace highlights.
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
