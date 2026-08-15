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
	GetAIObservabilityFieldsValues200,
	GetAIObservabilityFieldsValuesParams,
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

/**
 * This endpoint returns the values the AI observability explorer can filter a field key on
 * @summary Get AI observability field values
 */
export const getAIObservabilityFieldsValues = (
	params?: GetAIObservabilityFieldsValuesParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetAIObservabilityFieldsValues200>({
		url: `/api/v1/ai_observability/fields/values`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetAIObservabilityFieldsValuesQueryKey = (
	params?: GetAIObservabilityFieldsValuesParams,
) => {
	return [
		`/api/v1/ai_observability/fields/values`,
		...(params ? [params] : []),
	] as const;
};

export const getGetAIObservabilityFieldsValuesQueryOptions = <
	TData = Awaited<ReturnType<typeof getAIObservabilityFieldsValues>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: GetAIObservabilityFieldsValuesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getAIObservabilityFieldsValues>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetAIObservabilityFieldsValuesQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getAIObservabilityFieldsValues>>
	> = ({ signal }) => getAIObservabilityFieldsValues(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getAIObservabilityFieldsValues>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetAIObservabilityFieldsValuesQueryResult = NonNullable<
	Awaited<ReturnType<typeof getAIObservabilityFieldsValues>>
>;
export type GetAIObservabilityFieldsValuesQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get AI observability field values
 */

export function useGetAIObservabilityFieldsValues<
	TData = Awaited<ReturnType<typeof getAIObservabilityFieldsValues>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: GetAIObservabilityFieldsValuesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getAIObservabilityFieldsValues>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetAIObservabilityFieldsValuesQueryOptions(
		params,
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get AI observability field values
 */
export const invalidateGetAIObservabilityFieldsValues = async (
	queryClient: QueryClient,
	params?: GetAIObservabilityFieldsValuesParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetAIObservabilityFieldsValuesQueryKey(params) },
		options,
	);

	return queryClient;
};
