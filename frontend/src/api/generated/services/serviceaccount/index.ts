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
	CreateServiceAccount201,
	CreateServiceAccountKey201,
	GetServiceAccount200,
	ListServiceAccountKeys200,
	ListServiceAccounts200,
	RenderErrorResponseDTO,
	ServiceaccounttypesPostableFactorAPIKeyDTO,
	ServiceaccounttypesPostableServiceAccountDTO,
	ServiceaccounttypesUpdatableFactorAPIKeyDTO,
	ServiceaccounttypesUpdatableServiceAccountDTO,
	ServiceaccounttypesUpdatableServiceAccountStatusDTO,
} from '../sigNoz.schemas';

type AwaitedInput<T> = PromiseLike<T> | T;

type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

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
	TError = ErrorType<RenderErrorResponseDTO>
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
	TError = ErrorType<RenderErrorResponseDTO>
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
	TContext = unknown
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
export type CreateServiceAccountMutationBody = BodyType<ServiceaccounttypesPostableServiceAccountDTO>;
export type CreateServiceAccountMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create service account
 */
export const useCreateServiceAccount = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
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
export const deleteServiceAccount = () => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/service_accounts/:id`,
		method: 'DELETE',
	});
};

export const getDeleteServiceAccountMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteServiceAccount>>,
		TError,
		void,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteServiceAccount>>,
	TError,
	void,
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
		void
	> = () => {
		return deleteServiceAccount();
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteServiceAccountMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteServiceAccount>>
>;

export type DeleteServiceAccountMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Deletes a service account
 */
export const useDeleteServiceAccount = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteServiceAccount>>,
		TError,
		void,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteServiceAccount>>,
	TError,
	void,
	TContext
> => {
	const mutationOptions = getDeleteServiceAccountMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint gets an existing service account
 * @summary Gets a service account
 */
export const getServiceAccount = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetServiceAccount200>({
		url: `/api/v1/service_accounts/:id`,
		method: 'GET',
		signal,
	});
};

export const getGetServiceAccountQueryKey = () => {
	return [`/api/v1/service_accounts/:id`] as const;
};

export const getGetServiceAccountQueryOptions = <
	TData = Awaited<ReturnType<typeof getServiceAccount>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getServiceAccount>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetServiceAccountQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getServiceAccount>>
	> = ({ signal }) => getServiceAccount(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
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
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getServiceAccount>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetServiceAccountQueryOptions(options);

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
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetServiceAccountQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint updates an existing service account
 * @summary Updates a service account
 */
export const updateServiceAccount = (
	serviceaccounttypesUpdatableServiceAccountDTO: BodyType<ServiceaccounttypesUpdatableServiceAccountDTO>,
) => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/service_accounts/:id`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: serviceaccounttypesUpdatableServiceAccountDTO,
	});
};

