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

import type { BodyType, ErrorType } from '../../../generatedAPIInstance';
import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type {
	AuthtypesTransactionDTO,
	AuthzCheck200,
	AuthzResources200,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

/**
 * Checks if the authenticated user has permissions for given transactions
 * @summary Check permissions
 */
export const authzCheck = (
	authtypesTransactionDTO: BodyType<AuthtypesTransactionDTO[]>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<AuthzCheck200>({
		url: `/api/v1/authz/check`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: authtypesTransactionDTO,
		signal,
	});
};

export const getAuthzCheckMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof authzCheck>>,
		TError,
		{ data: BodyType<AuthtypesTransactionDTO[]> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof authzCheck>>,
	TError,
	{ data: BodyType<AuthtypesTransactionDTO[]> },
	TContext
> => {
	const mutationKey = ['authzCheck'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof authzCheck>>,
		{ data: BodyType<AuthtypesTransactionDTO[]> }
	> = (props) => {
		const { data } = props ?? {};

		return authzCheck(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type AuthzCheckMutationResult = NonNullable<
	Awaited<ReturnType<typeof authzCheck>>
>;
export type AuthzCheckMutationBody = BodyType<AuthtypesTransactionDTO[]>;
export type AuthzCheckMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Check permissions
 */
export const useAuthzCheck = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof authzCheck>>,
		TError,
		{ data: BodyType<AuthtypesTransactionDTO[]> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof authzCheck>>,
	TError,
	{ data: BodyType<AuthtypesTransactionDTO[]> },
	TContext
> => {
	const mutationOptions = getAuthzCheckMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Gets all the available resources
 * @summary Get resources
 */
export const authzResources = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<AuthzResources200>({
		url: `/api/v1/authz/resources`,
		method: 'GET',
		signal,
	});
};

export const getAuthzResourcesQueryKey = () => {
	return [`/api/v1/authz/resources`] as const;
};

export const getAuthzResourcesQueryOptions = <
	TData = Awaited<ReturnType<typeof authzResources>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof authzResources>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getAuthzResourcesQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof authzResources>>> = ({
		signal,
	}) => authzResources(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof authzResources>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type AuthzResourcesQueryResult = NonNullable<
	Awaited<ReturnType<typeof authzResources>>
>;
export type AuthzResourcesQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get resources
 */

export function useAuthzResources<
	TData = Awaited<ReturnType<typeof authzResources>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof authzResources>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getAuthzResourcesQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get resources
 */
export const invalidateAuthzResources = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getAuthzResourcesQueryKey() },
		options,
	);

	return queryClient;
};
