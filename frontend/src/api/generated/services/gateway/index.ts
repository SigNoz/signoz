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

import type { CreateIngestionKey201 } from '../sigNoz.schemas/createIngestionKey201';

import type { CreateIngestionKeyLimit201 } from '../sigNoz.schemas/createIngestionKeyLimit201';

import type { CreateIngestionKeyLimitPathParameters } from '../sigNoz.schemas/createIngestionKeyLimitPathParameters';

import type { CreateIngestionLimit201 } from '../sigNoz.schemas/createIngestionLimit201';

import type { DeleteIngestionKeyLimitPathParameters } from '../sigNoz.schemas/deleteIngestionKeyLimitPathParameters';

import type { DeleteIngestionKeyPathParameters } from '../sigNoz.schemas/deleteIngestionKeyPathParameters';

import type { DeleteIngestionLimitPathParameters } from '../sigNoz.schemas/deleteIngestionLimitPathParameters';

import type { GatewaytypesDeprecatedPostableIngestionKeyLimitDTO } from '../sigNoz.schemas/gatewaytypesDeprecatedPostableIngestionKeyLimitDTO';

import type { GatewaytypesPostableIngestionKeyDTO } from '../sigNoz.schemas/gatewaytypesPostableIngestionKeyDTO';

import type { GatewaytypesPostableIngestionKeyLimitDTO } from '../sigNoz.schemas/gatewaytypesPostableIngestionKeyLimitDTO';

import type { GatewaytypesUpdatableIngestionKeyLimitDTO } from '../sigNoz.schemas/gatewaytypesUpdatableIngestionKeyLimitDTO';

import type { GetIngestionKey200 } from '../sigNoz.schemas/getIngestionKey200';

import type { GetIngestionKeyLimits200 } from '../sigNoz.schemas/getIngestionKeyLimits200';

import type { GetIngestionKeyLimitsPathParameters } from '../sigNoz.schemas/getIngestionKeyLimitsPathParameters';

import type { GetIngestionKeyPathParameters } from '../sigNoz.schemas/getIngestionKeyPathParameters';

import type { GetIngestionKeys200 } from '../sigNoz.schemas/getIngestionKeys200';

import type { GetIngestionKeysParams } from '../sigNoz.schemas/getIngestionKeysParams';

import type { GetIngestionLimit200 } from '../sigNoz.schemas/getIngestionLimit200';

import type { GetIngestionLimitPathParameters } from '../sigNoz.schemas/getIngestionLimitPathParameters';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

import type { SearchIngestionKeys200 } from '../sigNoz.schemas/searchIngestionKeys200';

import type { SearchIngestionKeysParams } from '../sigNoz.schemas/searchIngestionKeysParams';

import type { UpdateIngestionKeyLimitPathParameters } from '../sigNoz.schemas/updateIngestionKeyLimitPathParameters';

import type { UpdateIngestionKeyPathParameters } from '../sigNoz.schemas/updateIngestionKeyPathParameters';

import type { UpdateIngestionLimitPathParameters } from '../sigNoz.schemas/updateIngestionLimitPathParameters';

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
 * This endpoint returns the ingestion keys for a workspace
 * @summary Get ingestion keys for workspace
 */
