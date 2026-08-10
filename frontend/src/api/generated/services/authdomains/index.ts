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
	AuthtypesPatchableAuthDomainDTO,
	AuthtypesPostableAuthDomainDTO,
	AuthtypesUpdatableAuthDomainDTO,
	CreateAuthDomain201,
	DeleteAuthDomainPathParameters,
	GetAuthDomain200,
	GetAuthDomainPathParameters,
	ListAuthDomains200,
	PatchAuthDomainPathParameters,
	RenderErrorResponseDTO,
	UpdateAuthDomainPathParameters,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * This endpoint lists all auth domains
 * @summary List all auth domains
 */
export const listAuthDomains = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListAuthDomains200>({
		url: `/api/v2/auth_domains`,
		method: 'GET',
		signal,
	});
};

export const getListAuthDomainsQueryKey = () => {
	return [`/api/v2/auth_domains`] as const;
};

export const getListAuthDomainsQueryOptions = <
	TData = Awaited<ReturnType<typeof listAuthDomains>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return { ...query, queryKey: queryOptions.queryKey };
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
	authtypesPostableAuthDomainDTO?: BodyType<AuthtypesPostableAuthDomainDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateAuthDomain201>({
		url: `/api/v2/auth_domains`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: authtypesPostableAuthDomainDTO,
		signal,
	});
};

export const getCreateAuthDomainMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createAuthDomain>>,
		TError,
		{ data?: BodyType<AuthtypesPostableAuthDomainDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createAuthDomain>>,
	TError,
	{ data?: BodyType<AuthtypesPostableAuthDomainDTO> },
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
		{ data?: BodyType<AuthtypesPostableAuthDomainDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createAuthDomain(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateAuthDomainMutationResult = NonNullable<
	Awaited<ReturnType<typeof createAuthDomain>>
>;
export type CreateAuthDomainMutationBody =
	| BodyType<AuthtypesPostableAuthDomainDTO>
	| undefined;
export type CreateAuthDomainMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create auth domain
 */
export const useCreateAuthDomain = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createAuthDomain>>,
		TError,
		{ data?: BodyType<AuthtypesPostableAuthDomainDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createAuthDomain>>,
	TError,
	{ data?: BodyType<AuthtypesPostableAuthDomainDTO> },
	TContext
> => {
	return useMutation(getCreateAuthDomainMutationOptions(options));
};
/**
 * This endpoint deletes an auth domain
 * @summary Delete auth domain
 */
export const deleteAuthDomain = (
	{ id }: DeleteAuthDomainPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/auth_domains/${id}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteAuthDomainMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
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
	TContext = unknown,
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
	return useMutation(getDeleteAuthDomainMutationOptions(options));
};
/**
 * This endpoint returns an auth domain by ID
 * @summary Get auth domain by ID
 */
export const getAuthDomain = (
	{ id }: GetAuthDomainPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetAuthDomain200>({
		url: `/api/v2/auth_domains/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetAuthDomainQueryKey = ({
	id,
}: GetAuthDomainPathParameters) => {
	return [`/api/v2/auth_domains/${id}`] as const;
};

export const getGetAuthDomainQueryOptions = <
	TData = Awaited<ReturnType<typeof getAuthDomain>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetAuthDomainPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getAuthDomain>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetAuthDomainQueryKey({ id });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getAuthDomain>>> = ({
		signal,
	}) => getAuthDomain({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getAuthDomain>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetAuthDomainQueryResult = NonNullable<
	Awaited<ReturnType<typeof getAuthDomain>>
>;
export type GetAuthDomainQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get auth domain by ID
 */

export function useGetAuthDomain<
	TData = Awaited<ReturnType<typeof getAuthDomain>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetAuthDomainPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getAuthDomain>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetAuthDomainQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get auth domain by ID
 */
export const invalidateGetAuthDomain = async (
	queryClient: QueryClient,
	{ id }: GetAuthDomainPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetAuthDomainQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint patches an auth domain, toggling whether SSO is enforced without rewriting the provider configuration
 * @summary Patch auth domain
 */
export const patchAuthDomain = (
	{ id }: PatchAuthDomainPathParameters,
	authtypesPatchableAuthDomainDTO?: BodyType<AuthtypesPatchableAuthDomainDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/auth_domains/${id}`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		data: authtypesPatchableAuthDomainDTO,
		signal,
	});
};

export const getPatchAuthDomainMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof patchAuthDomain>>,
		TError,
		{
			pathParams: PatchAuthDomainPathParameters;
			data?: BodyType<AuthtypesPatchableAuthDomainDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof patchAuthDomain>>,
	TError,
	{
		pathParams: PatchAuthDomainPathParameters;
		data?: BodyType<AuthtypesPatchableAuthDomainDTO>;
	},
	TContext
> => {
	const mutationKey = ['patchAuthDomain'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof patchAuthDomain>>,
		{
			pathParams: PatchAuthDomainPathParameters;
			data?: BodyType<AuthtypesPatchableAuthDomainDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return patchAuthDomain(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type PatchAuthDomainMutationResult = NonNullable<
	Awaited<ReturnType<typeof patchAuthDomain>>
>;
export type PatchAuthDomainMutationBody =
	| BodyType<AuthtypesPatchableAuthDomainDTO>
	| undefined;
export type PatchAuthDomainMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Patch auth domain
 */
export const usePatchAuthDomain = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof patchAuthDomain>>,
		TError,
		{
			pathParams: PatchAuthDomainPathParameters;
			data?: BodyType<AuthtypesPatchableAuthDomainDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof patchAuthDomain>>,
	TError,
	{
		pathParams: PatchAuthDomainPathParameters;
		data?: BodyType<AuthtypesPatchableAuthDomainDTO>;
	},
	TContext
> => {
	return useMutation(getPatchAuthDomainMutationOptions(options));
};
/**
 * This endpoint updates an auth domain
 * @summary Update auth domain
 */
export const updateAuthDomain = (
	{ id }: UpdateAuthDomainPathParameters,
	authtypesUpdatableAuthDomainDTO?: BodyType<AuthtypesUpdatableAuthDomainDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/auth_domains/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: authtypesUpdatableAuthDomainDTO,
		signal,
	});
};

export const getUpdateAuthDomainMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateAuthDomain>>,
		TError,
		{
			pathParams: UpdateAuthDomainPathParameters;
			data?: BodyType<AuthtypesUpdatableAuthDomainDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateAuthDomain>>,
	TError,
	{
		pathParams: UpdateAuthDomainPathParameters;
		data?: BodyType<AuthtypesUpdatableAuthDomainDTO>;
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
			data?: BodyType<AuthtypesUpdatableAuthDomainDTO>;
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
export type UpdateAuthDomainMutationBody =
	| BodyType<AuthtypesUpdatableAuthDomainDTO>
	| undefined;
export type UpdateAuthDomainMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update auth domain
 */
export const useUpdateAuthDomain = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateAuthDomain>>,
		TError,
		{
			pathParams: UpdateAuthDomainPathParameters;
			data?: BodyType<AuthtypesUpdatableAuthDomainDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateAuthDomain>>,
	TError,
	{
		pathParams: UpdateAuthDomainPathParameters;
		data?: BodyType<AuthtypesUpdatableAuthDomainDTO>;
	},
	TContext
> => {
	return useMutation(getUpdateAuthDomainMutationOptions(options));
};
