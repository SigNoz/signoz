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

import type {
	GetGlobalConfig200,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

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
 * This endpoint returns global config
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
	return [`/api/v1/global/config`] as const;
};

export const getGetGlobalConfigQueryOptions = <
	TData = Awaited<ReturnType<typeof getGlobalConfig>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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
export type GetGlobalConfigQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get global config
 */

export function useGetGlobalConfig<
	TData = Awaited<ReturnType<typeof getGlobalConfig>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return withQueryKey(query, queryOptions.queryKey);
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
