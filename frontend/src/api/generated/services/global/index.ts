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

import { GeneratedAPIInstance } from '../../../index';
import type {
	GetGlobalConfig200,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

type AwaitedInput<T> = PromiseLike<T> | T;

type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

/**
 * This endpoints returns global config
 * @summary Get global config
 */
export const getGlobalConfig = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetGlobalConfig200>({
		url: `/api/v1/global/config`,
		method: 'GET',
		signal,
	});
};

export const getGetGlobalConfigQueryKey = () => {
	return ['getGlobalConfig'] as const;
};

export const getGetGlobalConfigQueryOptions = <
	TData = Awaited<ReturnType<typeof getGlobalConfig>>,
	TError = RenderErrorResponseDTO
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getGlobalConfig>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetGlobalConfigQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getGlobalConfig>>> = ({
		signal,
	}) => getGlobalConfig(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getGlobalConfig>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetGlobalConfigQueryResult = NonNullable<
	Awaited<ReturnType<typeof getGlobalConfig>>
>;
export type GetGlobalConfigQueryError = RenderErrorResponseDTO;

/**
 * @summary Get global config
 */

export function useGetGlobalConfig<
	TData = Awaited<ReturnType<typeof getGlobalConfig>>,
	TError = RenderErrorResponseDTO
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getGlobalConfig>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetGlobalConfigQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get global config
 */
export const invalidateGetGlobalConfig = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetGlobalConfigQueryKey() },
		options,
	);

	return queryClient;
};