export const getUpdateServiceAccountMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateServiceAccount>>,
		TError,
		{ data: BodyType<ServiceaccounttypesUpdatableServiceAccountDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateServiceAccount>>,
	TError,
	{ data: BodyType<ServiceaccounttypesUpdatableServiceAccountDTO> },
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
		{ data: BodyType<ServiceaccounttypesUpdatableServiceAccountDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return updateServiceAccount(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateServiceAccountMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateServiceAccount>>
>;
export type UpdateServiceAccountMutationBody = BodyType<ServiceaccounttypesUpdatableServiceAccountDTO>;
export type UpdateServiceAccountMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Updates a service account
 */
export const useUpdateServiceAccount = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateServiceAccount>>,
		TError,
		{ data: BodyType<ServiceaccounttypesUpdatableServiceAccountDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateServiceAccount>>,
	TError,
	{ data: BodyType<ServiceaccounttypesUpdatableServiceAccountDTO> },
	TContext
> => {
	const mutationOptions = getUpdateServiceAccountMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint lists the service account keys
 * @summary List service account keys
 */
export const listServiceAccountKeys = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListServiceAccountKeys200>({
		url: `/api/v1/service_accounts/:id/keys`,
		method: 'GET',
		signal,
	});
};

export const getListServiceAccountKeysQueryKey = () => {
	return [`/api/v1/service_accounts/:id/keys`] as const;
};

export const getListServiceAccountKeysQueryOptions = <
	TData = Awaited<ReturnType<typeof listServiceAccountKeys>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listServiceAccountKeys>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListServiceAccountKeysQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listServiceAccountKeys>>
	> = ({ signal }) => listServiceAccountKeys(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listServiceAccountKeys>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListServiceAccountKeysQueryResult = NonNullable<
	Awaited<ReturnType<typeof listServiceAccountKeys>>
>;
export type ListServiceAccountKeysQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List service account keys
 */

export function useListServiceAccountKeys<
	TData = Awaited<ReturnType<typeof listServiceAccountKeys>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listServiceAccountKeys>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListServiceAccountKeysQueryOptions(options);

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
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListServiceAccountKeysQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates a service account key
 * @summary Create a service account key
 */
export const createServiceAccountKey = (
	serviceaccounttypesPostableFactorAPIKeyDTO: BodyType<ServiceaccounttypesPostableFactorAPIKeyDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateServiceAccountKey201>({
		url: `/api/v1/service_accounts/:id/keys`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: serviceaccounttypesPostableFactorAPIKeyDTO,
		signal,
	});
};

export const getCreateServiceAccountKeyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createServiceAccountKey>>,
		TError,
		{ data: BodyType<ServiceaccounttypesPostableFactorAPIKeyDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createServiceAccountKey>>,
	TError,
	{ data: BodyType<ServiceaccounttypesPostableFactorAPIKeyDTO> },
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
		{ data: BodyType<ServiceaccounttypesPostableFactorAPIKeyDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createServiceAccountKey(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateServiceAccountKeyMutationResult = NonNullable<
	Awaited<ReturnType<typeof createServiceAccountKey>>
>;
export type CreateServiceAccountKeyMutationBody = BodyType<ServiceaccounttypesPostableFactorAPIKeyDTO>;
export type CreateServiceAccountKeyMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create a service account key
 */
export const useCreateServiceAccountKey = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createServiceAccountKey>>,
		TError,
		{ data: BodyType<ServiceaccounttypesPostableFactorAPIKeyDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createServiceAccountKey>>,
	TError,
	{ data: BodyType<ServiceaccounttypesPostableFactorAPIKeyDTO> },
	TContext
> => {
	const mutationOptions = getCreateServiceAccountKeyMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint revokes an existing service account key
 * @summary Revoke a service account key
 */
export const revokeServiceAccountKey = () => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/service_accounts/:id/keys/:fid`,
		method: 'DELETE',
	});
};

export const getRevokeServiceAccountKeyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof revokeServiceAccountKey>>,
		TError,
		void,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof revokeServiceAccountKey>>,
	TError,
	void,
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
		void
	> = () => {
		return revokeServiceAccountKey();
	};

	return { mutationFn, ...mutationOptions };
};

export type RevokeServiceAccountKeyMutationResult = NonNullable<
	Awaited<ReturnType<typeof revokeServiceAccountKey>>
>;

export type RevokeServiceAccountKeyMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Revoke a service account key
 */
export const useRevokeServiceAccountKey = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof revokeServiceAccountKey>>,
		TError,
		void,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof revokeServiceAccountKey>>,
	TError,
	void,
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
	serviceaccounttypesUpdatableFactorAPIKeyDTO: BodyType<ServiceaccounttypesUpdatableFactorAPIKeyDTO>,
) => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/service_accounts/:id/keys/:fid`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: serviceaccounttypesUpdatableFactorAPIKeyDTO,
	});
};

export const getUpdateServiceAccountKeyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateServiceAccountKey>>,
		TError,
		{ data: BodyType<ServiceaccounttypesUpdatableFactorAPIKeyDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateServiceAccountKey>>,
	TError,
	{ data: BodyType<ServiceaccounttypesUpdatableFactorAPIKeyDTO> },
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
		{ data: BodyType<ServiceaccounttypesUpdatableFactorAPIKeyDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return updateServiceAccountKey(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateServiceAccountKeyMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateServiceAccountKey>>
>;
export type UpdateServiceAccountKeyMutationBody = BodyType<ServiceaccounttypesUpdatableFactorAPIKeyDTO>;
export type UpdateServiceAccountKeyMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Updates a service account key
 */
export const useUpdateServiceAccountKey = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateServiceAccountKey>>,
		TError,
		{ data: BodyType<ServiceaccounttypesUpdatableFactorAPIKeyDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateServiceAccountKey>>,
	TError,
	{ data: BodyType<ServiceaccounttypesUpdatableFactorAPIKeyDTO> },
	TContext
> => {
	const mutationOptions = getUpdateServiceAccountKeyMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint updates an existing service account status
 * @summary Updates a service account status
 */
export const updateServiceAccountStatus = (
	serviceaccounttypesUpdatableServiceAccountStatusDTO: BodyType<ServiceaccounttypesUpdatableServiceAccountStatusDTO>,
) => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/service_accounts/:id/status`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: serviceaccounttypesUpdatableServiceAccountStatusDTO,
	});
};

export const getUpdateServiceAccountStatusMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateServiceAccountStatus>>,
		TError,
		{ data: BodyType<ServiceaccounttypesUpdatableServiceAccountStatusDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateServiceAccountStatus>>,
	TError,
	{ data: BodyType<ServiceaccounttypesUpdatableServiceAccountStatusDTO> },
	TContext
> => {
	const mutationKey = ['updateServiceAccountStatus'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateServiceAccountStatus>>,
		{ data: BodyType<ServiceaccounttypesUpdatableServiceAccountStatusDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return updateServiceAccountStatus(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateServiceAccountStatusMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateServiceAccountStatus>>
>;
export type UpdateServiceAccountStatusMutationBody = BodyType<ServiceaccounttypesUpdatableServiceAccountStatusDTO>;
export type UpdateServiceAccountStatusMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Updates a service account status
 */
export const useUpdateServiceAccountStatus = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateServiceAccountStatus>>,
		TError,
		{ data: BodyType<ServiceaccounttypesUpdatableServiceAccountStatusDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateServiceAccountStatus>>,
	TError,
	{ data: BodyType<ServiceaccounttypesUpdatableServiceAccountStatusDTO> },
	TContext
> => {
	const mutationOptions = getUpdateServiceAccountStatusMutationOptions(options);

	return useMutation(mutationOptions);
};
