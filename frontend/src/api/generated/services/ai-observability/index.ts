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
	GetAIObservabilityFieldsKeys200,
	GetAIObservabilityFieldsKeysParams,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType } from '../../../generatedAPIInstance';

/**
 * This endpoint returns the field keys the AI observability explorer can filter on, including the computed per-trace aggregates
 * @summary Get AI observability field keys
 */
export const getAIObservabilityFieldsKeys = (
	params?: GetAIObservabilityFieldsKeysParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetAIObservabilityFieldsKeys200>({
		url: `/api/v1/ai_observability/fields/keys`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetAIObservabilityFieldsKeysQueryKey = (
	params?: GetAIObservabilityFieldsKeysParams,
) => {
	return [
		`/api/v1/ai_observability/fields/keys`,
		...(params ? [params] : []),
	] as const;
};

export const getGetAIObservabilityFieldsKeysQueryOptions = <
	TData = Awaited<ReturnType<typeof getAIObservabilityFieldsKeys>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: GetAIObservabilityFieldsKeysParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getAIObservabilityFieldsKeys>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetAIObservabilityFieldsKeysQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getAIObservabilityFieldsKeys>>
	> = ({ signal }) => getAIObservabilityFieldsKeys(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getAIObservabilityFieldsKeys>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetAIObservabilityFieldsKeysQueryResult = NonNullable<
	Awaited<ReturnType<typeof getAIObservabilityFieldsKeys>>
>;
export type GetAIObservabilityFieldsKeysQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get AI observability field keys
 */

export function useGetAIObservabilityFieldsKeys<
	TData = Awaited<ReturnType<typeof getAIObservabilityFieldsKeys>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: GetAIObservabilityFieldsKeysParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getAIObservabilityFieldsKeys>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetAIObservabilityFieldsKeysQueryOptions(
		params,
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get AI observability field keys
 */
export const invalidateGetAIObservabilityFieldsKeys = async (
	queryClient: QueryClient,
	params?: GetAIObservabilityFieldsKeysParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetAIObservabilityFieldsKeysQueryKey(params) },
		options,
	);

	return queryClient;
};
