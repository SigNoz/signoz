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
	GetFieldsKeys200,
	GetFieldsKeysParams,
	GetFieldsValues200,
	GetFieldsValuesParams,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

type AwaitedInput<T> = PromiseLike<T> | T;

type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

/**
 * This endpoint returns field keys
 * @summary Get field keys
 */
export const getFieldsKeys = (
	params?: GetFieldsKeysParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetFieldsKeys200>({
		url: `/api/v1/fields/keys`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetFieldsKeysQueryKey = (params?: GetFieldsKeysParams) => {
	return ['getFieldsKeys', ...(params ? [params] : [])] as const;
};

export const getGetFieldsKeysQueryOptions = <
	TData = Awaited<ReturnType<typeof getFieldsKeys>>,
	TError = RenderErrorResponseDTO
>(
	params?: GetFieldsKeysParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getFieldsKeys>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetFieldsKeysQueryKey(params);

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getFieldsKeys>>> = ({
		signal,
	}) => getFieldsKeys(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getFieldsKeys>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetFieldsKeysQueryResult = NonNullable<
	Awaited<ReturnType<typeof getFieldsKeys>>
>;
export type GetFieldsKeysQueryError = RenderErrorResponseDTO;

/**
 * @summary Get field keys
 */

export function useGetFieldsKeys<
	TData = Awaited<ReturnType<typeof getFieldsKeys>>,
	TError = RenderErrorResponseDTO
>(
	params?: GetFieldsKeysParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getFieldsKeys>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetFieldsKeysQueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get field keys
 */
export const invalidateGetFieldsKeys = async (
	queryClient: QueryClient,
	params?: GetFieldsKeysParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetFieldsKeysQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint returns field values
 * @summary Get field values
 */
export const getFieldsValues = (
	params?: GetFieldsValuesParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetFieldsValues200>({
		url: `/api/v1/fields/values`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetFieldsValuesQueryKey = (params?: GetFieldsValuesParams) => {
	return ['getFieldsValues', ...(params ? [params] : [])] as const;
};

export const getGetFieldsValuesQueryOptions = <
	TData = Awaited<ReturnType<typeof getFieldsValues>>,
	TError = RenderErrorResponseDTO
>(
	params?: GetFieldsValuesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getFieldsValues>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetFieldsValuesQueryKey(params);

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getFieldsValues>>> = ({
		signal,
	}) => getFieldsValues(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getFieldsValues>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetFieldsValuesQueryResult = NonNullable<
	Awaited<ReturnType<typeof getFieldsValues>>
>;
export type GetFieldsValuesQueryError = RenderErrorResponseDTO;

/**
 * @summary Get field values
 */

export function useGetFieldsValues<
	TData = Awaited<ReturnType<typeof getFieldsValues>>,
	TError = RenderErrorResponseDTO
>(
	params?: GetFieldsValuesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getFieldsValues>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetFieldsValuesQueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get field values
 */
export const invalidateGetFieldsValues = async (
	queryClient: QueryClient,
	params?: GetFieldsValuesParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetFieldsValuesQueryKey(params) },
		options,
	);

	return queryClient;
};
