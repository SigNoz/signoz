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
	PrometheusErrorResponseSchemaDTO,
	PrometheusQueryParams,
	PrometheusQueryPostParams,
	PrometheusQueryRangeParams,
	PrometheusQueryRangePostParams,
	PrometheusSuccessResponseSchemaDTO,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType } from '../../../generatedAPIInstance';

/**
 * Prometheus-compatible endpoint: the request and response contract is the upstream Prometheus HTTP API (https://prometheus.io/docs/prometheus/latest/querying/api/). Parameters are accepted as URL query parameters or a form-encoded body, on GET and POST alike.
 * @summary Prometheus instant query
 */
export const prometheusQuery = (
	params: PrometheusQueryParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<PrometheusSuccessResponseSchemaDTO>({
		url: `/prometheus/api/v1/query`,
		method: 'GET',
		params,
		signal,
	});
};

export const getPrometheusQueryQueryKey = (params?: PrometheusQueryParams) => {
	return [`/prometheus/api/v1/query`, ...(params ? [params] : [])] as const;
};

export const getPrometheusQueryQueryOptions = <
	TData = Awaited<ReturnType<typeof prometheusQuery>>,
	TError = ErrorType<PrometheusErrorResponseSchemaDTO | RenderErrorResponseDTO>,
