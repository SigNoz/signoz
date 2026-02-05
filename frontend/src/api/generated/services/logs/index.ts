/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'yarn generate:api'
 * SigNoz
 */
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
import { useMutation, useQuery } from 'react-query';

import { GeneratedAPIInstance } from '../../../index';
import type {
	ListPromotedAndIndexedPaths200,
	PromotetypesPromotePathDTO,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

type AwaitedInput<T> = PromiseLike<T> | T;

type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

/**
 * This endpoints promotes and indexes paths
 * @summary Promote and index paths
 */
export const listPromotedAndIndexedPaths = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListPromotedAndIndexedPaths200>({
		url: `/api/v1/logs/promote_paths`,
		method: 'GET',
		signal,
	});
};

export const getListPromotedAndIndexedPathsQueryKey = () => {
	return ['listPromotedAndIndexedPaths'] as const;
};

export const getListPromotedAndIndexedPathsQueryOptions = <
	TData = Awaited<ReturnType<typeof listPromotedAndIndexedPaths>>,
	TError = RenderErrorResponseDTO
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listPromotedAndIndexedPaths>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getListPromotedAndIndexedPathsQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listPromotedAndIndexedPaths>>
	> = ({ signal }) => listPromotedAndIndexedPaths(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listPromotedAndIndexedPaths>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListPromotedAndIndexedPathsQueryResult = NonNullable<
	Awaited<ReturnType<typeof listPromotedAndIndexedPaths>>
>;
export type ListPromotedAndIndexedPathsQueryError = RenderErrorResponseDTO;

/**
 * @summary Promote and index paths
 */

export function useListPromotedAndIndexedPaths<
	TData = Awaited<ReturnType<typeof listPromotedAndIndexedPaths>>,
	TError = RenderErrorResponseDTO
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listPromotedAndIndexedPaths>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListPromotedAndIndexedPathsQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Promote and index paths
 */
export const invalidateListPromotedAndIndexedPaths = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListPromotedAndIndexedPathsQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoints promotes and indexes paths
 * @summary Promote and index paths
 */
export const handlePromoteAndIndexPaths = (
	promotetypesPromotePathDTONull: PromotetypesPromotePathDTO[] | null,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/logs/promote_paths`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: promotetypesPromotePathDTONull,
		signal,
	});
};

export const getHandlePromoteAndIndexPathsMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof handlePromoteAndIndexPaths>>,
		TError,
		{ data: PromotetypesPromotePathDTO[] | null },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof handlePromoteAndIndexPaths>>,
	TError,
	{ data: PromotetypesPromotePathDTO[] | null },
	TContext
> => {
	const mutationKey = ['handlePromoteAndIndexPaths'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof handlePromoteAndIndexPaths>>,
		{ data: PromotetypesPromotePathDTO[] | null }
	> = (props) => {
		const { data } = props ?? {};

		return handlePromoteAndIndexPaths(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type HandlePromoteAndIndexPathsMutationResult = NonNullable<
	Awaited<ReturnType<typeof handlePromoteAndIndexPaths>>
>;
export type HandlePromoteAndIndexPathsMutationBody =
	| PromotetypesPromotePathDTO[]
	| null;
export type HandlePromoteAndIndexPathsMutationError = RenderErrorResponseDTO;

/**
 * @summary Promote and index paths
 */
export const useHandlePromoteAndIndexPaths = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof handlePromoteAndIndexPaths>>,
		TError,
		{ data: PromotetypesPromotePathDTO[] | null },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof handlePromoteAndIndexPaths>>,
	TError,
	{ data: PromotetypesPromotePathDTO[] | null },
	TContext
> => {
	const mutationOptions = getHandlePromoteAndIndexPathsMutationOptions(options);

	return useMutation(mutationOptions);
};
