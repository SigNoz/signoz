/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import { useQuery } from 'react-query';
import type {
	InvalidateOptions,
	QueryClient,
	QueryFunction,
	QueryKey,
	UseQueryOptions,
	UseQueryResult,
} from 'react-query';

import type { GetStats200, RenderErrorResponseDTO } from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType } from '../../../generatedAPIInstance';

/**
 * This endpoint returns the collected stats for the organization
 * @summary Get stats
 */
export const getStats = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetStats200>({
		url: `/api/v1/stats`,
		method: 'GET',
		signal,
	});
};

export const getGetStatsQueryKey = () => {
	return [`/api/v1/stats`] as const;
};

export const getGetStatsQueryOptions = <
	TData = Awaited<ReturnType<typeof getStats>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof getStats>>, TError, TData>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetStatsQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getStats>>> = ({
		signal,
	}) => getStats(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getStats>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetStatsQueryResult = NonNullable<
	Awaited<ReturnType<typeof getStats>>
>;
export type GetStatsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get stats
 */

export function useGetStats<
	TData = Awaited<ReturnType<typeof getStats>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof getStats>>, TError, TData>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetStatsQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get stats
 */
export const invalidateGetStats = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetStatsQueryKey() },
		options,
	);

	return queryClient;
};
