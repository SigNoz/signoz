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

import type { AgentCheckIn200 } from '../sigNoz.schemas/agentCheckIn200';

import type { AgentCheckInDeprecated200 } from '../sigNoz.schemas/agentCheckInDeprecated200';

import type { AgentCheckInDeprecatedPathParameters } from '../sigNoz.schemas/agentCheckInDeprecatedPathParameters';

import type { AgentCheckInPathParameters } from '../sigNoz.schemas/agentCheckInPathParameters';

import type { CloudintegrationtypesPostableAccountDTO } from '../sigNoz.schemas/cloudintegrationtypesPostableAccountDTO';

import type { CloudintegrationtypesPostableAgentCheckInDTO } from '../sigNoz.schemas/cloudintegrationtypesPostableAgentCheckInDTO';

import type { CloudintegrationtypesUpdatableAccountDTO } from '../sigNoz.schemas/cloudintegrationtypesUpdatableAccountDTO';

import type { CloudintegrationtypesUpdatableServiceDTO } from '../sigNoz.schemas/cloudintegrationtypesUpdatableServiceDTO';

import type { CreateAccount201 } from '../sigNoz.schemas/createAccount201';

import type { CreateAccountPathParameters } from '../sigNoz.schemas/createAccountPathParameters';

import type { DisconnectAccountPathParameters } from '../sigNoz.schemas/disconnectAccountPathParameters';

import type { GetAccount200 } from '../sigNoz.schemas/getAccount200';

import type { GetAccountPathParameters } from '../sigNoz.schemas/getAccountPathParameters';

import type { GetAccountService200 } from '../sigNoz.schemas/getAccountService200';

import type { GetAccountServicePathParameters } from '../sigNoz.schemas/getAccountServicePathParameters';

import type { GetConnectionCredentials200 } from '../sigNoz.schemas/getConnectionCredentials200';

import type { GetConnectionCredentialsPathParameters } from '../sigNoz.schemas/getConnectionCredentialsPathParameters';

import type { GetService200 } from '../sigNoz.schemas/getService200';

import type { GetServicePathParameters } from '../sigNoz.schemas/getServicePathParameters';

import type { ListAccountServicesMetadata200 } from '../sigNoz.schemas/listAccountServicesMetadata200';

import type { ListAccountServicesMetadataPathParameters } from '../sigNoz.schemas/listAccountServicesMetadataPathParameters';

import type { ListAccounts200 } from '../sigNoz.schemas/listAccounts200';

import type { ListAccountsPathParameters } from '../sigNoz.schemas/listAccountsPathParameters';

import type { ListServicesMetadata200 } from '../sigNoz.schemas/listServicesMetadata200';

import type { ListServicesMetadataPathParameters } from '../sigNoz.schemas/listServicesMetadataPathParameters';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

import type { UpdateAccountPathParameters } from '../sigNoz.schemas/updateAccountPathParameters';

import type { UpdateServicePathParameters } from '../sigNoz.schemas/updateServicePathParameters';

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
 * [Deprecated] This endpoint is called by the deployed agent to check in
 * @deprecated
 * @summary Agent check-in
 */
export const agentCheckInDeprecated = (
	{ cloudProvider }: AgentCheckInDeprecatedPathParameters,
	cloudintegrationtypesPostableAgentCheckInDTO?: BodyType<CloudintegrationtypesPostableAgentCheckInDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<AgentCheckInDeprecated200>({
		url: `/api/v1/cloud-integrations/${cloudProvider}/agent-check-in`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: cloudintegrationtypesPostableAgentCheckInDTO,
		signal,
	});
};

export const getAgentCheckInDeprecatedMutationKey = () =>
	['agentCheckInDeprecated'] as const;

export const getAgentCheckInDeprecatedMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof agentCheckInDeprecated>>,
		TError,
		AgentCheckInDeprecatedMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof agentCheckInDeprecated>>,
	TError,
	AgentCheckInDeprecatedMutationVariables,
	TContext
