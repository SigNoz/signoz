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

import type { CreateServiceAccount201 } from '../sigNoz.schemas/createServiceAccount201';

import type { CreateServiceAccountKey201 } from '../sigNoz.schemas/createServiceAccountKey201';

import type { CreateServiceAccountKeyPathParameters } from '../sigNoz.schemas/createServiceAccountKeyPathParameters';

import type { CreateServiceAccountRole201 } from '../sigNoz.schemas/createServiceAccountRole201';

import type { DeleteServiceAccountPathParameters } from '../sigNoz.schemas/deleteServiceAccountPathParameters';

import type { DeleteServiceAccountRolePathParameters } from '../sigNoz.schemas/deleteServiceAccountRolePathParameters';

import type { GetMyServiceAccount200 } from '../sigNoz.schemas/getMyServiceAccount200';

import type { GetServiceAccount200 } from '../sigNoz.schemas/getServiceAccount200';

import type { GetServiceAccountPathParameters } from '../sigNoz.schemas/getServiceAccountPathParameters';

import type { GetServiceAccountRole200 } from '../sigNoz.schemas/getServiceAccountRole200';

import type { GetServiceAccountRolePathParameters } from '../sigNoz.schemas/getServiceAccountRolePathParameters';

import type { GetServiceAccountRoles200 } from '../sigNoz.schemas/getServiceAccountRoles200';

import type { GetServiceAccountRolesPathParameters } from '../sigNoz.schemas/getServiceAccountRolesPathParameters';

import type { ListServiceAccountKeys200 } from '../sigNoz.schemas/listServiceAccountKeys200';

import type { ListServiceAccountKeysPathParameters } from '../sigNoz.schemas/listServiceAccountKeysPathParameters';

import type { ListServiceAccounts200 } from '../sigNoz.schemas/listServiceAccounts200';

import type { ListServiceAccountsParams } from '../sigNoz.schemas/listServiceAccountsParams';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

import type { RevokeServiceAccountKeyPathParameters } from '../sigNoz.schemas/revokeServiceAccountKeyPathParameters';

import type { ServiceaccounttypesPostableFactorAPIKeyDTO } from '../sigNoz.schemas/serviceaccounttypesPostableFactorAPIKeyDTO';

import type { ServiceaccounttypesPostableServiceAccountDTO } from '../sigNoz.schemas/serviceaccounttypesPostableServiceAccountDTO';

import type { ServiceaccounttypesPostableServiceAccountRoleDTO } from '../sigNoz.schemas/serviceaccounttypesPostableServiceAccountRoleDTO';

import type { ServiceaccounttypesUpdatableFactorAPIKeyDTO } from '../sigNoz.schemas/serviceaccounttypesUpdatableFactorAPIKeyDTO';

import type { UpdateServiceAccountKeyPathParameters } from '../sigNoz.schemas/updateServiceAccountKeyPathParameters';

import type { UpdateServiceAccountPathParameters } from '../sigNoz.schemas/updateServiceAccountPathParameters';

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
 * This endpoint assigns a role to a service account
 * @summary Create service account role
 */
export const createServiceAccountRole = (
	serviceaccounttypesPostableServiceAccountRoleDTO?: BodyType<ServiceaccounttypesPostableServiceAccountRoleDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateServiceAccountRole201>({
		url: `/api/v1/service_account_roles`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: serviceaccounttypesPostableServiceAccountRoleDTO,
		signal,
	});
};

export const getCreateServiceAccountRoleMutationKey = () =>
	['createServiceAccountRole'] as const;

export const getCreateServiceAccountRoleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createServiceAccountRole>>,
		TError,
		CreateServiceAccountRoleMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createServiceAccountRole>>,
	TError,
	CreateServiceAccountRoleMutationVariables,
	TContext
