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
	GetMyOrganization200,
	RenderErrorResponseDTO,
	TypesOrganizationDTO,
} from '../sigNoz.schemas';

type AwaitedInput<T> = PromiseLike<T> | T;

type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

/**
 * This endpoint returns the organization I belong to
 * @summary Get my organization
 */
export const getMyOrganization = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetMyOrganization200>({
		url: `/api/v2/orgs/me`,
		method: 'GET',
		signal,
	});
};

export const getGetMyOrganizationQueryKey = () => {
	return ['getMyOrganization'] as const;
};

export const getGetMyOrganizationQueryOptions = <
	TData = Awaited<ReturnType<typeof getMyOrganization>>,
	TError = RenderErrorResponseDTO
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getMyOrganization>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetMyOrganizationQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getMyOrganization>>
	> = ({ signal }) => getMyOrganization(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getMyOrganization>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetMyOrganizationQueryResult = NonNullable<
	Awaited<ReturnType<typeof getMyOrganization>>
>;
export type GetMyOrganizationQueryError = RenderErrorResponseDTO;

/**
 * @summary Get my organization
 */

export function useGetMyOrganization<
	TData = Awaited<ReturnType<typeof getMyOrganization>>,
	TError = RenderErrorResponseDTO
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getMyOrganization>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMyOrganizationQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get my organization
 */
export const invalidateGetMyOrganization = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMyOrganizationQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint updates the organization I belong to
 * @summary Update my organization
 */
export const updateMyOrganization = (
	typesOrganizationDTO: TypesOrganizationDTO,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/orgs/me`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: typesOrganizationDTO,
	});
};

export const getUpdateMyOrganizationMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMyOrganization>>,
		TError,
		{ data: TypesOrganizationDTO },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateMyOrganization>>,
	TError,
	{ data: TypesOrganizationDTO },
	TContext
> => {
	const mutationKey = ['updateMyOrganization'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateMyOrganization>>,
		{ data: TypesOrganizationDTO }
	> = (props) => {
		const { data } = props ?? {};

		return updateMyOrganization(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateMyOrganizationMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateMyOrganization>>
>;
export type UpdateMyOrganizationMutationBody = TypesOrganizationDTO;
export type UpdateMyOrganizationMutationError = RenderErrorResponseDTO;

/**
 * @summary Update my organization
 */
export const useUpdateMyOrganization = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMyOrganization>>,
		TError,
		{ data: TypesOrganizationDTO },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateMyOrganization>>,
	TError,
	{ data: TypesOrganizationDTO },
	TContext
> => {
	const mutationOptions = getUpdateMyOrganizationMutationOptions(options);

	return useMutation(mutationOptions);
};
