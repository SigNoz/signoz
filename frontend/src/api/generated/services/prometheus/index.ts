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

import type { PrometheusErrorResponseSchemaDTO } from '../sigNoz.schemas/prometheusErrorResponseSchemaDTO';

import type { PrometheusQueryParams } from '../sigNoz.schemas/prometheusQueryParams';

import type { PrometheusQueryPostParams } from '../sigNoz.schemas/prometheusQueryPostParams';

import type { PrometheusQueryRangeParams } from '../sigNoz.schemas/prometheusQueryRangeParams';

import type { PrometheusQueryRangePostParams } from '../sigNoz.schemas/prometheusQueryRangePostParams';

import type { PrometheusSuccessResponseSchemaDTO } from '../sigNoz.schemas/prometheusSuccessResponseSchemaDTO';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType } from '../../../generatedAPIInstance';

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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link usePrometheusQuery} query
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

export const getPrometheusQueryPostMutationKey = () =>
	['prometheusQueryPost'] as const;

export const getPrometheusQueryPostMutationOptions = <
	TError = ErrorType<PrometheusErrorResponseSchemaDTO | RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof prometheusQueryPost>>,
		TError,
		PrometheusQueryPostMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof prometheusQueryPost>>,
	TError,
	PrometheusQueryPostMutationVariables,
	TContext
> => {
	const mutationKey = getPrometheusQueryPostMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof prometheusQueryPost>>,
		PrometheusQueryPostMutationVariables
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
export type PrometheusQueryPostMutationVariables = {
	params: PrometheusQueryPostParams;
};

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
		PrometheusQueryPostMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof prometheusQueryPost>>,
	TError,
	PrometheusQueryPostMutationVariables,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link usePrometheusQueryRange} query
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

export const getPrometheusQueryRangePostMutationKey = () =>
	['prometheusQueryRangePost'] as const;

export const getPrometheusQueryRangePostMutationOptions = <
	TError = ErrorType<PrometheusErrorResponseSchemaDTO | RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof prometheusQueryRangePost>>,
		TError,
		PrometheusQueryRangePostMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof prometheusQueryRangePost>>,
	TError,
	PrometheusQueryRangePostMutationVariables,
	TContext
> => {
	const mutationKey = getPrometheusQueryRangePostMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof prometheusQueryRangePost>>,
		PrometheusQueryRangePostMutationVariables
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
export type PrometheusQueryRangePostMutationVariables = {
	params: PrometheusQueryRangePostParams;
};

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
		PrometheusQueryRangePostMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof prometheusQueryRangePost>>,
	TError,
	PrometheusQueryRangePostMutationVariables,
	TContext
> => {
	return useMutation(getPrometheusQueryRangePostMutationOptions(options));
};