> => {
	const mutationKey = getCreateServiceAccountRoleMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createServiceAccountRole>>,
		CreateServiceAccountRoleMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return createServiceAccountRole(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateServiceAccountRoleMutationResult = NonNullable<
	Awaited<ReturnType<typeof createServiceAccountRole>>
>;
export type CreateServiceAccountRoleMutationBody =
	| BodyType<ServiceaccounttypesPostableServiceAccountRoleDTO>
	| undefined;
export type CreateServiceAccountRoleMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type CreateServiceAccountRoleMutationVariables = {
	data?: BodyType<ServiceaccounttypesPostableServiceAccountRoleDTO>;
};

/**
 * @summary Create service account role
 */
export const useCreateServiceAccountRole = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createServiceAccountRole>>,
		TError,
		CreateServiceAccountRoleMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createServiceAccountRole>>,
	TError,
	CreateServiceAccountRoleMutationVariables,
	TContext
> => {
	return useMutation(getCreateServiceAccountRoleMutationOptions(options));
};
/**
 * This endpoint revokes a role from a service account
 * @summary Delete service account role
 */
export const deleteServiceAccountRole = (
	{ id }: DeleteServiceAccountRolePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/service_account_roles/${id}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteServiceAccountRoleMutationKey = () =>
	['deleteServiceAccountRole'] as const;

export const getDeleteServiceAccountRoleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteServiceAccountRole>>,
		TError,
		DeleteServiceAccountRoleMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteServiceAccountRole>>,
	TError,
	DeleteServiceAccountRoleMutationVariables,
	TContext
> => {
	const mutationKey = getDeleteServiceAccountRoleMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteServiceAccountRole>>,
		DeleteServiceAccountRoleMutationVariables
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteServiceAccountRole(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteServiceAccountRoleMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteServiceAccountRole>>
>;

export type DeleteServiceAccountRoleMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type DeleteServiceAccountRoleMutationVariables = {
	pathParams: DeleteServiceAccountRolePathParameters;
};

/**
 * @summary Delete service account role
 */
export const useDeleteServiceAccountRole = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteServiceAccountRole>>,
		TError,
		DeleteServiceAccountRoleMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteServiceAccountRole>>,
	TError,
	DeleteServiceAccountRoleMutationVariables,
	TContext
> => {
	return useMutation(getDeleteServiceAccountRoleMutationOptions(options));
};
/**
 * This endpoint gets an existing service account role
 * @summary Get service account role
 */
export const getServiceAccountRole = (
	{ id }: GetServiceAccountRolePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetServiceAccountRole200>({
		url: `/api/v1/service_account_roles/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetServiceAccountRoleQueryKey = ({
	id,
}: GetServiceAccountRolePathParameters) => {
	return [`/api/v1/service_account_roles/${id}`] as const;
};

export const getGetServiceAccountRoleQueryOptions = <
	TData = Awaited<ReturnType<typeof getServiceAccountRole>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetServiceAccountRolePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getServiceAccountRole>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetServiceAccountRoleQueryKey({ id });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getServiceAccountRole>>
	> = ({ signal }) => getServiceAccountRole({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: id !== null && id !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getServiceAccountRole>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetServiceAccountRoleQueryResult = NonNullable<
	Awaited<ReturnType<typeof getServiceAccountRole>>
>;
export type GetServiceAccountRoleQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get service account role
 */

export function useGetServiceAccountRole<
	TData = Awaited<ReturnType<typeof getServiceAccountRole>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetServiceAccountRolePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getServiceAccountRole>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetServiceAccountRoleQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetServiceAccountRole} query
 */
export const invalidateGetServiceAccountRole = async (
	queryClient: QueryClient,
	{ id }: GetServiceAccountRolePathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetServiceAccountRoleQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * Returns a page of the service accounts for an organisation. `query` is a filter expression over name, email, status, created_at and updated_at, for example `status = 'active'`; `sort`/`order` pick the ordering and `limit`/`offset` the page.
 * @summary List service accounts
 */
export const listServiceAccounts = (
	params?: ListServiceAccountsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListServiceAccounts200>({
		url: `/api/v1/service_accounts`,
		method: 'GET',
		params,
		signal,
	});
};

export const getListServiceAccountsQueryKey = (
	params?: ListServiceAccountsParams,
) => {
	return [`/api/v1/service_accounts`, ...(params ? [params] : [])] as const;
};

export const getListServiceAccountsQueryOptions = <
	TData = Awaited<ReturnType<typeof listServiceAccounts>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: ListServiceAccountsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listServiceAccounts>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getListServiceAccountsQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listServiceAccounts>>
	> = ({ signal }) => listServiceAccounts(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listServiceAccounts>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListServiceAccountsQueryResult = NonNullable<
	Awaited<ReturnType<typeof listServiceAccounts>>
>;
export type ListServiceAccountsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List service accounts
 */

export function useListServiceAccounts<
	TData = Awaited<ReturnType<typeof listServiceAccounts>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: ListServiceAccountsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listServiceAccounts>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListServiceAccountsQueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListServiceAccounts} query
 */
export const invalidateListServiceAccounts = async (
	queryClient: QueryClient,
	params?: ListServiceAccountsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListServiceAccountsQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates a service account
 * @summary Create service account
 */
export const createServiceAccount = (
	serviceaccounttypesPostableServiceAccountDTO?: BodyType<ServiceaccounttypesPostableServiceAccountDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateServiceAccount201>({
		url: `/api/v1/service_accounts`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: serviceaccounttypesPostableServiceAccountDTO,
		signal,
	});
};

export const getCreateServiceAccountMutationKey = () =>
	['createServiceAccount'] as const;

export const getCreateServiceAccountMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createServiceAccount>>,
		TError,
		CreateServiceAccountMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createServiceAccount>>,
	TError,
	CreateServiceAccountMutationVariables,
	TContext
> => {
	const mutationKey = getCreateServiceAccountMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createServiceAccount>>,
		CreateServiceAccountMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return createServiceAccount(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateServiceAccountMutationResult = NonNullable<
	Awaited<ReturnType<typeof createServiceAccount>>
>;
export type CreateServiceAccountMutationBody =
	| BodyType<ServiceaccounttypesPostableServiceAccountDTO>
	| undefined;
export type CreateServiceAccountMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type CreateServiceAccountMutationVariables = {
	data?: BodyType<ServiceaccounttypesPostableServiceAccountDTO>;
};

/**
 * @summary Create service account
 */
export const useCreateServiceAccount = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createServiceAccount>>,
		TError,
		CreateServiceAccountMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createServiceAccount>>,
	TError,
	CreateServiceAccountMutationVariables,
	TContext
> => {
	return useMutation(getCreateServiceAccountMutationOptions(options));
};
/**
 * This endpoint deletes an existing service account
 * @summary Deletes a service account
 */
export const deleteServiceAccount = (
	{ id }: DeleteServiceAccountPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/service_accounts/${id}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteServiceAccountMutationKey = () =>
	['deleteServiceAccount'] as const;

export const getDeleteServiceAccountMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteServiceAccount>>,
		TError,
		DeleteServiceAccountMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteServiceAccount>>,
	TError,
	DeleteServiceAccountMutationVariables,
	TContext
> => {
	const mutationKey = getDeleteServiceAccountMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteServiceAccount>>,
		DeleteServiceAccountMutationVariables
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteServiceAccount(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteServiceAccountMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteServiceAccount>>
>;

export type DeleteServiceAccountMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type DeleteServiceAccountMutationVariables = {
	pathParams: DeleteServiceAccountPathParameters;
};

/**
 * @summary Deletes a service account
 */
export const useDeleteServiceAccount = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteServiceAccount>>,
		TError,
		DeleteServiceAccountMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteServiceAccount>>,
	TError,
	DeleteServiceAccountMutationVariables,
	TContext
> => {
	return useMutation(getDeleteServiceAccountMutationOptions(options));
};
/**
 * This endpoint gets an existing service account
 * @summary Gets a service account
 */
export const getServiceAccount = (
	{ id }: GetServiceAccountPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetServiceAccount200>({
		url: `/api/v1/service_accounts/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetServiceAccountQueryKey = ({
	id,
}: GetServiceAccountPathParameters) => {
	return [`/api/v1/service_accounts/${id}`] as const;
};

export const getGetServiceAccountQueryOptions = <
	TData = Awaited<ReturnType<typeof getServiceAccount>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetServiceAccountPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getServiceAccount>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetServiceAccountQueryKey({ id });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getServiceAccount>>
	> = ({ signal }) => getServiceAccount({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: id !== null && id !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getServiceAccount>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetServiceAccountQueryResult = NonNullable<
	Awaited<ReturnType<typeof getServiceAccount>>
>;
export type GetServiceAccountQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Gets a service account
 */

export function useGetServiceAccount<
	TData = Awaited<ReturnType<typeof getServiceAccount>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetServiceAccountPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getServiceAccount>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetServiceAccountQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetServiceAccount} query
 */
export const invalidateGetServiceAccount = async (
	queryClient: QueryClient,
	{ id }: GetServiceAccountPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetServiceAccountQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint updates an existing service account
 * @summary Updates a service account
 */
export const updateServiceAccount = (
	{ id }: UpdateServiceAccountPathParameters,
	serviceaccounttypesPostableServiceAccountDTO?: BodyType<ServiceaccounttypesPostableServiceAccountDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/service_accounts/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: serviceaccounttypesPostableServiceAccountDTO,
		signal,
	});
};

export const getUpdateServiceAccountMutationKey = () =>
	['updateServiceAccount'] as const;

export const getUpdateServiceAccountMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateServiceAccount>>,
		TError,
		UpdateServiceAccountMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateServiceAccount>>,
	TError,
	UpdateServiceAccountMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateServiceAccountMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateServiceAccount>>,
		UpdateServiceAccountMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateServiceAccount(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateServiceAccountMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateServiceAccount>>
>;
export type UpdateServiceAccountMutationBody =
	| BodyType<ServiceaccounttypesPostableServiceAccountDTO>
	| undefined;
export type UpdateServiceAccountMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type UpdateServiceAccountMutationVariables = {
	pathParams: UpdateServiceAccountPathParameters;
	data?: BodyType<ServiceaccounttypesPostableServiceAccountDTO>;
};

/**
 * @summary Updates a service account
 */
export const useUpdateServiceAccount = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateServiceAccount>>,
		TError,
		UpdateServiceAccountMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateServiceAccount>>,
	TError,
	UpdateServiceAccountMutationVariables,
	TContext
> => {
	return useMutation(getUpdateServiceAccountMutationOptions(options));
};
/**
 * This endpoint lists the service account keys
 * @summary List service account keys
 */
export const listServiceAccountKeys = (
	{ id }: ListServiceAccountKeysPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListServiceAccountKeys200>({
		url: `/api/v1/service_accounts/${id}/keys`,
		method: 'GET',
		signal,
	});
};

export const getListServiceAccountKeysQueryKey = ({
	id,
}: ListServiceAccountKeysPathParameters) => {
	return [`/api/v1/service_accounts/${id}/keys`] as const;
};

export const getListServiceAccountKeysQueryOptions = <
	TData = Awaited<ReturnType<typeof listServiceAccountKeys>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: ListServiceAccountKeysPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listServiceAccountKeys>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getListServiceAccountKeysQueryKey({ id });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listServiceAccountKeys>>
	> = ({ signal }) => listServiceAccountKeys({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: id !== null && id !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof listServiceAccountKeys>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListServiceAccountKeysQueryResult = NonNullable<
	Awaited<ReturnType<typeof listServiceAccountKeys>>
>;
export type ListServiceAccountKeysQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List service account keys
 */

export function useListServiceAccountKeys<
	TData = Awaited<ReturnType<typeof listServiceAccountKeys>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: ListServiceAccountKeysPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listServiceAccountKeys>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListServiceAccountKeysQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListServiceAccountKeys} query
 */
export const invalidateListServiceAccountKeys = async (
	queryClient: QueryClient,
	{ id }: ListServiceAccountKeysPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListServiceAccountKeysQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates a service account key
 * @summary Create a service account key
 */
export const createServiceAccountKey = (
	{ id }: CreateServiceAccountKeyPathParameters,
	serviceaccounttypesPostableFactorAPIKeyDTO?: BodyType<ServiceaccounttypesPostableFactorAPIKeyDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateServiceAccountKey201>({
		url: `/api/v1/service_accounts/${id}/keys`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: serviceaccounttypesPostableFactorAPIKeyDTO,
		signal,
	});
};

export const getCreateServiceAccountKeyMutationKey = () =>
	['createServiceAccountKey'] as const;

export const getCreateServiceAccountKeyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createServiceAccountKey>>,
		TError,
		CreateServiceAccountKeyMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createServiceAccountKey>>,
	TError,
	CreateServiceAccountKeyMutationVariables,
	TContext
> => {
	const mutationKey = getCreateServiceAccountKeyMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createServiceAccountKey>>,
		CreateServiceAccountKeyMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return createServiceAccountKey(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateServiceAccountKeyMutationResult = NonNullable<
	Awaited<ReturnType<typeof createServiceAccountKey>>
>;
export type CreateServiceAccountKeyMutationBody =
	| BodyType<ServiceaccounttypesPostableFactorAPIKeyDTO>
	| undefined;
export type CreateServiceAccountKeyMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type CreateServiceAccountKeyMutationVariables = {
	pathParams: CreateServiceAccountKeyPathParameters;
	data?: BodyType<ServiceaccounttypesPostableFactorAPIKeyDTO>;
};

/**
 * @summary Create a service account key
 */
export const useCreateServiceAccountKey = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createServiceAccountKey>>,
		TError,
		CreateServiceAccountKeyMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createServiceAccountKey>>,
	TError,
	CreateServiceAccountKeyMutationVariables,
	TContext
> => {
	return useMutation(getCreateServiceAccountKeyMutationOptions(options));
};
/**
 * This endpoint revokes an existing service account key
 * @summary Revoke a service account key
 */
export const revokeServiceAccountKey = (
	{ id, fid }: RevokeServiceAccountKeyPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/service_accounts/${id}/keys/${fid}`,
		method: 'DELETE',
		signal,
	});
};

export const getRevokeServiceAccountKeyMutationKey = () =>
	['revokeServiceAccountKey'] as const;

export const getRevokeServiceAccountKeyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof revokeServiceAccountKey>>,
		TError,
		RevokeServiceAccountKeyMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof revokeServiceAccountKey>>,
	TError,
	RevokeServiceAccountKeyMutationVariables,
	TContext
> => {
	const mutationKey = getRevokeServiceAccountKeyMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof revokeServiceAccountKey>>,
		RevokeServiceAccountKeyMutationVariables
	> = (props) => {
		const { pathParams } = props ?? {};

		return revokeServiceAccountKey(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type RevokeServiceAccountKeyMutationResult = NonNullable<
	Awaited<ReturnType<typeof revokeServiceAccountKey>>
>;

export type RevokeServiceAccountKeyMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type RevokeServiceAccountKeyMutationVariables = {
	pathParams: RevokeServiceAccountKeyPathParameters;
};

/**
 * @summary Revoke a service account key
 */
export const useRevokeServiceAccountKey = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof revokeServiceAccountKey>>,
		TError,
		RevokeServiceAccountKeyMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof revokeServiceAccountKey>>,
	TError,
	RevokeServiceAccountKeyMutationVariables,
	TContext
> => {
	return useMutation(getRevokeServiceAccountKeyMutationOptions(options));
};
/**
 * This endpoint updates an existing service account key
 * @summary Updates a service account key
 */
export const updateServiceAccountKey = (
	{ id, fid }: UpdateServiceAccountKeyPathParameters,
	serviceaccounttypesUpdatableFactorAPIKeyDTO?: BodyType<ServiceaccounttypesUpdatableFactorAPIKeyDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/service_accounts/${id}/keys/${fid}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: serviceaccounttypesUpdatableFactorAPIKeyDTO,
		signal,
	});
};

export const getUpdateServiceAccountKeyMutationKey = () =>
	['updateServiceAccountKey'] as const;

export const getUpdateServiceAccountKeyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateServiceAccountKey>>,
		TError,
		UpdateServiceAccountKeyMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateServiceAccountKey>>,
	TError,
	UpdateServiceAccountKeyMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateServiceAccountKeyMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateServiceAccountKey>>,
		UpdateServiceAccountKeyMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateServiceAccountKey(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateServiceAccountKeyMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateServiceAccountKey>>
>;
export type UpdateServiceAccountKeyMutationBody =
	| BodyType<ServiceaccounttypesUpdatableFactorAPIKeyDTO>
	| undefined;
export type UpdateServiceAccountKeyMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type UpdateServiceAccountKeyMutationVariables = {
	pathParams: UpdateServiceAccountKeyPathParameters;
	data?: BodyType<ServiceaccounttypesUpdatableFactorAPIKeyDTO>;
};

/**
 * @summary Updates a service account key
 */
export const useUpdateServiceAccountKey = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateServiceAccountKey>>,
		TError,
		UpdateServiceAccountKeyMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateServiceAccountKey>>,
	TError,
	UpdateServiceAccountKeyMutationVariables,
	TContext
> => {
	return useMutation(getUpdateServiceAccountKeyMutationOptions(options));
};
/**
 * This endpoint gets all the roles for the existing service account
 * @summary Gets service account roles
 */
export const getServiceAccountRoles = (
	{ id }: GetServiceAccountRolesPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetServiceAccountRoles200>({
		url: `/api/v1/service_accounts/${id}/roles`,
		method: 'GET',
		signal,
	});
};

export const getGetServiceAccountRolesQueryKey = ({
	id,
}: GetServiceAccountRolesPathParameters) => {
	return [`/api/v1/service_accounts/${id}/roles`] as const;
};

export const getGetServiceAccountRolesQueryOptions = <
	TData = Awaited<ReturnType<typeof getServiceAccountRoles>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetServiceAccountRolesPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getServiceAccountRoles>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetServiceAccountRolesQueryKey({ id });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getServiceAccountRoles>>
	> = ({ signal }) => getServiceAccountRoles({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: id !== null && id !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getServiceAccountRoles>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetServiceAccountRolesQueryResult = NonNullable<
	Awaited<ReturnType<typeof getServiceAccountRoles>>
>;
export type GetServiceAccountRolesQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Gets service account roles
 */

export function useGetServiceAccountRoles<
	TData = Awaited<ReturnType<typeof getServiceAccountRoles>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetServiceAccountRolesPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getServiceAccountRoles>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetServiceAccountRolesQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetServiceAccountRoles} query
 */
export const invalidateGetServiceAccountRoles = async (
	queryClient: QueryClient,
	{ id }: GetServiceAccountRolesPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetServiceAccountRolesQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint gets my service account
 * @summary Gets my service account
 */
export const getMyServiceAccount = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetMyServiceAccount200>({
		url: `/api/v1/service_accounts/me`,
		method: 'GET',
		signal,
	});
};

export const getGetMyServiceAccountQueryKey = () => {
	return [`/api/v1/service_accounts/me`] as const;
};

export const getGetMyServiceAccountQueryOptions = <
	TData = Awaited<ReturnType<typeof getMyServiceAccount>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getMyServiceAccount>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetMyServiceAccountQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getMyServiceAccount>>
	> = ({ signal }) => getMyServiceAccount(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getMyServiceAccount>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetMyServiceAccountQueryResult = NonNullable<
	Awaited<ReturnType<typeof getMyServiceAccount>>
>;
export type GetMyServiceAccountQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Gets my service account
 */

export function useGetMyServiceAccount<
	TData = Awaited<ReturnType<typeof getMyServiceAccount>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getMyServiceAccount>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMyServiceAccountQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetMyServiceAccount} query
 */
export const invalidateGetMyServiceAccount = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMyServiceAccountQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint gets my service account
 * @summary Updates my service account
 */
export const updateMyServiceAccount = (
	serviceaccounttypesPostableServiceAccountDTO?: BodyType<ServiceaccounttypesPostableServiceAccountDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/service_accounts/me`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: serviceaccounttypesPostableServiceAccountDTO,
		signal,
	});
};

export const getUpdateMyServiceAccountMutationKey = () =>
	['updateMyServiceAccount'] as const;

export const getUpdateMyServiceAccountMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMyServiceAccount>>,
		TError,
		UpdateMyServiceAccountMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateMyServiceAccount>>,
	TError,
	UpdateMyServiceAccountMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateMyServiceAccountMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateMyServiceAccount>>,
		UpdateMyServiceAccountMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return updateMyServiceAccount(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateMyServiceAccountMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateMyServiceAccount>>
>;
export type UpdateMyServiceAccountMutationBody =
	| BodyType<ServiceaccounttypesPostableServiceAccountDTO>
	| undefined;
export type UpdateMyServiceAccountMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type UpdateMyServiceAccountMutationVariables = {
	data?: BodyType<ServiceaccounttypesPostableServiceAccountDTO>;
};

/**
 * @summary Updates my service account
 */
export const useUpdateMyServiceAccount = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMyServiceAccount>>,
		TError,
		UpdateMyServiceAccountMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateMyServiceAccount>>,
	TError,
	UpdateMyServiceAccountMutationVariables,
	TContext
> => {
	return useMutation(getUpdateMyServiceAccountMutationOptions(options));
};
