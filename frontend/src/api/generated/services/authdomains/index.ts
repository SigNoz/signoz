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

import type { AuthtypesPostableAuthDomainDTO } from '../sigNoz.schemas/authtypesPostableAuthDomainDTO';

import type { AuthtypesUpdatableAuthDomainDTO } from '../sigNoz.schemas/authtypesUpdatableAuthDomainDTO';

import type { CreateAuthDomain201 } from '../sigNoz.schemas/createAuthDomain201';

import type { DeleteAuthDomainPathParameters } from '../sigNoz.schemas/deleteAuthDomainPathParameters';

import type { GetAuthDomain200 } from '../sigNoz.schemas/getAuthDomain200';

import type { GetAuthDomainPathParameters } from '../sigNoz.schemas/getAuthDomainPathParameters';

import type { ListAuthDomains200 } from '../sigNoz.schemas/listAuthDomains200';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

import type { UpdateAuthDomainPathParameters } from '../sigNoz.schemas/updateAuthDomainPathParameters';

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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListAuthDomains} query
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

export const getCreateAuthDomainMutationKey = () =>
	['createAuthDomain'] as const;

export const getCreateAuthDomainMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createAuthDomain>>,
		TError,
		CreateAuthDomainMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createAuthDomain>>,
	TError,
	CreateAuthDomainMutationVariables,
	TContext
> => {
	const mutationKey = getCreateAuthDomainMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createAuthDomain>>,
		CreateAuthDomainMutationVariables
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
export type CreateAuthDomainMutationVariables = {
	data?: BodyType<AuthtypesPostableAuthDomainDTO>;
};

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
		CreateAuthDomainMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createAuthDomain>>,
	TError,
	CreateAuthDomainMutationVariables,
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

export const getDeleteAuthDomainMutationKey = () =>
	['deleteAuthDomain'] as const;

export const getDeleteAuthDomainMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteAuthDomain>>,
		TError,
		DeleteAuthDomainMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteAuthDomain>>,
	TError,
	DeleteAuthDomainMutationVariables,
	TContext
> => {
	const mutationKey = getDeleteAuthDomainMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteAuthDomain>>,
		DeleteAuthDomainMutationVariables
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
export type DeleteAuthDomainMutationVariables = {
	pathParams: DeleteAuthDomainPathParameters;
};

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
		DeleteAuthDomainMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteAuthDomain>>,
	TError,
	DeleteAuthDomainMutationVariables,
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
		enabled: id !== null && id !== undefined,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetAuthDomain} query
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

export const getUpdateAuthDomainMutationKey = () =>
	['updateAuthDomain'] as const;

export const getUpdateAuthDomainMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateAuthDomain>>,
		TError,
		UpdateAuthDomainMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateAuthDomain>>,
	TError,
	UpdateAuthDomainMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateAuthDomainMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateAuthDomain>>,
		UpdateAuthDomainMutationVariables
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
export type UpdateAuthDomainMutationVariables = {
	pathParams: UpdateAuthDomainPathParameters;
	data?: BodyType<AuthtypesUpdatableAuthDomainDTO>;
};

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
		UpdateAuthDomainMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateAuthDomain>>,
	TError,
	UpdateAuthDomainMutationVariables,
	TContext
> => {
	return useMutation(getUpdateAuthDomainMutationOptions(options));
};
