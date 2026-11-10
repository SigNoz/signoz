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

import type { GetFeatures200, RenderErrorResponseDTO } from '../sigNoz.schemas';

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
 * This endpoint returns the supported features and their details
 * @summary Get features
 */
export const getFeatures = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetFeatures200>({
		url: `/api/v2/features`,
		method: 'GET',
		signal,
	});
};

export const getGetFeaturesQueryKey = () => {
	return [`/api/v2/features`] as const;
};

export const getGetFeaturesQueryOptions = <
	TData = Awaited<ReturnType<typeof getFeatures>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getFeatures>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetFeaturesQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getFeatures>>> = ({
		signal,
	}) => getFeatures(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getFeatures>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetFeaturesQueryResult = NonNullable<
	Awaited<ReturnType<typeof getFeatures>>
>;
export type GetFeaturesQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get features
 */

export function useGetFeatures<
	TData = Awaited<ReturnType<typeof getFeatures>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getFeatures>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetFeaturesQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Get features
 */
export const invalidateGetFeatures = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetFeaturesQueryKey() },
		options,
	);

	return queryClient;
};