>(
	params: PrometheusQueryParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof prometheusQuery>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getPrometheusQueryQueryKey(params);

	const queryFn: QueryFunction<Awaited<ReturnType<typeof prometheusQuery>>> = ({
		signal,
	}) => prometheusQuery(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof prometheusQuery>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type PrometheusQueryQueryResult = NonNullable<
	Awaited<ReturnType<typeof prometheusQuery>>
>;
export type PrometheusQueryQueryError = ErrorType<
	PrometheusErrorResponseSchemaDTO | RenderErrorResponseDTO
>;

/**
 * @summary Prometheus instant query
 */

export function usePrometheusQuery<
	TData = Awaited<ReturnType<typeof prometheusQuery>>,
	TError = ErrorType<PrometheusErrorResponseSchemaDTO | RenderErrorResponseDTO>,
>(
	params: PrometheusQueryParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof prometheusQuery>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getPrometheusQueryQueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Prometheus instant query
 */
export const invalidatePrometheusQuery = async (
	queryClient: QueryClient,
	params: PrometheusQueryParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getPrometheusQueryQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * Prometheus-compatible endpoint: the request and response contract is the upstream Prometheus HTTP API (https://prometheus.io/docs/prometheus/latest/querying/api/). Parameters are accepted as URL query parameters or a form-encoded body, on GET and POST alike.
 * @summary Prometheus instant query
 */
export const prometheusQueryPost = (
	params: PrometheusQueryPostParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<PrometheusSuccessResponseSchemaDTO>({
		url: `/prometheus/api/v1/query`,
		method: 'POST',
		params,
		signal,
	});
};

export const getPrometheusQueryPostMutationOptions = <
	TError = ErrorType<PrometheusErrorResponseSchemaDTO | RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof prometheusQueryPost>>,
		TError,
		{ params: PrometheusQueryPostParams },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof prometheusQueryPost>>,
	TError,
	{ params: PrometheusQueryPostParams },
	TContext
> => {
	const mutationKey = ['prometheusQueryPost'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof prometheusQueryPost>>,
		{ params: PrometheusQueryPostParams }
	> = (props) => {
		const { params } = props ?? {};

		return prometheusQueryPost(params);
	};

	return { mutationFn, ...mutationOptions };
};

export type PrometheusQueryPostMutationResult = NonNullable<
	Awaited<ReturnType<typeof prometheusQueryPost>>
>;

export type PrometheusQueryPostMutationError = ErrorType<
	PrometheusErrorResponseSchemaDTO | RenderErrorResponseDTO
>;

/**
 * @summary Prometheus instant query
 */
export const usePrometheusQueryPost = <
	TError = ErrorType<PrometheusErrorResponseSchemaDTO | RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof prometheusQueryPost>>,
		TError,
		{ params: PrometheusQueryPostParams },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof prometheusQueryPost>>,
	TError,
	{ params: PrometheusQueryPostParams },
	TContext
> => {
	return useMutation(getPrometheusQueryPostMutationOptions(options));
};
/**
 * Prometheus-compatible endpoint: the request and response contract is the upstream Prometheus HTTP API (https://prometheus.io/docs/prometheus/latest/querying/api/). Parameters are accepted as URL query parameters or a form-encoded body, on GET and POST alike.
 * @summary Prometheus range query
 */
export const prometheusQueryRange = (
	params: PrometheusQueryRangeParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<PrometheusSuccessResponseSchemaDTO>({
		url: `/prometheus/api/v1/query_range`,
		method: 'GET',
		params,
		signal,
	});
};

export const getPrometheusQueryRangeQueryKey = (
	params?: PrometheusQueryRangeParams,
) => {
	return [
		`/prometheus/api/v1/query_range`,
		...(params ? [params] : []),
	] as const;
};

export const getPrometheusQueryRangeQueryOptions = <
	TData = Awaited<ReturnType<typeof prometheusQueryRange>>,
	TError = ErrorType<PrometheusErrorResponseSchemaDTO | RenderErrorResponseDTO>,
>(
	params: PrometheusQueryRangeParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof prometheusQueryRange>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getPrometheusQueryRangeQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof prometheusQueryRange>>
	> = ({ signal }) => prometheusQueryRange(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof prometheusQueryRange>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type PrometheusQueryRangeQueryResult = NonNullable<
	Awaited<ReturnType<typeof prometheusQueryRange>>
>;
export type PrometheusQueryRangeQueryError = ErrorType<
	PrometheusErrorResponseSchemaDTO | RenderErrorResponseDTO
>;

/**
 * @summary Prometheus range query
 */

export function usePrometheusQueryRange<
	TData = Awaited<ReturnType<typeof prometheusQueryRange>>,
	TError = ErrorType<PrometheusErrorResponseSchemaDTO | RenderErrorResponseDTO>,
>(
	params: PrometheusQueryRangeParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof prometheusQueryRange>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getPrometheusQueryRangeQueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Prometheus range query
 */
export const invalidatePrometheusQueryRange = async (
	queryClient: QueryClient,
	params: PrometheusQueryRangeParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getPrometheusQueryRangeQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * Prometheus-compatible endpoint: the request and response contract is the upstream Prometheus HTTP API (https://prometheus.io/docs/prometheus/latest/querying/api/). Parameters are accepted as URL query parameters or a form-encoded body, on GET and POST alike.
 * @summary Prometheus range query
 */
export const prometheusQueryRangePost = (
	params: PrometheusQueryRangePostParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<PrometheusSuccessResponseSchemaDTO>({
		url: `/prometheus/api/v1/query_range`,
		method: 'POST',
		params,
		signal,
	});
};

export const getPrometheusQueryRangePostMutationOptions = <
	TError = ErrorType<PrometheusErrorResponseSchemaDTO | RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof prometheusQueryRangePost>>,
		TError,
		{ params: PrometheusQueryRangePostParams },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof prometheusQueryRangePost>>,
	TError,
	{ params: PrometheusQueryRangePostParams },
	TContext
> => {
	const mutationKey = ['prometheusQueryRangePost'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof prometheusQueryRangePost>>,
		{ params: PrometheusQueryRangePostParams }
	> = (props) => {
		const { params } = props ?? {};

		return prometheusQueryRangePost(params);
	};

	return { mutationFn, ...mutationOptions };
};

export type PrometheusQueryRangePostMutationResult = NonNullable<
	Awaited<ReturnType<typeof prometheusQueryRangePost>>
>;

export type PrometheusQueryRangePostMutationError = ErrorType<
	PrometheusErrorResponseSchemaDTO | RenderErrorResponseDTO
>;

/**
 * @summary Prometheus range query
 */
export const usePrometheusQueryRangePost = <
	TError = ErrorType<PrometheusErrorResponseSchemaDTO | RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof prometheusQueryRangePost>>,
		TError,
		{ params: PrometheusQueryRangePostParams },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof prometheusQueryRangePost>>,
	TError,
	{ params: PrometheusQueryRangePostParams },
	TContext
> => {
	return useMutation(getPrometheusQueryRangePostMutationOptions(options));
};
