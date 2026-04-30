/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'yarn generate:api'
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
	CreateServiceAccount201,
	CreateServiceAccountKey201,
	CreateServiceAccountKeyPathParameters,
	CreateServiceAccountRole201,
	CreateServiceAccountRolePathParameters,
	DeleteServiceAccountPathParameters,
	DeleteServiceAccountRolePathParameters,
	GetMyServiceAccount200,
	GetServiceAccount200,
	GetServiceAccountPathParameters,
	GetServiceAccountRoles200,
	GetServiceAccountRolesPathParameters,
	ListServiceAccountKeys200,
	ListServiceAccountKeysPathParameters,
	ListServiceAccounts200,
	RenderErrorResponseDTO,
	RevokeServiceAccountKeyPathParameters,
	ServiceaccounttypesPostableFactorAPIKeyDTO,
	ServiceaccounttypesPostableServiceAccountDTO,
	ServiceaccounttypesPostableServiceAccountRoleDTO,
	ServiceaccounttypesUpdatableFactorAPIKeyDTO,
	UpdateServiceAccountKeyPathParameters,
	UpdateServiceAccountPathParameters,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * This endpoint lists the service accounts for an organisation
 * @summary List service accounts
 */
export const listServiceAccounts = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListServiceAccounts200>({
		url: `/api/v1/service_accounts`,
		method: 'GET',
		signal,
	});
};

export const getListServiceAccountsQueryKey = () => {
	return [`/api/v1/service_accounts`] as const;
};

export const getListServiceAccountsQueryOptions = <
	TData = Awaited<ReturnType<typeof listServiceAccounts>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listServiceAccounts>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListServiceAccountsQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listServiceAccounts>>
	> = ({ signal }) => listServiceAccounts(signal);

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
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listServiceAccounts>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListServiceAccountsQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List service accounts
 */
export const invalidateListServiceAccounts = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListServiceAccountsQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates a service account
 * @summary Create service account
 */
