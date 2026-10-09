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

import type {
	ListPromotedPaths200,
	ListPromotedPathsParams,
	PromotetypesPromotePathDTO,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

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
 * This endpoint lists the promoted paths of every JSON column, each annotated with its signal and context. The signal, context, promoted and indexes query parameters filter the listing.
 * @summary List promoted paths
 */
export const listPromotedPaths = (
	params?: ListPromotedPathsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListPromotedPaths200>({
		url: `/api/v1/promoted_paths`,
		method: 'GET',
		params,
		signal,
	});
};

export const getListPromotedPathsQueryKey = (
	params?: ListPromotedPathsParams,
) => {
	return [`/api/v1/promoted_paths`, ...(params ? [params] : [])] as const;
};

export const getListPromotedPathsQueryOptions = <
	TData = Awaited<ReturnType<typeof listPromotedPaths>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: ListPromotedPathsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listPromotedPaths>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getListPromotedPathsQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listPromotedPaths>>
	> = ({ signal }) => listPromotedPaths(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listPromotedPaths>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListPromotedPathsQueryResult = NonNullable<
	Awaited<ReturnType<typeof listPromotedPaths>>
>;
export type ListPromotedPathsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List promoted paths
 */

export function useListPromotedPaths<
	TData = Awaited<ReturnType<typeof listPromotedPaths>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: ListPromotedPathsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listPromotedPaths>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListPromotedPathsQueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary List promoted paths
 */
export const invalidateListPromotedPaths = async (
	queryClient: QueryClient,
	params?: ListPromotedPathsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListPromotedPathsQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint promotes paths of JSON columns to their promoted columns. Each path names its promotion target with its signal and context, e.g. traces/attribute.
 * @summary Promote paths
 */
export const promotePaths = (
	promotetypesPromotePathDTONull?: BodyType<
		PromotetypesPromotePathDTO[] | null
	> | null,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/promoted_paths`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: promotetypesPromotePathDTONull,
		signal,
	});
};

export const getPromotePathsMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof promotePaths>>,
		TError,
		{ data?: BodyType<PromotetypesPromotePathDTO[] | null> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof promotePaths>>,
	TError,
	{ data?: BodyType<PromotetypesPromotePathDTO[] | null> },
	TContext
> => {
	const mutationKey = ['promotePaths'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof promotePaths>>,
		{ data?: BodyType<PromotetypesPromotePathDTO[] | null> }
	> = (props) => {
		const { data } = props ?? {};

		return promotePaths(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type PromotePathsMutationResult = NonNullable<
	Awaited<ReturnType<typeof promotePaths>>
>;
export type PromotePathsMutationBody =
	| BodyType<PromotetypesPromotePathDTO[] | null>
	| undefined;
export type PromotePathsMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Promote paths
 */
export const usePromotePaths = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof promotePaths>>,
		TError,
		{ data?: BodyType<PromotetypesPromotePathDTO[] | null> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof promotePaths>>,
	TError,
	{ data?: BodyType<PromotetypesPromotePathDTO[] | null> },
	TContext
> => {
	return useMutation(getPromotePathsMutationOptions(options));
};