export const getIngestionKeys = (
	params?: GetIngestionKeysParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetIngestionKeys200>({
		url: `/api/v2/gateway/ingestion_keys`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetIngestionKeysQueryKey = (
	params?: GetIngestionKeysParams,
) => {
	return [
		`/api/v2/gateway/ingestion_keys`,
		...(params ? [params] : []),
	] as const;
};

export const getGetIngestionKeysQueryOptions = <
	TData = Awaited<ReturnType<typeof getIngestionKeys>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: GetIngestionKeysParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getIngestionKeys>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetIngestionKeysQueryKey(params);

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getIngestionKeys>>> = ({
		signal,
	}) => getIngestionKeys(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getIngestionKeys>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetIngestionKeysQueryResult = NonNullable<
	Awaited<ReturnType<typeof getIngestionKeys>>
>;
export type GetIngestionKeysQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get ingestion keys for workspace
 */

export function useGetIngestionKeys<
	TData = Awaited<ReturnType<typeof getIngestionKeys>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: GetIngestionKeysParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getIngestionKeys>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetIngestionKeysQueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetIngestionKeys} query
 */
export const invalidateGetIngestionKeys = async (
	queryClient: QueryClient,
	params?: GetIngestionKeysParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetIngestionKeysQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates an ingestion key for the workspace
 * @summary Create ingestion key for workspace
 */
export const createIngestionKey = (
	gatewaytypesPostableIngestionKeyDTO?: BodyType<GatewaytypesPostableIngestionKeyDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateIngestionKey201>({
		url: `/api/v2/gateway/ingestion_keys`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: gatewaytypesPostableIngestionKeyDTO,
		signal,
	});
};

export const getCreateIngestionKeyMutationKey = () =>
	['createIngestionKey'] as const;

export const getCreateIngestionKeyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createIngestionKey>>,
		TError,
		CreateIngestionKeyMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createIngestionKey>>,
	TError,
	CreateIngestionKeyMutationVariables,
	TContext
> => {
	const mutationKey = getCreateIngestionKeyMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createIngestionKey>>,
		CreateIngestionKeyMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return createIngestionKey(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateIngestionKeyMutationResult = NonNullable<
	Awaited<ReturnType<typeof createIngestionKey>>
>;
export type CreateIngestionKeyMutationBody =
	| BodyType<GatewaytypesPostableIngestionKeyDTO>
	| undefined;
export type CreateIngestionKeyMutationError = ErrorType<RenderErrorResponseDTO>;
export type CreateIngestionKeyMutationVariables = {
	data?: BodyType<GatewaytypesPostableIngestionKeyDTO>;
};

/**
 * @summary Create ingestion key for workspace
 */
export const useCreateIngestionKey = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createIngestionKey>>,
		TError,
		CreateIngestionKeyMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createIngestionKey>>,
	TError,
	CreateIngestionKeyMutationVariables,
	TContext
> => {
	return useMutation(getCreateIngestionKeyMutationOptions(options));
};
/**
 * This endpoint deletes an ingestion key for the workspace
 * @summary Delete ingestion key for workspace
 */
export const deleteIngestionKey = (
	{ keyId }: DeleteIngestionKeyPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/gateway/ingestion_keys/${keyId}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteIngestionKeyMutationKey = () =>
	['deleteIngestionKey'] as const;

export const getDeleteIngestionKeyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteIngestionKey>>,
		TError,
		DeleteIngestionKeyMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteIngestionKey>>,
	TError,
	DeleteIngestionKeyMutationVariables,
	TContext
> => {
	const mutationKey = getDeleteIngestionKeyMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteIngestionKey>>,
		DeleteIngestionKeyMutationVariables
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteIngestionKey(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteIngestionKeyMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteIngestionKey>>
>;

export type DeleteIngestionKeyMutationError = ErrorType<RenderErrorResponseDTO>;
export type DeleteIngestionKeyMutationVariables = {
	pathParams: DeleteIngestionKeyPathParameters;
};

/**
 * @summary Delete ingestion key for workspace
 */
export const useDeleteIngestionKey = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteIngestionKey>>,
		TError,
		DeleteIngestionKeyMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteIngestionKey>>,
	TError,
	DeleteIngestionKeyMutationVariables,
	TContext
> => {
	return useMutation(getDeleteIngestionKeyMutationOptions(options));
};
/**
 * This endpoint returns an ingestion key for the workspace
 * @summary Get ingestion key for workspace
 */
export const getIngestionKey = (
	{ keyId }: GetIngestionKeyPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetIngestionKey200>({
		url: `/api/v2/gateway/ingestion_keys/${keyId}`,
		method: 'GET',
		signal,
	});
};

export const getGetIngestionKeyQueryKey = ({
	keyId,
}: GetIngestionKeyPathParameters) => {
	return [`/api/v2/gateway/ingestion_keys/${keyId}`] as const;
};

export const getGetIngestionKeyQueryOptions = <
	TData = Awaited<ReturnType<typeof getIngestionKey>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ keyId }: GetIngestionKeyPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getIngestionKey>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetIngestionKeyQueryKey({ keyId });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getIngestionKey>>> = ({
		signal,
	}) => getIngestionKey({ keyId }, signal);

	return {
		queryKey,
		queryFn,
		enabled: keyId !== null && keyId !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getIngestionKey>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetIngestionKeyQueryResult = NonNullable<
	Awaited<ReturnType<typeof getIngestionKey>>
>;
export type GetIngestionKeyQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get ingestion key for workspace
 */

export function useGetIngestionKey<
	TData = Awaited<ReturnType<typeof getIngestionKey>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ keyId }: GetIngestionKeyPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getIngestionKey>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetIngestionKeyQueryOptions({ keyId }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetIngestionKey} query
 */
export const invalidateGetIngestionKey = async (
	queryClient: QueryClient,
	{ keyId }: GetIngestionKeyPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetIngestionKeyQueryKey({ keyId }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint updates an ingestion key for the workspace
 * @summary Update ingestion key for workspace
 */
export const updateIngestionKey = (
	{ keyId }: UpdateIngestionKeyPathParameters,
	gatewaytypesPostableIngestionKeyDTO?: BodyType<GatewaytypesPostableIngestionKeyDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/gateway/ingestion_keys/${keyId}`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		data: gatewaytypesPostableIngestionKeyDTO,
		signal,
	});
};

export const getUpdateIngestionKeyMutationKey = () =>
	['updateIngestionKey'] as const;

export const getUpdateIngestionKeyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateIngestionKey>>,
		TError,
		UpdateIngestionKeyMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateIngestionKey>>,
	TError,
	UpdateIngestionKeyMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateIngestionKeyMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateIngestionKey>>,
		UpdateIngestionKeyMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateIngestionKey(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateIngestionKeyMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateIngestionKey>>
>;
export type UpdateIngestionKeyMutationBody =
	| BodyType<GatewaytypesPostableIngestionKeyDTO>
	| undefined;
export type UpdateIngestionKeyMutationError = ErrorType<RenderErrorResponseDTO>;
export type UpdateIngestionKeyMutationVariables = {
	pathParams: UpdateIngestionKeyPathParameters;
	data?: BodyType<GatewaytypesPostableIngestionKeyDTO>;
};

/**
 * @summary Update ingestion key for workspace
 */
export const useUpdateIngestionKey = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateIngestionKey>>,
		TError,
		UpdateIngestionKeyMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateIngestionKey>>,
	TError,
	UpdateIngestionKeyMutationVariables,
	TContext
> => {
	return useMutation(getUpdateIngestionKeyMutationOptions(options));
};
/**
 * This endpoint returns the ingestion limits for an ingestion key
 * @summary Get limits for the ingestion key
 */
export const getIngestionKeyLimits = (
	{ keyId }: GetIngestionKeyLimitsPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetIngestionKeyLimits200>({
		url: `/api/v2/gateway/ingestion_keys/${keyId}/limits`,
		method: 'GET',
		signal,
	});
};

export const getGetIngestionKeyLimitsQueryKey = ({
	keyId,
}: GetIngestionKeyLimitsPathParameters) => {
	return [`/api/v2/gateway/ingestion_keys/${keyId}/limits`] as const;
};

export const getGetIngestionKeyLimitsQueryOptions = <
	TData = Awaited<ReturnType<typeof getIngestionKeyLimits>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ keyId }: GetIngestionKeyLimitsPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getIngestionKeyLimits>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetIngestionKeyLimitsQueryKey({ keyId });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getIngestionKeyLimits>>
	> = ({ signal }) => getIngestionKeyLimits({ keyId }, signal);

	return {
		queryKey,
		queryFn,
		enabled: keyId !== null && keyId !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getIngestionKeyLimits>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetIngestionKeyLimitsQueryResult = NonNullable<
	Awaited<ReturnType<typeof getIngestionKeyLimits>>
>;
export type GetIngestionKeyLimitsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get limits for the ingestion key
 */

export function useGetIngestionKeyLimits<
	TData = Awaited<ReturnType<typeof getIngestionKeyLimits>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ keyId }: GetIngestionKeyLimitsPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getIngestionKeyLimits>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetIngestionKeyLimitsQueryOptions({ keyId }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetIngestionKeyLimits} query
 */
export const invalidateGetIngestionKeyLimits = async (
	queryClient: QueryClient,
	{ keyId }: GetIngestionKeyLimitsPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetIngestionKeyLimitsQueryKey({ keyId }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates an ingestion key limit.
 * @deprecated
 * @summary Create limit for the ingestion key
 */
export const createIngestionKeyLimit = (
	{ keyId }: CreateIngestionKeyLimitPathParameters,
	gatewaytypesDeprecatedPostableIngestionKeyLimitDTO?: BodyType<GatewaytypesDeprecatedPostableIngestionKeyLimitDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateIngestionKeyLimit201>({
		url: `/api/v2/gateway/ingestion_keys/${keyId}/limits`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: gatewaytypesDeprecatedPostableIngestionKeyLimitDTO,
		signal,
	});
};

export const getCreateIngestionKeyLimitMutationKey = () =>
	['createIngestionKeyLimit'] as const;

export const getCreateIngestionKeyLimitMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createIngestionKeyLimit>>,
		TError,
		CreateIngestionKeyLimitMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createIngestionKeyLimit>>,
	TError,
	CreateIngestionKeyLimitMutationVariables,
	TContext
> => {
	const mutationKey = getCreateIngestionKeyLimitMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createIngestionKeyLimit>>,
		CreateIngestionKeyLimitMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return createIngestionKeyLimit(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateIngestionKeyLimitMutationResult = NonNullable<
	Awaited<ReturnType<typeof createIngestionKeyLimit>>
>;
export type CreateIngestionKeyLimitMutationBody =
	| BodyType<GatewaytypesDeprecatedPostableIngestionKeyLimitDTO>
	| undefined;
export type CreateIngestionKeyLimitMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type CreateIngestionKeyLimitMutationVariables = {
	pathParams: CreateIngestionKeyLimitPathParameters;
	data?: BodyType<GatewaytypesDeprecatedPostableIngestionKeyLimitDTO>;
};

/**
 * @deprecated
 * @summary Create limit for the ingestion key
 */
export const useCreateIngestionKeyLimit = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createIngestionKeyLimit>>,
		TError,
		CreateIngestionKeyLimitMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createIngestionKeyLimit>>,
	TError,
	CreateIngestionKeyLimitMutationVariables,
	TContext
> => {
	return useMutation(getCreateIngestionKeyLimitMutationOptions(options));
};
/**
 * This endpoint deletes an ingestion key limit
 * @deprecated
 * @summary Delete limit for the ingestion key
 */
export const deleteIngestionKeyLimit = (
	{ limitId }: DeleteIngestionKeyLimitPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/gateway/ingestion_keys/limits/${limitId}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteIngestionKeyLimitMutationKey = () =>
	['deleteIngestionKeyLimit'] as const;

export const getDeleteIngestionKeyLimitMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteIngestionKeyLimit>>,
		TError,
		DeleteIngestionKeyLimitMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteIngestionKeyLimit>>,
	TError,
	DeleteIngestionKeyLimitMutationVariables,
	TContext
> => {
	const mutationKey = getDeleteIngestionKeyLimitMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteIngestionKeyLimit>>,
		DeleteIngestionKeyLimitMutationVariables
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteIngestionKeyLimit(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteIngestionKeyLimitMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteIngestionKeyLimit>>
>;

export type DeleteIngestionKeyLimitMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type DeleteIngestionKeyLimitMutationVariables = {
	pathParams: DeleteIngestionKeyLimitPathParameters;
};

/**
 * @deprecated
 * @summary Delete limit for the ingestion key
 */
export const useDeleteIngestionKeyLimit = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteIngestionKeyLimit>>,
		TError,
		DeleteIngestionKeyLimitMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteIngestionKeyLimit>>,
	TError,
	DeleteIngestionKeyLimitMutationVariables,
	TContext
> => {
	return useMutation(getDeleteIngestionKeyLimitMutationOptions(options));
};
/**
 * This endpoint updates an ingestion key limit.
 * @deprecated
 * @summary Update limit for the ingestion key
 */
export const updateIngestionKeyLimit = (
	{ limitId }: UpdateIngestionKeyLimitPathParameters,
	gatewaytypesUpdatableIngestionKeyLimitDTO?: BodyType<GatewaytypesUpdatableIngestionKeyLimitDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/gateway/ingestion_keys/limits/${limitId}`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		data: gatewaytypesUpdatableIngestionKeyLimitDTO,
		signal,
	});
};

export const getUpdateIngestionKeyLimitMutationKey = () =>
	['updateIngestionKeyLimit'] as const;

export const getUpdateIngestionKeyLimitMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateIngestionKeyLimit>>,
		TError,
		UpdateIngestionKeyLimitMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateIngestionKeyLimit>>,
	TError,
	UpdateIngestionKeyLimitMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateIngestionKeyLimitMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateIngestionKeyLimit>>,
		UpdateIngestionKeyLimitMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateIngestionKeyLimit(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateIngestionKeyLimitMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateIngestionKeyLimit>>
>;
export type UpdateIngestionKeyLimitMutationBody =
	| BodyType<GatewaytypesUpdatableIngestionKeyLimitDTO>
	| undefined;
export type UpdateIngestionKeyLimitMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type UpdateIngestionKeyLimitMutationVariables = {
	pathParams: UpdateIngestionKeyLimitPathParameters;
	data?: BodyType<GatewaytypesUpdatableIngestionKeyLimitDTO>;
};

/**
 * @deprecated
 * @summary Update limit for the ingestion key
 */
export const useUpdateIngestionKeyLimit = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateIngestionKeyLimit>>,
		TError,
		UpdateIngestionKeyLimitMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateIngestionKeyLimit>>,
	TError,
	UpdateIngestionKeyLimitMutationVariables,
	TContext
> => {
	return useMutation(getUpdateIngestionKeyLimitMutationOptions(options));
};
/**
 * This endpoint returns the ingestion keys for a workspace
 * @summary Search ingestion keys for workspace
 */
export const searchIngestionKeys = (
	params: SearchIngestionKeysParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<SearchIngestionKeys200>({
		url: `/api/v2/gateway/ingestion_keys/search`,
		method: 'GET',
		params,
		signal,
	});
};

export const getSearchIngestionKeysQueryKey = (
	params?: SearchIngestionKeysParams,
) => {
	return [
		`/api/v2/gateway/ingestion_keys/search`,
		...(params ? [params] : []),
	] as const;
};

export const getSearchIngestionKeysQueryOptions = <
	TData = Awaited<ReturnType<typeof searchIngestionKeys>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params: SearchIngestionKeysParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof searchIngestionKeys>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getSearchIngestionKeysQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof searchIngestionKeys>>
	> = ({ signal }) => searchIngestionKeys(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof searchIngestionKeys>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type SearchIngestionKeysQueryResult = NonNullable<
	Awaited<ReturnType<typeof searchIngestionKeys>>
>;
export type SearchIngestionKeysQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Search ingestion keys for workspace
 */

export function useSearchIngestionKeys<
	TData = Awaited<ReturnType<typeof searchIngestionKeys>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params: SearchIngestionKeysParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof searchIngestionKeys>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getSearchIngestionKeysQueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useSearchIngestionKeys} query
 */
export const invalidateSearchIngestionKeys = async (
	queryClient: QueryClient,
	params: SearchIngestionKeysParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getSearchIngestionKeysQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates an ingestion limit for the ingestion key referenced by keyId
 * @summary Create ingestion limit
 */
export const createIngestionLimit = (
	gatewaytypesPostableIngestionKeyLimitDTO?: BodyType<GatewaytypesPostableIngestionKeyLimitDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateIngestionLimit201>({
		url: `/api/v2/gateway/ingestion_limits`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: gatewaytypesPostableIngestionKeyLimitDTO,
		signal,
	});
};

export const getCreateIngestionLimitMutationKey = () =>
	['createIngestionLimit'] as const;

export const getCreateIngestionLimitMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createIngestionLimit>>,
		TError,
		CreateIngestionLimitMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createIngestionLimit>>,
	TError,
	CreateIngestionLimitMutationVariables,
	TContext
> => {
	const mutationKey = getCreateIngestionLimitMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createIngestionLimit>>,
		CreateIngestionLimitMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return createIngestionLimit(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateIngestionLimitMutationResult = NonNullable<
	Awaited<ReturnType<typeof createIngestionLimit>>
>;
export type CreateIngestionLimitMutationBody =
	| BodyType<GatewaytypesPostableIngestionKeyLimitDTO>
	| undefined;
export type CreateIngestionLimitMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type CreateIngestionLimitMutationVariables = {
	data?: BodyType<GatewaytypesPostableIngestionKeyLimitDTO>;
};

/**
 * @summary Create ingestion limit
 */
export const useCreateIngestionLimit = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createIngestionLimit>>,
		TError,
		CreateIngestionLimitMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createIngestionLimit>>,
	TError,
	CreateIngestionLimitMutationVariables,
	TContext
> => {
	return useMutation(getCreateIngestionLimitMutationOptions(options));
};
/**
 * This endpoint deletes an ingestion limit
 * @summary Delete ingestion limit
 */
export const deleteIngestionLimit = (
	{ limitId }: DeleteIngestionLimitPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/gateway/ingestion_limits/${limitId}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteIngestionLimitMutationKey = () =>
	['deleteIngestionLimit'] as const;

export const getDeleteIngestionLimitMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteIngestionLimit>>,
		TError,
		DeleteIngestionLimitMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteIngestionLimit>>,
	TError,
	DeleteIngestionLimitMutationVariables,
	TContext
> => {
	const mutationKey = getDeleteIngestionLimitMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteIngestionLimit>>,
		DeleteIngestionLimitMutationVariables
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteIngestionLimit(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteIngestionLimitMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteIngestionLimit>>
>;

export type DeleteIngestionLimitMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type DeleteIngestionLimitMutationVariables = {
	pathParams: DeleteIngestionLimitPathParameters;
};

/**
 * @summary Delete ingestion limit
 */
export const useDeleteIngestionLimit = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteIngestionLimit>>,
		TError,
		DeleteIngestionLimitMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteIngestionLimit>>,
	TError,
	DeleteIngestionLimitMutationVariables,
	TContext
> => {
	return useMutation(getDeleteIngestionLimitMutationOptions(options));
};
/**
 * This endpoint returns an ingestion limit
 * @summary Get ingestion limit
 */
export const getIngestionLimit = (
	{ limitId }: GetIngestionLimitPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetIngestionLimit200>({
		url: `/api/v2/gateway/ingestion_limits/${limitId}`,
		method: 'GET',
		signal,
	});
};

export const getGetIngestionLimitQueryKey = ({
	limitId,
}: GetIngestionLimitPathParameters) => {
	return [`/api/v2/gateway/ingestion_limits/${limitId}`] as const;
};

export const getGetIngestionLimitQueryOptions = <
	TData = Awaited<ReturnType<typeof getIngestionLimit>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ limitId }: GetIngestionLimitPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getIngestionLimit>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetIngestionLimitQueryKey({ limitId });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getIngestionLimit>>
	> = ({ signal }) => getIngestionLimit({ limitId }, signal);

	return {
		queryKey,
		queryFn,
		enabled: limitId !== null && limitId !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getIngestionLimit>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetIngestionLimitQueryResult = NonNullable<
	Awaited<ReturnType<typeof getIngestionLimit>>
>;
export type GetIngestionLimitQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get ingestion limit
 */

export function useGetIngestionLimit<
	TData = Awaited<ReturnType<typeof getIngestionLimit>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ limitId }: GetIngestionLimitPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getIngestionLimit>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetIngestionLimitQueryOptions({ limitId }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetIngestionLimit} query
 */
export const invalidateGetIngestionLimit = async (
	queryClient: QueryClient,
	{ limitId }: GetIngestionLimitPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetIngestionLimitQueryKey({ limitId }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint updates an ingestion limit
 * @summary Update ingestion limit
 */
export const updateIngestionLimit = (
	{ limitId }: UpdateIngestionLimitPathParameters,
	gatewaytypesUpdatableIngestionKeyLimitDTO?: BodyType<GatewaytypesUpdatableIngestionKeyLimitDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/gateway/ingestion_limits/${limitId}`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		data: gatewaytypesUpdatableIngestionKeyLimitDTO,
		signal,
	});
};

export const getUpdateIngestionLimitMutationKey = () =>
	['updateIngestionLimit'] as const;

export const getUpdateIngestionLimitMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateIngestionLimit>>,
		TError,
		UpdateIngestionLimitMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateIngestionLimit>>,
	TError,
	UpdateIngestionLimitMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateIngestionLimitMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateIngestionLimit>>,
		UpdateIngestionLimitMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateIngestionLimit(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateIngestionLimitMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateIngestionLimit>>
>;
export type UpdateIngestionLimitMutationBody =
	| BodyType<GatewaytypesUpdatableIngestionKeyLimitDTO>
	| undefined;
export type UpdateIngestionLimitMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type UpdateIngestionLimitMutationVariables = {
	pathParams: UpdateIngestionLimitPathParameters;
	data?: BodyType<GatewaytypesUpdatableIngestionKeyLimitDTO>;
};

/**
 * @summary Update ingestion limit
 */
export const useUpdateIngestionLimit = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateIngestionLimit>>,
		TError,
		UpdateIngestionLimitMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateIngestionLimit>>,
	TError,
	UpdateIngestionLimitMutationVariables,
	TContext
> => {
	return useMutation(getUpdateIngestionLimitMutationOptions(options));
};