> => {
	const mutationKey = getAgentCheckInDeprecatedMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof agentCheckInDeprecated>>,
		AgentCheckInDeprecatedMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return agentCheckInDeprecated(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type AgentCheckInDeprecatedMutationResult = NonNullable<
	Awaited<ReturnType<typeof agentCheckInDeprecated>>
>;
export type AgentCheckInDeprecatedMutationBody =
	| BodyType<CloudintegrationtypesPostableAgentCheckInDTO>
	| undefined;
export type AgentCheckInDeprecatedMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type AgentCheckInDeprecatedMutationVariables = {
	pathParams: AgentCheckInDeprecatedPathParameters;
	data?: BodyType<CloudintegrationtypesPostableAgentCheckInDTO>;
};

/**
 * @deprecated
 * @summary Agent check-in
 */
export const useAgentCheckInDeprecated = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof agentCheckInDeprecated>>,
		TError,
		AgentCheckInDeprecatedMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof agentCheckInDeprecated>>,
	TError,
	AgentCheckInDeprecatedMutationVariables,
	TContext
> => {
	return useMutation(getAgentCheckInDeprecatedMutationOptions(options));
};
/**
 * This endpoint lists the accounts for the specified cloud provider
 * @summary List accounts
 */
export const listAccounts = (
	{ cloudProvider }: ListAccountsPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListAccounts200>({
		url: `/api/v1/cloud_integrations/${cloudProvider}/accounts`,
		method: 'GET',
		signal,
	});
};

export const getListAccountsQueryKey = ({
	cloudProvider,
}: ListAccountsPathParameters) => {
	return [`/api/v1/cloud_integrations/${cloudProvider}/accounts`] as const;
};

export const getListAccountsQueryOptions = <
	TData = Awaited<ReturnType<typeof listAccounts>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ cloudProvider }: ListAccountsPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listAccounts>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getListAccountsQueryKey({ cloudProvider });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof listAccounts>>> = ({
		signal,
	}) => listAccounts({ cloudProvider }, signal);

	return {
		queryKey,
		queryFn,
		enabled: cloudProvider !== null && cloudProvider !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof listAccounts>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListAccountsQueryResult = NonNullable<
	Awaited<ReturnType<typeof listAccounts>>
>;
export type ListAccountsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List accounts
 */

export function useListAccounts<
	TData = Awaited<ReturnType<typeof listAccounts>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ cloudProvider }: ListAccountsPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listAccounts>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListAccountsQueryOptions({ cloudProvider }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListAccounts} query
 */
export const invalidateListAccounts = async (
	queryClient: QueryClient,
	{ cloudProvider }: ListAccountsPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListAccountsQueryKey({ cloudProvider }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates a new cloud integration account for the specified cloud provider
 * @summary Create account
 */
export const createAccount = (
	{ cloudProvider }: CreateAccountPathParameters,
	cloudintegrationtypesPostableAccountDTO?: BodyType<CloudintegrationtypesPostableAccountDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateAccount201>({
		url: `/api/v1/cloud_integrations/${cloudProvider}/accounts`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: cloudintegrationtypesPostableAccountDTO,
		signal,
	});
};

export const getCreateAccountMutationKey = () => ['createAccount'] as const;

export const getCreateAccountMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createAccount>>,
		TError,
		CreateAccountMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createAccount>>,
	TError,
	CreateAccountMutationVariables,
	TContext
> => {
	const mutationKey = getCreateAccountMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createAccount>>,
		CreateAccountMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return createAccount(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateAccountMutationResult = NonNullable<
	Awaited<ReturnType<typeof createAccount>>
>;
export type CreateAccountMutationBody =
	| BodyType<CloudintegrationtypesPostableAccountDTO>
	| undefined;
export type CreateAccountMutationError = ErrorType<RenderErrorResponseDTO>;
export type CreateAccountMutationVariables = {
	pathParams: CreateAccountPathParameters;
	data?: BodyType<CloudintegrationtypesPostableAccountDTO>;
};

/**
 * @summary Create account
 */
export const useCreateAccount = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createAccount>>,
		TError,
		CreateAccountMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createAccount>>,
	TError,
	CreateAccountMutationVariables,
	TContext
> => {
	return useMutation(getCreateAccountMutationOptions(options));
};
/**
 * This endpoint disconnects an account for the specified cloud provider
 * @summary Disconnect account
 */
export const disconnectAccount = (
	{ cloudProvider, id }: DisconnectAccountPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/cloud_integrations/${cloudProvider}/accounts/${id}`,
		method: 'DELETE',
		signal,
	});
};

export const getDisconnectAccountMutationKey = () =>
	['disconnectAccount'] as const;

export const getDisconnectAccountMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof disconnectAccount>>,
		TError,
		DisconnectAccountMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof disconnectAccount>>,
	TError,
	DisconnectAccountMutationVariables,
	TContext
> => {
	const mutationKey = getDisconnectAccountMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof disconnectAccount>>,
		DisconnectAccountMutationVariables
	> = (props) => {
		const { pathParams } = props ?? {};

		return disconnectAccount(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DisconnectAccountMutationResult = NonNullable<
	Awaited<ReturnType<typeof disconnectAccount>>
>;

export type DisconnectAccountMutationError = ErrorType<RenderErrorResponseDTO>;
export type DisconnectAccountMutationVariables = {
	pathParams: DisconnectAccountPathParameters;
};

/**
 * @summary Disconnect account
 */
export const useDisconnectAccount = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof disconnectAccount>>,
		TError,
		DisconnectAccountMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof disconnectAccount>>,
	TError,
	DisconnectAccountMutationVariables,
	TContext
> => {
	return useMutation(getDisconnectAccountMutationOptions(options));
};
/**
 * This endpoint gets an account for the specified cloud provider
 * @summary Get account
 */
export const getAccount = (
	{ cloudProvider, id }: GetAccountPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetAccount200>({
		url: `/api/v1/cloud_integrations/${cloudProvider}/accounts/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetAccountQueryKey = ({
	cloudProvider,
	id,
}: GetAccountPathParameters) => {
	return [`/api/v1/cloud_integrations/${cloudProvider}/accounts/${id}`] as const;
};

export const getGetAccountQueryOptions = <
	TData = Awaited<ReturnType<typeof getAccount>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ cloudProvider, id }: GetAccountPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getAccount>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetAccountQueryKey({ cloudProvider, id });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getAccount>>> = ({
		signal,
	}) => getAccount({ cloudProvider, id }, signal);

	return {
		queryKey,
		queryFn,
		enabled:
			cloudProvider !== null &&
			cloudProvider !== undefined &&
			id !== null &&
			id !== undefined,
		...queryOptions,
	} as UseQueryOptions<Awaited<ReturnType<typeof getAccount>>, TError, TData> & {
		queryKey: QueryKey;
	};
};

export type GetAccountQueryResult = NonNullable<
	Awaited<ReturnType<typeof getAccount>>
>;
export type GetAccountQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get account
 */

export function useGetAccount<
	TData = Awaited<ReturnType<typeof getAccount>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ cloudProvider, id }: GetAccountPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getAccount>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetAccountQueryOptions({ cloudProvider, id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetAccount} query
 */
export const invalidateGetAccount = async (
	queryClient: QueryClient,
	{ cloudProvider, id }: GetAccountPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetAccountQueryKey({ cloudProvider, id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint updates an account for the specified cloud provider
 * @summary Update account
 */
export const updateAccount = (
	{ cloudProvider, id }: UpdateAccountPathParameters,
	cloudintegrationtypesUpdatableAccountDTO?: BodyType<CloudintegrationtypesUpdatableAccountDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/cloud_integrations/${cloudProvider}/accounts/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: cloudintegrationtypesUpdatableAccountDTO,
		signal,
	});
};

export const getUpdateAccountMutationKey = () => ['updateAccount'] as const;

export const getUpdateAccountMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateAccount>>,
		TError,
		UpdateAccountMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateAccount>>,
	TError,
	UpdateAccountMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateAccountMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateAccount>>,
		UpdateAccountMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateAccount(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateAccountMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateAccount>>
>;
export type UpdateAccountMutationBody =
	| BodyType<CloudintegrationtypesUpdatableAccountDTO>
	| undefined;
export type UpdateAccountMutationError = ErrorType<RenderErrorResponseDTO>;
export type UpdateAccountMutationVariables = {
	pathParams: UpdateAccountPathParameters;
	data?: BodyType<CloudintegrationtypesUpdatableAccountDTO>;
};

/**
 * @summary Update account
 */
export const useUpdateAccount = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateAccount>>,
		TError,
		UpdateAccountMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateAccount>>,
	TError,
	UpdateAccountMutationVariables,
	TContext
> => {
	return useMutation(getUpdateAccountMutationOptions(options));
};
/**
 * This endpoint lists the services metadata for the specified account and cloud provider
 * @summary List account services metadata
 */
export const listAccountServicesMetadata = (
	{ cloudProvider, id }: ListAccountServicesMetadataPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListAccountServicesMetadata200>({
		url: `/api/v1/cloud_integrations/${cloudProvider}/accounts/${id}/services`,
		method: 'GET',
		signal,
	});
};

export const getListAccountServicesMetadataQueryKey = ({
	cloudProvider,
	id,
}: ListAccountServicesMetadataPathParameters) => {
	return [
		`/api/v1/cloud_integrations/${cloudProvider}/accounts/${id}/services`,
	] as const;
};

export const getListAccountServicesMetadataQueryOptions = <
	TData = Awaited<ReturnType<typeof listAccountServicesMetadata>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ cloudProvider, id }: ListAccountServicesMetadataPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listAccountServicesMetadata>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getListAccountServicesMetadataQueryKey({ cloudProvider, id });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listAccountServicesMetadata>>
	> = ({ signal }) => listAccountServicesMetadata({ cloudProvider, id }, signal);

	return {
		queryKey,
		queryFn,
		enabled:
			cloudProvider !== null &&
			cloudProvider !== undefined &&
			id !== null &&
			id !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof listAccountServicesMetadata>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListAccountServicesMetadataQueryResult = NonNullable<
	Awaited<ReturnType<typeof listAccountServicesMetadata>>
>;
export type ListAccountServicesMetadataQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List account services metadata
 */

export function useListAccountServicesMetadata<
	TData = Awaited<ReturnType<typeof listAccountServicesMetadata>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ cloudProvider, id }: ListAccountServicesMetadataPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listAccountServicesMetadata>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListAccountServicesMetadataQueryOptions(
		{ cloudProvider, id },
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListAccountServicesMetadata} query
 */
export const invalidateListAccountServicesMetadata = async (
	queryClient: QueryClient,
	{ cloudProvider, id }: ListAccountServicesMetadataPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListAccountServicesMetadataQueryKey({ cloudProvider, id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint gets a service and its configuration for the specified cloud integration account
 * @summary Get service for account
 */
export const getAccountService = (
	{ cloudProvider, id, serviceId }: GetAccountServicePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetAccountService200>({
		url: `/api/v1/cloud_integrations/${cloudProvider}/accounts/${id}/services/${serviceId}`,
		method: 'GET',
		signal,
	});
};

export const getGetAccountServiceQueryKey = ({
	cloudProvider,
	id,
	serviceId,
}: GetAccountServicePathParameters) => {
	return [
		`/api/v1/cloud_integrations/${cloudProvider}/accounts/${id}/services/${serviceId}`,
	] as const;
};

export const getGetAccountServiceQueryOptions = <
	TData = Awaited<ReturnType<typeof getAccountService>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ cloudProvider, id, serviceId }: GetAccountServicePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getAccountService>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getGetAccountServiceQueryKey({ cloudProvider, id, serviceId });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getAccountService>>
	> = ({ signal }) =>
		getAccountService({ cloudProvider, id, serviceId }, signal);

	return {
		queryKey,
		queryFn,
		enabled:
			cloudProvider !== null &&
			cloudProvider !== undefined &&
			id !== null &&
			id !== undefined &&
			serviceId !== null &&
			serviceId !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getAccountService>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetAccountServiceQueryResult = NonNullable<
	Awaited<ReturnType<typeof getAccountService>>
>;
export type GetAccountServiceQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get service for account
 */

export function useGetAccountService<
	TData = Awaited<ReturnType<typeof getAccountService>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ cloudProvider, id, serviceId }: GetAccountServicePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getAccountService>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetAccountServiceQueryOptions(
		{ cloudProvider, id, serviceId },
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetAccountService} query
 */
export const invalidateGetAccountService = async (
	queryClient: QueryClient,
	{ cloudProvider, id, serviceId }: GetAccountServicePathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetAccountServiceQueryKey({ cloudProvider, id, serviceId }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint updates a service for the specified cloud provider
 * @summary Update service
 */
export const updateService = (
	{ cloudProvider, id, serviceId }: UpdateServicePathParameters,
	cloudintegrationtypesUpdatableServiceDTO?: BodyType<CloudintegrationtypesUpdatableServiceDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/cloud_integrations/${cloudProvider}/accounts/${id}/services/${serviceId}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: cloudintegrationtypesUpdatableServiceDTO,
		signal,
	});
};

export const getUpdateServiceMutationKey = () => ['updateService'] as const;

export const getUpdateServiceMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateService>>,
		TError,
		UpdateServiceMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateService>>,
	TError,
	UpdateServiceMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateServiceMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateService>>,
		UpdateServiceMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateService(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateServiceMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateService>>
>;
export type UpdateServiceMutationBody =
	| BodyType<CloudintegrationtypesUpdatableServiceDTO>
	| undefined;
export type UpdateServiceMutationError = ErrorType<RenderErrorResponseDTO>;
export type UpdateServiceMutationVariables = {
	pathParams: UpdateServicePathParameters;
	data?: BodyType<CloudintegrationtypesUpdatableServiceDTO>;
};

/**
 * @summary Update service
 */
export const useUpdateService = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateService>>,
		TError,
		UpdateServiceMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateService>>,
	TError,
	UpdateServiceMutationVariables,
	TContext
> => {
	return useMutation(getUpdateServiceMutationOptions(options));
};
/**
 * This endpoint is called by the deployed agent to check in
 * @summary Agent check-in
 */
export const agentCheckIn = (
	{ cloudProvider }: AgentCheckInPathParameters,
	cloudintegrationtypesPostableAgentCheckInDTO?: BodyType<CloudintegrationtypesPostableAgentCheckInDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<AgentCheckIn200>({
		url: `/api/v1/cloud_integrations/${cloudProvider}/accounts/check_in`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: cloudintegrationtypesPostableAgentCheckInDTO,
		signal,
	});
};

export const getAgentCheckInMutationKey = () => ['agentCheckIn'] as const;

export const getAgentCheckInMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof agentCheckIn>>,
		TError,
		AgentCheckInMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof agentCheckIn>>,
	TError,
	AgentCheckInMutationVariables,
	TContext
> => {
	const mutationKey = getAgentCheckInMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof agentCheckIn>>,
		AgentCheckInMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return agentCheckIn(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type AgentCheckInMutationResult = NonNullable<
	Awaited<ReturnType<typeof agentCheckIn>>
>;
export type AgentCheckInMutationBody =
	| BodyType<CloudintegrationtypesPostableAgentCheckInDTO>
	| undefined;
export type AgentCheckInMutationError = ErrorType<RenderErrorResponseDTO>;
export type AgentCheckInMutationVariables = {
	pathParams: AgentCheckInPathParameters;
	data?: BodyType<CloudintegrationtypesPostableAgentCheckInDTO>;
};

/**
 * @summary Agent check-in
 */
export const useAgentCheckIn = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof agentCheckIn>>,
		TError,
		AgentCheckInMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof agentCheckIn>>,
	TError,
	AgentCheckInMutationVariables,
	TContext
> => {
	return useMutation(getAgentCheckInMutationOptions(options));
};
/**
 * This endpoint retrieves the connection credentials required for integration
 * @summary Get connection credentials
 */
export const getConnectionCredentials = (
	{ cloudProvider }: GetConnectionCredentialsPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetConnectionCredentials200>({
		url: `/api/v1/cloud_integrations/${cloudProvider}/credentials`,
		method: 'GET',
		signal,
	});
};

export const getGetConnectionCredentialsQueryKey = ({
	cloudProvider,
}: GetConnectionCredentialsPathParameters) => {
	return [`/api/v1/cloud_integrations/${cloudProvider}/credentials`] as const;
};

export const getGetConnectionCredentialsQueryOptions = <
	TData = Awaited<ReturnType<typeof getConnectionCredentials>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ cloudProvider }: GetConnectionCredentialsPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getConnectionCredentials>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getGetConnectionCredentialsQueryKey({ cloudProvider });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getConnectionCredentials>>
	> = ({ signal }) => getConnectionCredentials({ cloudProvider }, signal);

	return {
		queryKey,
		queryFn,
		enabled: cloudProvider !== null && cloudProvider !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getConnectionCredentials>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetConnectionCredentialsQueryResult = NonNullable<
	Awaited<ReturnType<typeof getConnectionCredentials>>
>;
export type GetConnectionCredentialsQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get connection credentials
 */

export function useGetConnectionCredentials<
	TData = Awaited<ReturnType<typeof getConnectionCredentials>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ cloudProvider }: GetConnectionCredentialsPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getConnectionCredentials>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetConnectionCredentialsQueryOptions(
		{ cloudProvider },
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetConnectionCredentials} query
 */
export const invalidateGetConnectionCredentials = async (
	queryClient: QueryClient,
	{ cloudProvider }: GetConnectionCredentialsPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetConnectionCredentialsQueryKey({ cloudProvider }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint lists the services metadata for the specified cloud provider, without any account context.
 * @summary List services metadata
 */
export const listServicesMetadata = (
	{ cloudProvider }: ListServicesMetadataPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListServicesMetadata200>({
		url: `/api/v1/cloud_integrations/${cloudProvider}/services`,
		method: 'GET',
		signal,
	});
};

export const getListServicesMetadataQueryKey = ({
	cloudProvider,
}: ListServicesMetadataPathParameters) => {
	return [`/api/v1/cloud_integrations/${cloudProvider}/services`] as const;
};

export const getListServicesMetadataQueryOptions = <
	TData = Awaited<ReturnType<typeof listServicesMetadata>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ cloudProvider }: ListServicesMetadataPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listServicesMetadata>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getListServicesMetadataQueryKey({ cloudProvider });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listServicesMetadata>>
	> = ({ signal }) => listServicesMetadata({ cloudProvider }, signal);

	return {
		queryKey,
		queryFn,
		enabled: cloudProvider !== null && cloudProvider !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof listServicesMetadata>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListServicesMetadataQueryResult = NonNullable<
	Awaited<ReturnType<typeof listServicesMetadata>>
>;
export type ListServicesMetadataQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List services metadata
 */

export function useListServicesMetadata<
	TData = Awaited<ReturnType<typeof listServicesMetadata>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ cloudProvider }: ListServicesMetadataPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listServicesMetadata>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListServicesMetadataQueryOptions(
		{ cloudProvider },
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListServicesMetadata} query
 */
export const invalidateListServicesMetadata = async (
	queryClient: QueryClient,
	{ cloudProvider }: ListServicesMetadataPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListServicesMetadataQueryKey({ cloudProvider }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint gets a service definition for the specified cloud provider, without any account context.
 * @summary Get service
 */
export const getService = (
	{ cloudProvider, serviceId }: GetServicePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetService200>({
		url: `/api/v1/cloud_integrations/${cloudProvider}/services/${serviceId}`,
		method: 'GET',
		signal,
	});
};

export const getGetServiceQueryKey = ({
	cloudProvider,
	serviceId,
}: GetServicePathParameters) => {
	return [
		`/api/v1/cloud_integrations/${cloudProvider}/services/${serviceId}`,
	] as const;
};

export const getGetServiceQueryOptions = <
	TData = Awaited<ReturnType<typeof getService>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ cloudProvider, serviceId }: GetServicePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getService>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetServiceQueryKey({ cloudProvider, serviceId });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getService>>> = ({
		signal,
	}) => getService({ cloudProvider, serviceId }, signal);

	return {
		queryKey,
		queryFn,
		enabled:
			cloudProvider !== null &&
			cloudProvider !== undefined &&
			serviceId !== null &&
			serviceId !== undefined,
		...queryOptions,
	} as UseQueryOptions<Awaited<ReturnType<typeof getService>>, TError, TData> & {
		queryKey: QueryKey;
	};
};

export type GetServiceQueryResult = NonNullable<
	Awaited<ReturnType<typeof getService>>
>;
export type GetServiceQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get service
 */

export function useGetService<
	TData = Awaited<ReturnType<typeof getService>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ cloudProvider, serviceId }: GetServicePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getService>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetServiceQueryOptions(
		{ cloudProvider, serviceId },
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetService} query
 */
export const invalidateGetService = async (
	queryClient: QueryClient,
	{ cloudProvider, serviceId }: GetServicePathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetServiceQueryKey({ cloudProvider, serviceId }) },
		options,
	);

	return queryClient;
};