export const createServiceAccount = (
	serviceaccounttypesPostableServiceAccountDTO: BodyType<ServiceaccounttypesPostableServiceAccountDTO>,
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

export const getCreateServiceAccountMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createServiceAccount>>,
		TError,
		{ data: BodyType<ServiceaccounttypesPostableServiceAccountDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createServiceAccount>>,
	TError,
	{ data: BodyType<ServiceaccounttypesPostableServiceAccountDTO> },
	TContext
> => {
	const mutationKey = ['createServiceAccount'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createServiceAccount>>,
		{ data: BodyType<ServiceaccounttypesPostableServiceAccountDTO> }
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
	BodyType<ServiceaccounttypesPostableServiceAccountDTO>;
export type CreateServiceAccountMutationError =
	ErrorType<RenderErrorResponseDTO>;

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
		{ data: BodyType<ServiceaccounttypesPostableServiceAccountDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createServiceAccount>>,
	TError,
	{ data: BodyType<ServiceaccounttypesPostableServiceAccountDTO> },
	TContext
> => {
	const mutationOptions = getCreateServiceAccountMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint deletes an existing service account
 * @summary Deletes a service account
 */
export const deleteServiceAccount = ({
	id,
}: DeleteServiceAccountPathParameters) => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/service_accounts/${id}`,
		method: 'DELETE',
	});
};

export const getDeleteServiceAccountMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteServiceAccount>>,
		TError,
		{ pathParams: DeleteServiceAccountPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteServiceAccount>>,
	TError,
	{ pathParams: DeleteServiceAccountPathParameters },
	TContext
> => {
	const mutationKey = ['deleteServiceAccount'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteServiceAccount>>,
		{ pathParams: DeleteServiceAccountPathParameters }
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
		{ pathParams: DeleteServiceAccountPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteServiceAccount>>,
	TError,
	{ pathParams: DeleteServiceAccountPathParameters },
	TContext
> => {
	const mutationOptions = getDeleteServiceAccountMutationOptions(options);

	return useMutation(mutationOptions);
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
		enabled: !!id,
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

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Gets a service account
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
	serviceaccounttypesPostableServiceAccountDTO: BodyType<ServiceaccounttypesPostableServiceAccountDTO>,
) => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/service_accounts/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: serviceaccounttypesPostableServiceAccountDTO,
	});
};

export const getUpdateServiceAccountMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateServiceAccount>>,
		TError,
		{
			pathParams: UpdateServiceAccountPathParameters;
			data: BodyType<ServiceaccounttypesPostableServiceAccountDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateServiceAccount>>,
	TError,
	{
		pathParams: UpdateServiceAccountPathParameters;
		data: BodyType<ServiceaccounttypesPostableServiceAccountDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateServiceAccount'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateServiceAccount>>,
		{
			pathParams: UpdateServiceAccountPathParameters;
			data: BodyType<ServiceaccounttypesPostableServiceAccountDTO>;
		}
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
	BodyType<ServiceaccounttypesPostableServiceAccountDTO>;
export type UpdateServiceAccountMutationError =
	ErrorType<RenderErrorResponseDTO>;

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
		{
			pathParams: UpdateServiceAccountPathParameters;
			data: BodyType<ServiceaccounttypesPostableServiceAccountDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateServiceAccount>>,
	TError,
	{
		pathParams: UpdateServiceAccountPathParameters;
		data: BodyType<ServiceaccounttypesPostableServiceAccountDTO>;
	},
	TContext
> => {
	const mutationOptions = getUpdateServiceAccountMutationOptions(options);

	return useMutation(mutationOptions);
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
		enabled: !!id,
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

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List service account keys
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
	serviceaccounttypesPostableFactorAPIKeyDTO: BodyType<ServiceaccounttypesPostableFactorAPIKeyDTO>,
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

export const getCreateServiceAccountKeyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createServiceAccountKey>>,
		TError,
		{
			pathParams: CreateServiceAccountKeyPathParameters;
			data: BodyType<ServiceaccounttypesPostableFactorAPIKeyDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createServiceAccountKey>>,
	TError,
	{
		pathParams: CreateServiceAccountKeyPathParameters;
		data: BodyType<ServiceaccounttypesPostableFactorAPIKeyDTO>;
	},
	TContext
> => {
	const mutationKey = ['createServiceAccountKey'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createServiceAccountKey>>,
		{
			pathParams: CreateServiceAccountKeyPathParameters;
			data: BodyType<ServiceaccounttypesPostableFactorAPIKeyDTO>;
		}
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
	BodyType<ServiceaccounttypesPostableFactorAPIKeyDTO>;
export type CreateServiceAccountKeyMutationError =
	ErrorType<RenderErrorResponseDTO>;

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
		{
			pathParams: CreateServiceAccountKeyPathParameters;
			data: BodyType<ServiceaccounttypesPostableFactorAPIKeyDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createServiceAccountKey>>,
	TError,
	{
		pathParams: CreateServiceAccountKeyPathParameters;
		data: BodyType<ServiceaccounttypesPostableFactorAPIKeyDTO>;
	},
	TContext
> => {
	const mutationOptions = getCreateServiceAccountKeyMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint revokes an existing service account key
 * @summary Revoke a service account key
 */
export const revokeServiceAccountKey = ({
	id,
	fid,
}: RevokeServiceAccountKeyPathParameters) => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/service_accounts/${id}/keys/${fid}`,
		method: 'DELETE',
	});
};

export const getRevokeServiceAccountKeyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof revokeServiceAccountKey>>,
		TError,
		{ pathParams: RevokeServiceAccountKeyPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof revokeServiceAccountKey>>,
	TError,
	{ pathParams: RevokeServiceAccountKeyPathParameters },
	TContext
> => {
	const mutationKey = ['revokeServiceAccountKey'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof revokeServiceAccountKey>>,
		{ pathParams: RevokeServiceAccountKeyPathParameters }
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
		{ pathParams: RevokeServiceAccountKeyPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof revokeServiceAccountKey>>,
	TError,
	{ pathParams: RevokeServiceAccountKeyPathParameters },
	TContext
> => {
	const mutationOptions = getRevokeServiceAccountKeyMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint updates an existing service account key
 * @summary Updates a service account key
 */
export const updateServiceAccountKey = (
	{ id, fid }: UpdateServiceAccountKeyPathParameters,
	serviceaccounttypesUpdatableFactorAPIKeyDTO: BodyType<ServiceaccounttypesUpdatableFactorAPIKeyDTO>,
) => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/service_accounts/${id}/keys/${fid}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: serviceaccounttypesUpdatableFactorAPIKeyDTO,
	});
};

export const getUpdateServiceAccountKeyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateServiceAccountKey>>,
		TError,
		{
			pathParams: UpdateServiceAccountKeyPathParameters;
			data: BodyType<ServiceaccounttypesUpdatableFactorAPIKeyDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateServiceAccountKey>>,
	TError,
	{
		pathParams: UpdateServiceAccountKeyPathParameters;
		data: BodyType<ServiceaccounttypesUpdatableFactorAPIKeyDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateServiceAccountKey'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateServiceAccountKey>>,
		{
			pathParams: UpdateServiceAccountKeyPathParameters;
			data: BodyType<ServiceaccounttypesUpdatableFactorAPIKeyDTO>;
		}
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
	BodyType<ServiceaccounttypesUpdatableFactorAPIKeyDTO>;
export type UpdateServiceAccountKeyMutationError =
	ErrorType<RenderErrorResponseDTO>;

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
		{
			pathParams: UpdateServiceAccountKeyPathParameters;
			data: BodyType<ServiceaccounttypesUpdatableFactorAPIKeyDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateServiceAccountKey>>,
	TError,
	{
		pathParams: UpdateServiceAccountKeyPathParameters;
		data: BodyType<ServiceaccounttypesUpdatableFactorAPIKeyDTO>;
	},
	TContext
> => {
	const mutationOptions = getUpdateServiceAccountKeyMutationOptions(options);

	return useMutation(mutationOptions);
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
		enabled: !!id,
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

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Gets service account roles
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
 * This endpoint assigns a role to a service account
 * @summary Create service account role
 */
export const createServiceAccountRole = (
	{ id }: CreateServiceAccountRolePathParameters,
	serviceaccounttypesPostableServiceAccountRoleDTO: BodyType<ServiceaccounttypesPostableServiceAccountRoleDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateServiceAccountRole201>({
		url: `/api/v1/service_accounts/${id}/roles`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: serviceaccounttypesPostableServiceAccountRoleDTO,
		signal,
	});
};

export const getCreateServiceAccountRoleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createServiceAccountRole>>,
		TError,
		{
			pathParams: CreateServiceAccountRolePathParameters;
			data: BodyType<ServiceaccounttypesPostableServiceAccountRoleDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createServiceAccountRole>>,
	TError,
	{
		pathParams: CreateServiceAccountRolePathParameters;
		data: BodyType<ServiceaccounttypesPostableServiceAccountRoleDTO>;
	},
	TContext
> => {
	const mutationKey = ['createServiceAccountRole'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createServiceAccountRole>>,
		{
			pathParams: CreateServiceAccountRolePathParameters;
			data: BodyType<ServiceaccounttypesPostableServiceAccountRoleDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return createServiceAccountRole(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateServiceAccountRoleMutationResult = NonNullable<
	Awaited<ReturnType<typeof createServiceAccountRole>>
>;
export type CreateServiceAccountRoleMutationBody =
	BodyType<ServiceaccounttypesPostableServiceAccountRoleDTO>;
export type CreateServiceAccountRoleMutationError =
	ErrorType<RenderErrorResponseDTO>;

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
		{
			pathParams: CreateServiceAccountRolePathParameters;
			data: BodyType<ServiceaccounttypesPostableServiceAccountRoleDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createServiceAccountRole>>,
	TError,
	{
		pathParams: CreateServiceAccountRolePathParameters;
		data: BodyType<ServiceaccounttypesPostableServiceAccountRoleDTO>;
	},
	TContext
> => {
	const mutationOptions = getCreateServiceAccountRoleMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint revokes a role from service account
 * @summary Delete service account role
 */
export const deleteServiceAccountRole = ({
	id,
	rid,
}: DeleteServiceAccountRolePathParameters) => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/service_accounts/${id}/roles/${rid}`,
		method: 'DELETE',
	});
};

export const getDeleteServiceAccountRoleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteServiceAccountRole>>,
		TError,
		{ pathParams: DeleteServiceAccountRolePathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteServiceAccountRole>>,
	TError,
	{ pathParams: DeleteServiceAccountRolePathParameters },
	TContext
> => {
	const mutationKey = ['deleteServiceAccountRole'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteServiceAccountRole>>,
		{ pathParams: DeleteServiceAccountRolePathParameters }
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
		{ pathParams: DeleteServiceAccountRolePathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteServiceAccountRole>>,
	TError,
	{ pathParams: DeleteServiceAccountRolePathParameters },
	TContext
> => {
	const mutationOptions = getDeleteServiceAccountRoleMutationOptions(options);

	return useMutation(mutationOptions);
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

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Gets my service account
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
	serviceaccounttypesPostableServiceAccountDTO: BodyType<ServiceaccounttypesPostableServiceAccountDTO>,
) => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/service_accounts/me`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: serviceaccounttypesPostableServiceAccountDTO,
	});
};

export const getUpdateMyServiceAccountMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMyServiceAccount>>,
		TError,
		{ data: BodyType<ServiceaccounttypesPostableServiceAccountDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateMyServiceAccount>>,
	TError,
	{ data: BodyType<ServiceaccounttypesPostableServiceAccountDTO> },
	TContext
> => {
	const mutationKey = ['updateMyServiceAccount'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateMyServiceAccount>>,
		{ data: BodyType<ServiceaccounttypesPostableServiceAccountDTO> }
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
	BodyType<ServiceaccounttypesPostableServiceAccountDTO>;
export type UpdateMyServiceAccountMutationError =
	ErrorType<RenderErrorResponseDTO>;

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
		{ data: BodyType<ServiceaccounttypesPostableServiceAccountDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateMyServiceAccount>>,
	TError,
	{ data: BodyType<ServiceaccounttypesPostableServiceAccountDTO> },
	TContext
> => {
	const mutationOptions = getUpdateMyServiceAccountMutationOptions(options);

	return useMutation(mutationOptions);
};
