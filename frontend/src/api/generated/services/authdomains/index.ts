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
	AuthtypesPostableAuthDomainDTO,
	AuthtypesUpdateableAuthDomainDTO,
	CreateAuthDomain200,
	DeleteAuthDomainPathParameters,
	ListAuthDomains200,
	RenderErrorResponseDTO,
	UpdateAuthDomainPathParameters,
} from '../sigNoz.schemas';

/**
 * This endpoint lists all auth domains
 * @summary List all auth domains
 */
export const listAuthDomains = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListAuthDomains200>({
		url: `/api/v1/domains`,
		method: 'GET',
		signal,
	});
};

export const getListAuthDomainsQueryKey = () => {
	return [`/api/v1/domains`] as const;
};

export const getListAuthDomainsQueryOptions = <
	TData = Awaited<ReturnType<typeof listAuthDomains>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listAuthDomains>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListAuthDomainsQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof listAuthDomains>>> = ({
		signal,
	}) => listAuthDomains(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listAuthDomains>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListAuthDomainsQueryResult = NonNullable<
	Awaited<ReturnType<typeof listAuthDomains>>
>;
export type ListAuthDomainsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List all auth domains
 */

export function useListAuthDomains<
	TData = Awaited<ReturnType<typeof listAuthDomains>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listAuthDomains>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListAuthDomainsQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List all auth domains
 */
export const invalidateListAuthDomains = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListAuthDomainsQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates an auth domain
 * @summary Create auth domain
 */
export const createAuthDomain = (
	authtypesPostableAuthDomainDTO: BodyType<AuthtypesPostableAuthDomainDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateAuthDomain200>({
		url: `/api/v1/domains`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: authtypesPostableAuthDomainDTO,
		signal,
	});
};

export const getCreateAuthDomainMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createAuthDomain>>,
		TError,
		{ data: BodyType<AuthtypesPostableAuthDomainDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createAuthDomain>>,
	TError,
	{ data: BodyType<AuthtypesPostableAuthDomainDTO> },
	TContext
> => {
	const mutationKey = ['createAuthDomain'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createAuthDomain>>,
		{ data: BodyType<AuthtypesPostableAuthDomainDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createAuthDomain(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateAuthDomainMutationResult = NonNullable<
	Awaited<ReturnType<typeof createAuthDomain>>
>;
export type CreateAuthDomainMutationBody = BodyType<AuthtypesPostableAuthDomainDTO>;
export type CreateAuthDomainMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create auth domain
 */
export const useCreateAuthDomain = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createAuthDomain>>,
		TError,
		{ data: BodyType<AuthtypesPostableAuthDomainDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createAuthDomain>>,
	TError,
	{ data: BodyType<AuthtypesPostableAuthDomainDTO> },
	TContext
> => {
	const mutationOptions = getCreateAuthDomainMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint deletes an auth domain
 * @summary Delete auth domain
 */
export const deleteAuthDomain = ({ id }: DeleteAuthDomainPathParameters) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/domains/${id}`,
		method: 'DELETE',
	});
};

export const getDeleteAuthDomainMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteAuthDomain>>,
		TError,
		{ pathParams: DeleteAuthDomainPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteAuthDomain>>,
	TError,
	{ pathParams: DeleteAuthDomainPathParameters },
	TContext
> => {
	const mutationKey = ['deleteAuthDomain'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteAuthDomain>>,
		{ pathParams: DeleteAuthDomainPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteAuthDomain(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteAuthDomainMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteAuthDomain>>
>;

export type DeleteAuthDomainMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete auth domain
 */
export const useDeleteAuthDomain = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteAuthDomain>>,
		TError,
		{ pathParams: DeleteAuthDomainPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteAuthDomain>>,
	TError,
	{ pathParams: DeleteAuthDomainPathParameters },
	TContext
> => {
	const mutationOptions = getDeleteAuthDomainMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint updates an auth domain
 * @summary Update auth domain
 */
export const updateAuthDomain = (
	{ id }: UpdateAuthDomainPathParameters,
	authtypesUpdateableAuthDomainDTO: BodyType<AuthtypesUpdateableAuthDomainDTO>,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/domains/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: authtypesUpdateableAuthDomainDTO,
	});
};

export const getUpdateAuthDomainMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateAuthDomain>>,
		TError,
		{
			pathParams: UpdateAuthDomainPathParameters;
			data: BodyType<AuthtypesUpdateableAuthDomainDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateAuthDomain>>,
	TError,
	{
		pathParams: UpdateAuthDomainPathParameters;
		data: BodyType<AuthtypesUpdateableAuthDomainDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateAuthDomain'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateAuthDomain>>,
		{
			pathParams: UpdateAuthDomainPathParameters;
			data: BodyType<AuthtypesUpdateableAuthDomainDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateAuthDomain(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateAuthDomainMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateAuthDomain>>
>;
export type UpdateAuthDomainMutationBody = BodyType<AuthtypesUpdateableAuthDomainDTO>;
export type UpdateAuthDomainMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update auth domain
 */
export const useUpdateAuthDomain = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateAuthDomain>>,
		TError,
		{
			pathParams: UpdateAuthDomainPathParameters;
			data: BodyType<AuthtypesUpdateableAuthDomainDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateAuthDomain>>,
	TError,
	{
		pathParams: UpdateAuthDomainPathParameters;
		data: BodyType<AuthtypesUpdateableAuthDomainDTO>;
	},
	TContext
> => {
	const mutationOptions = getUpdateAuthDomainMutationOptions(options);

	return useMutation(mutationOptions);
};
