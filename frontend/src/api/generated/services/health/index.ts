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
	Healthz200,
	Healthz503,
	Livez200,
	Readyz200,
	Readyz503,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

/**
 * @summary Health check
 */
export const healthz = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<Healthz200>({
		url: `/api/v2/healthz`,
		method: 'GET',
		signal,
	});
};

export const getHealthzQueryKey = () => {
	return [`/api/v2/healthz`] as const;
};

export const getHealthzQueryOptions = <
	TData = Awaited<ReturnType<typeof healthz>>,
	TError = ErrorType<Healthz503>
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof healthz>>, TError, TData>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getHealthzQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof healthz>>> = ({
		signal,
	}) => healthz(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof healthz>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type HealthzQueryResult = NonNullable<
	Awaited<ReturnType<typeof healthz>>
>;
export type HealthzQueryError = ErrorType<Healthz503>;

/**
 * @summary Health check
 */

export function useHealthz<
	TData = Awaited<ReturnType<typeof healthz>>,
	TError = ErrorType<Healthz503>
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof healthz>>, TError, TData>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getHealthzQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Health check
 */
export const invalidateHealthz = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getHealthzQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * @summary Liveness check
 */
export const livez = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<Livez200>({
		url: `/api/v2/livez`,
		method: 'GET',
		signal,
	});
};

export const getLivezQueryKey = () => {
	return [`/api/v2/livez`] as const;
};

export const getLivezQueryOptions = <
	TData = Awaited<ReturnType<typeof livez>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof livez>>, TError, TData>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getLivezQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof livez>>> = ({
		signal,
	}) => livez(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof livez>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type LivezQueryResult = NonNullable<Awaited<ReturnType<typeof livez>>>;
export type LivezQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Liveness check
 */

export function useLivez<
	TData = Awaited<ReturnType<typeof livez>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof livez>>, TError, TData>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getLivezQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Liveness check
 */
export const invalidateLivez = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries({ queryKey: getLivezQueryKey() }, options);

	return queryClient;
};

/**
 * @summary Readiness check
 */
export const readyz = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<Readyz200>({
		url: `/api/v2/readyz`,
		method: 'GET',
		signal,
	});
};

export const getReadyzQueryKey = () => {
	return [`/api/v2/readyz`] as const;
};

export const getReadyzQueryOptions = <
	TData = Awaited<ReturnType<typeof readyz>>,
	TError = ErrorType<Readyz503>
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof readyz>>, TError, TData>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getReadyzQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof readyz>>> = ({
		signal,
	}) => readyz(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof readyz>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ReadyzQueryResult = NonNullable<Awaited<ReturnType<typeof readyz>>>;
export type ReadyzQueryError = ErrorType<Readyz503>;

/**
 * @summary Readiness check
 */

export function useReadyz<
	TData = Awaited<ReturnType<typeof readyz>>,
	TError = ErrorType<Readyz503>
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof readyz>>, TError, TData>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getReadyzQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Readiness check
 */
export const invalidateReadyz = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getReadyzQueryKey() },
		options,
	);

	return queryClient;
};
