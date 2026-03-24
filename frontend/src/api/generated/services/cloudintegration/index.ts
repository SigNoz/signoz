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
	AgentCheckIn200,
	AgentCheckInDeprecated200,
	AgentCheckInDeprecatedPathParameters,
	AgentCheckInPathParameters,
	CloudintegrationtypesConnectionArtifactRequestDTO,
	CloudintegrationtypesPostableAgentCheckInRequestDTO,
	CloudintegrationtypesUpdatableAccountDTO,
	CloudintegrationtypesUpdatableServiceDTO,
	CreateAccount200,
	CreateAccountPathParameters,
	DisconnectAccountPathParameters,
	GetAccount200,
	GetAccountPathParameters,
	GetService200,
	GetServicePathParameters,
	ListAccounts200,
	ListAccountsPathParameters,
	ListServicesMetadata200,
	ListServicesMetadataPathParameters,
	RenderErrorResponseDTO,
	UpdateAccountPathParameters,
	UpdateServicePathParameters,
} from '../sigNoz.schemas';

/**
 * [Deprecated] This endpoint is called by the deployed agent to check in
 * @deprecated
 * @summary Agent check-in
 */
export const agentCheckInDeprecated = (
	{ cloudProvider }: AgentCheckInDeprecatedPathParameters,
	cloudintegrationtypesPostableAgentCheckInRequestDTO: BodyType<CloudintegrationtypesPostableAgentCheckInRequestDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<AgentCheckInDeprecated200>({
		url: `/api/v1/cloud-integrations/${cloudProvider}/agent-check-in`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: cloudintegrationtypesPostableAgentCheckInRequestDTO,
		signal,
	});
};

export const getAgentCheckInDeprecatedMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof agentCheckInDeprecated>>,
		TError,
		{
			pathParams: AgentCheckInDeprecatedPathParameters;
			data: BodyType<CloudintegrationtypesPostableAgentCheckInRequestDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof agentCheckInDeprecated>>,
	TError,
	{
		pathParams: AgentCheckInDeprecatedPathParameters;
		data: BodyType<CloudintegrationtypesPostableAgentCheckInRequestDTO>;
	},
	TContext
> => {
	const mutationKey = ['agentCheckInDeprecated'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof agentCheckInDeprecated>>,
		{
			pathParams: AgentCheckInDeprecatedPathParameters;
			data: BodyType<CloudintegrationtypesPostableAgentCheckInRequestDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return agentCheckInDeprecated(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type AgentCheckInDeprecatedMutationResult = NonNullable<
	Awaited<ReturnType<typeof agentCheckInDeprecated>>
>;
export type AgentCheckInDeprecatedMutationBody = BodyType<CloudintegrationtypesPostableAgentCheckInRequestDTO>;
export type AgentCheckInDeprecatedMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @deprecated
 * @summary Agent check-in
 */
export const useAgentCheckInDeprecated = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof agentCheckInDeprecated>>,
		TError,
		{
			pathParams: AgentCheckInDeprecatedPathParameters;
			data: BodyType<CloudintegrationtypesPostableAgentCheckInRequestDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof agentCheckInDeprecated>>,
	TError,
	{
		pathParams: AgentCheckInDeprecatedPathParameters;
		data: BodyType<CloudintegrationtypesPostableAgentCheckInRequestDTO>;
	},
	TContext
> => {
	const mutationOptions = getAgentCheckInDeprecatedMutationOptions(options);

	return useMutation(mutationOptions);
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
	TError = ErrorType<RenderErrorResponseDTO>
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
		enabled: !!cloudProvider,
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
	TError = ErrorType<RenderErrorResponseDTO>
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

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List accounts
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
	cloudintegrationtypesConnectionArtifactRequestDTO: BodyType<CloudintegrationtypesConnectionArtifactRequestDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateAccount200>({
		url: `/api/v1/cloud_integrations/${cloudProvider}/accounts`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: cloudintegrationtypesConnectionArtifactRequestDTO,
		signal,
	});
};

export const getCreateAccountMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createAccount>>,
		TError,
		{
			pathParams: CreateAccountPathParameters;
			data: BodyType<CloudintegrationtypesConnectionArtifactRequestDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createAccount>>,
	TError,
	{
		pathParams: CreateAccountPathParameters;
		data: BodyType<CloudintegrationtypesConnectionArtifactRequestDTO>;
	},
	TContext
> => {
	const mutationKey = ['createAccount'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createAccount>>,
		{
			pathParams: CreateAccountPathParameters;
			data: BodyType<CloudintegrationtypesConnectionArtifactRequestDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return createAccount(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateAccountMutationResult = NonNullable<
	Awaited<ReturnType<typeof createAccount>>
>;
export type CreateAccountMutationBody = BodyType<CloudintegrationtypesConnectionArtifactRequestDTO>;
export type CreateAccountMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create account
 */
export const useCreateAccount = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createAccount>>,
		TError,
		{
			pathParams: CreateAccountPathParameters;
			data: BodyType<CloudintegrationtypesConnectionArtifactRequestDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createAccount>>,
	TError,
	{
		pathParams: CreateAccountPathParameters;
		data: BodyType<CloudintegrationtypesConnectionArtifactRequestDTO>;
	},
	TContext
> => {
	const mutationOptions = getCreateAccountMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint disconnects an account for the specified cloud provider
 * @summary Disconnect account
 */
export const disconnectAccount = ({
	cloudProvider,
	id,
}: DisconnectAccountPathParameters) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/cloud_integrations/${cloudProvider}/accounts/${id}`,
		method: 'DELETE',
	});
};

export const getDisconnectAccountMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof disconnectAccount>>,
		TError,
		{ pathParams: DisconnectAccountPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof disconnectAccount>>,
	TError,
	{ pathParams: DisconnectAccountPathParameters },
	TContext
> => {
	const mutationKey = ['disconnectAccount'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof disconnectAccount>>,
		{ pathParams: DisconnectAccountPathParameters }
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

/**
 * @summary Disconnect account
 */
export const useDisconnectAccount = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof disconnectAccount>>,
		TError,
		{ pathParams: DisconnectAccountPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof disconnectAccount>>,
	TError,
	{ pathParams: DisconnectAccountPathParameters },
	TContext
> => {
	const mutationOptions = getDisconnectAccountMutationOptions(options);

	return useMutation(mutationOptions);
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
	TError = ErrorType<RenderErrorResponseDTO>
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
		enabled: !!(cloudProvider && id),
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
	TError = ErrorType<RenderErrorResponseDTO>
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

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get account
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
	cloudintegrationtypesUpdatableAccountDTO: BodyType<CloudintegrationtypesUpdatableAccountDTO>,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/cloud_integrations/${cloudProvider}/accounts/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: cloudintegrationtypesUpdatableAccountDTO,
	});
};

export const getUpdateAccountMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateAccount>>,
		TError,
		{
			pathParams: UpdateAccountPathParameters;
			data: BodyType<CloudintegrationtypesUpdatableAccountDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateAccount>>,
	TError,
	{
		pathParams: UpdateAccountPathParameters;
		data: BodyType<CloudintegrationtypesUpdatableAccountDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateAccount'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateAccount>>,
		{
			pathParams: UpdateAccountPathParameters;
			data: BodyType<CloudintegrationtypesUpdatableAccountDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateAccount(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateAccountMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateAccount>>
>;
export type UpdateAccountMutationBody = BodyType<CloudintegrationtypesUpdatableAccountDTO>;
export type UpdateAccountMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update account
 */
export const useUpdateAccount = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateAccount>>,
		TError,
		{
			pathParams: UpdateAccountPathParameters;
			data: BodyType<CloudintegrationtypesUpdatableAccountDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateAccount>>,
	TError,
	{
		pathParams: UpdateAccountPathParameters;
		data: BodyType<CloudintegrationtypesUpdatableAccountDTO>;
	},
	TContext
> => {
	const mutationOptions = getUpdateAccountMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint is called by the deployed agent to check in
 * @summary Agent check-in
 */
export const agentCheckIn = (
	{ cloudProvider }: AgentCheckInPathParameters,
	cloudintegrationtypesPostableAgentCheckInRequestDTO: BodyType<CloudintegrationtypesPostableAgentCheckInRequestDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<AgentCheckIn200>({
		url: `/api/v1/cloud_integrations/${cloudProvider}/accounts/check_in`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: cloudintegrationtypesPostableAgentCheckInRequestDTO,
		signal,
	});
};

export const getAgentCheckInMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof agentCheckIn>>,
		TError,
		{
			pathParams: AgentCheckInPathParameters;
			data: BodyType<CloudintegrationtypesPostableAgentCheckInRequestDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof agentCheckIn>>,
	TError,
	{
		pathParams: AgentCheckInPathParameters;
		data: BodyType<CloudintegrationtypesPostableAgentCheckInRequestDTO>;
	},
	TContext
> => {
	const mutationKey = ['agentCheckIn'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof agentCheckIn>>,
		{
			pathParams: AgentCheckInPathParameters;
			data: BodyType<CloudintegrationtypesPostableAgentCheckInRequestDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return agentCheckIn(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type AgentCheckInMutationResult = NonNullable<
	Awaited<ReturnType<typeof agentCheckIn>>
>;
export type AgentCheckInMutationBody = BodyType<CloudintegrationtypesPostableAgentCheckInRequestDTO>;
export type AgentCheckInMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Agent check-in
 */
export const useAgentCheckIn = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof agentCheckIn>>,
		TError,
		{
			pathParams: AgentCheckInPathParameters;
			data: BodyType<CloudintegrationtypesPostableAgentCheckInRequestDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof agentCheckIn>>,
	TError,
	{
		pathParams: AgentCheckInPathParameters;
		data: BodyType<CloudintegrationtypesPostableAgentCheckInRequestDTO>;
	},
	TContext
> => {
	const mutationOptions = getAgentCheckInMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint lists the services metadata for the specified cloud provider
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
	TError = ErrorType<RenderErrorResponseDTO>
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
		enabled: !!cloudProvider,
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
	TError = ErrorType<RenderErrorResponseDTO>
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

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List services metadata
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
 * This endpoint gets a service for the specified cloud provider
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
	TError = ErrorType<RenderErrorResponseDTO>
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
		enabled: !!(cloudProvider && serviceId),
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
	TError = ErrorType<RenderErrorResponseDTO>
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

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get service
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

/**
 * This endpoint updates a service for the specified cloud provider
 * @summary Update service
 */
export const updateService = (
	{ cloudProvider, serviceId }: UpdateServicePathParameters,
	cloudintegrationtypesUpdatableServiceDTO: BodyType<CloudintegrationtypesUpdatableServiceDTO>,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/cloud_integrations/${cloudProvider}/services/${serviceId}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: cloudintegrationtypesUpdatableServiceDTO,
	});
};

export const getUpdateServiceMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateService>>,
		TError,
		{
			pathParams: UpdateServicePathParameters;
			data: BodyType<CloudintegrationtypesUpdatableServiceDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateService>>,
	TError,
	{
		pathParams: UpdateServicePathParameters;
		data: BodyType<CloudintegrationtypesUpdatableServiceDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateService'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateService>>,
		{
			pathParams: UpdateServicePathParameters;
			data: BodyType<CloudintegrationtypesUpdatableServiceDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateService(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateServiceMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateService>>
>;
export type UpdateServiceMutationBody = BodyType<CloudintegrationtypesUpdatableServiceDTO>;
export type UpdateServiceMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update service
 */
export const useUpdateService = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateService>>,
		TError,
		{
			pathParams: UpdateServicePathParameters;
			data: BodyType<CloudintegrationtypesUpdatableServiceDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateService>>,
	TError,
	{
		pathParams: UpdateServicePathParameters;
		data: BodyType<CloudintegrationtypesUpdatableServiceDTO>;
	},
	TContext
> => {
	const mutationOptions = getUpdateServiceMutationOptions(options);

	return useMutation(mutationOptions);
};
