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
import type { GetFeatures200, RenderErrorResponseDTO } from '../sigNoz.schemas';

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
	TError = ErrorType<RenderErrorResponseDTO>
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
	TError = ErrorType<RenderErrorResponseDTO>
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

	query.queryKey = queryOptions.queryKey;

	return query;
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
