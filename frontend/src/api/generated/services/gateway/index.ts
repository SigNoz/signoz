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
	CreateIngestionKey200,
	CreateIngestionKeyLimit201,
	CreateIngestionKeyLimitPathParameters,
	DeleteIngestionKeyLimitPathParameters,
	DeleteIngestionKeyPathParameters,
	GatewaytypesPostableIngestionKeyDTO,
	GatewaytypesPostableIngestionKeyLimitDTO,
	GatewaytypesUpdatableIngestionKeyLimitDTO,
	GetIngestionKeys200,
	RenderErrorResponseDTO,
	SearchIngestionKeys200,
	UpdateIngestionKeyLimitPathParameters,
	UpdateIngestionKeyPathParameters,
} from '../sigNoz.schemas';

type AwaitedInput<T> = PromiseLike<T> | T;

type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

/**
 * This endpoint returns the ingestion keys for a workspace
 * @summary Get ingestion keys for workspace
 */
export const getIngestionKeys = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetIngestionKeys200>({
		url: `/api/v2/gateway/ingestion_keys`,
		method: 'GET',
		signal,
	});
};

export const getGetIngestionKeysQueryKey = () => {
	return ['getIngestionKeys'] as const;
};

export const getGetIngestionKeysQueryOptions = <
	TData = Awaited<ReturnType<typeof getIngestionKeys>>,
	TError = RenderErrorResponseDTO
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getIngestionKeys>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetIngestionKeysQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getIngestionKeys>>> = ({
		signal,
	}) => getIngestionKeys(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getIngestionKeys>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetIngestionKeysQueryResult = NonNullable<
	Awaited<ReturnType<typeof getIngestionKeys>>
>;
export type GetIngestionKeysQueryError = RenderErrorResponseDTO;

/**
 * @summary Get ingestion keys for workspace
 */

export function useGetIngestionKeys<
	TData = Awaited<ReturnType<typeof getIngestionKeys>>,
	TError = RenderErrorResponseDTO
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getIngestionKeys>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetIngestionKeysQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get ingestion keys for workspace
 */
export const invalidateGetIngestionKeys = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetIngestionKeysQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates an ingestion key for the workspace
 * @summary Create ingestion key for workspace
 */
export const createIngestionKey = (
	gatewaytypesPostableIngestionKeyDTO: GatewaytypesPostableIngestionKeyDTO,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateIngestionKey200>({
		url: `/api/v2/gateway/ingestion_keys`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: gatewaytypesPostableIngestionKeyDTO,
		signal,
	});
};

export const getCreateIngestionKeyMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createIngestionKey>>,
		TError,
		{ data: GatewaytypesPostableIngestionKeyDTO },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createIngestionKey>>,
	TError,
	{ data: GatewaytypesPostableIngestionKeyDTO },
	TContext
> => {
	const mutationKey = ['createIngestionKey'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createIngestionKey>>,
		{ data: GatewaytypesPostableIngestionKeyDTO }
	> = (props) => {
		const { data } = props ?? {};

		return createIngestionKey(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateIngestionKeyMutationResult = NonNullable<
	Awaited<ReturnType<typeof createIngestionKey>>
>;
export type CreateIngestionKeyMutationBody = GatewaytypesPostableIngestionKeyDTO;
export type CreateIngestionKeyMutationError = RenderErrorResponseDTO;

/**
 * @summary Create ingestion key for workspace
 */
export const useCreateIngestionKey = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createIngestionKey>>,
		TError,
		{ data: GatewaytypesPostableIngestionKeyDTO },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createIngestionKey>>,
	TError,
	{ data: GatewaytypesPostableIngestionKeyDTO },
	TContext
> => {
	const mutationOptions = getCreateIngestionKeyMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint deletes an ingestion key for the workspace
 * @summary Delete ingestion key for workspace
 */
export const deleteIngestionKey = ({
	keyId,
}: DeleteIngestionKeyPathParameters) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/gateway/ingestion_keys/${keyId}`,
		method: 'DELETE',
	});
};

export const getDeleteIngestionKeyMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteIngestionKey>>,
		TError,
		{ pathParams: DeleteIngestionKeyPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteIngestionKey>>,
	TError,
	{ pathParams: DeleteIngestionKeyPathParameters },
	TContext
> => {
	const mutationKey = ['deleteIngestionKey'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteIngestionKey>>,
		{ pathParams: DeleteIngestionKeyPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteIngestionKey(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteIngestionKeyMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteIngestionKey>>
>;

export type DeleteIngestionKeyMutationError = RenderErrorResponseDTO;

/**
 * @summary Delete ingestion key for workspace
 */
export const useDeleteIngestionKey = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteIngestionKey>>,
		TError,
		{ pathParams: DeleteIngestionKeyPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteIngestionKey>>,
	TError,
	{ pathParams: DeleteIngestionKeyPathParameters },
	TContext
> => {
	const mutationOptions = getDeleteIngestionKeyMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint updates an ingestion key for the workspace
 * @summary Update ingestion key for workspace
 */
export const updateIngestionKey = (
	{ keyId }: UpdateIngestionKeyPathParameters,
	gatewaytypesPostableIngestionKeyDTO: GatewaytypesPostableIngestionKeyDTO,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/gateway/ingestion_keys/${keyId}`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		data: gatewaytypesPostableIngestionKeyDTO,
	});
};

export const getUpdateIngestionKeyMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateIngestionKey>>,
		TError,
		{
			pathParams: UpdateIngestionKeyPathParameters;
			data: GatewaytypesPostableIngestionKeyDTO;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateIngestionKey>>,
	TError,
	{
		pathParams: UpdateIngestionKeyPathParameters;
		data: GatewaytypesPostableIngestionKeyDTO;
	},
	TContext
> => {
	const mutationKey = ['updateIngestionKey'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateIngestionKey>>,
		{
			pathParams: UpdateIngestionKeyPathParameters;
			data: GatewaytypesPostableIngestionKeyDTO;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateIngestionKey(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateIngestionKeyMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateIngestionKey>>
>;
export type UpdateIngestionKeyMutationBody = GatewaytypesPostableIngestionKeyDTO;
export type UpdateIngestionKeyMutationError = RenderErrorResponseDTO;

/**
 * @summary Update ingestion key for workspace
 */
export const useUpdateIngestionKey = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateIngestionKey>>,
		TError,
		{
			pathParams: UpdateIngestionKeyPathParameters;
			data: GatewaytypesPostableIngestionKeyDTO;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateIngestionKey>>,
	TError,
	{
		pathParams: UpdateIngestionKeyPathParameters;
		data: GatewaytypesPostableIngestionKeyDTO;
	},
	TContext
> => {
	const mutationOptions = getUpdateIngestionKeyMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint creates an ingestion key limit
 * @summary Create limit for the ingestion key
 */
export const createIngestionKeyLimit = (
	{ keyId }: CreateIngestionKeyLimitPathParameters,
	gatewaytypesPostableIngestionKeyLimitDTO: GatewaytypesPostableIngestionKeyLimitDTO,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateIngestionKeyLimit201>({
		url: `/api/v2/gateway/ingestion_keys/${keyId}/limits`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: gatewaytypesPostableIngestionKeyLimitDTO,
		signal,
	});
};

export const getCreateIngestionKeyLimitMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createIngestionKeyLimit>>,
		TError,
		{
			pathParams: CreateIngestionKeyLimitPathParameters;
			data: GatewaytypesPostableIngestionKeyLimitDTO;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createIngestionKeyLimit>>,
	TError,
	{
		pathParams: CreateIngestionKeyLimitPathParameters;
		data: GatewaytypesPostableIngestionKeyLimitDTO;
	},
	TContext
> => {
	const mutationKey = ['createIngestionKeyLimit'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createIngestionKeyLimit>>,
		{
			pathParams: CreateIngestionKeyLimitPathParameters;
			data: GatewaytypesPostableIngestionKeyLimitDTO;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return createIngestionKeyLimit(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateIngestionKeyLimitMutationResult = NonNullable<
	Awaited<ReturnType<typeof createIngestionKeyLimit>>
>;
export type CreateIngestionKeyLimitMutationBody = GatewaytypesPostableIngestionKeyLimitDTO;
export type CreateIngestionKeyLimitMutationError = RenderErrorResponseDTO;

/**
 * @summary Create limit for the ingestion key
 */
export const useCreateIngestionKeyLimit = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createIngestionKeyLimit>>,
		TError,
		{
			pathParams: CreateIngestionKeyLimitPathParameters;
			data: GatewaytypesPostableIngestionKeyLimitDTO;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createIngestionKeyLimit>>,
	TError,
	{
		pathParams: CreateIngestionKeyLimitPathParameters;
		data: GatewaytypesPostableIngestionKeyLimitDTO;
	},
	TContext
> => {
	const mutationOptions = getCreateIngestionKeyLimitMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint deletes an ingestion key limit
 * @summary Delete limit for the ingestion key
 */
export const deleteIngestionKeyLimit = ({
	limitId,
}: DeleteIngestionKeyLimitPathParameters) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/gateway/ingestion_keys/limits/${limitId}`,
		method: 'DELETE',
	});
};

export const getDeleteIngestionKeyLimitMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteIngestionKeyLimit>>,
		TError,
		{ pathParams: DeleteIngestionKeyLimitPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteIngestionKeyLimit>>,
	TError,
	{ pathParams: DeleteIngestionKeyLimitPathParameters },
	TContext
> => {
	const mutationKey = ['deleteIngestionKeyLimit'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteIngestionKeyLimit>>,
		{ pathParams: DeleteIngestionKeyLimitPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteIngestionKeyLimit(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteIngestionKeyLimitMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteIngestionKeyLimit>>
>;

export type DeleteIngestionKeyLimitMutationError = RenderErrorResponseDTO;

/**
 * @summary Delete limit for the ingestion key
 */
export const useDeleteIngestionKeyLimit = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteIngestionKeyLimit>>,
		TError,
		{ pathParams: DeleteIngestionKeyLimitPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteIngestionKeyLimit>>,
	TError,
	{ pathParams: DeleteIngestionKeyLimitPathParameters },
	TContext
> => {
	const mutationOptions = getDeleteIngestionKeyLimitMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint updates an ingestion key limit
 * @summary Update limit for the ingestion key
 */
export const updateIngestionKeyLimit = (
	{ limitId }: UpdateIngestionKeyLimitPathParameters,
	gatewaytypesUpdatableIngestionKeyLimitDTO: GatewaytypesUpdatableIngestionKeyLimitDTO,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/gateway/ingestion_keys/limits/${limitId}`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		data: gatewaytypesUpdatableIngestionKeyLimitDTO,
	});
};

export const getUpdateIngestionKeyLimitMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateIngestionKeyLimit>>,
		TError,
		{
			pathParams: UpdateIngestionKeyLimitPathParameters;
			data: GatewaytypesUpdatableIngestionKeyLimitDTO;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateIngestionKeyLimit>>,
	TError,
	{
		pathParams: UpdateIngestionKeyLimitPathParameters;
		data: GatewaytypesUpdatableIngestionKeyLimitDTO;
	},
	TContext
> => {
	const mutationKey = ['updateIngestionKeyLimit'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateIngestionKeyLimit>>,
		{
			pathParams: UpdateIngestionKeyLimitPathParameters;
			data: GatewaytypesUpdatableIngestionKeyLimitDTO;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateIngestionKeyLimit(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateIngestionKeyLimitMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateIngestionKeyLimit>>
>;
export type UpdateIngestionKeyLimitMutationBody = GatewaytypesUpdatableIngestionKeyLimitDTO;
export type UpdateIngestionKeyLimitMutationError = RenderErrorResponseDTO;

/**
 * @summary Update limit for the ingestion key
 */
export const useUpdateIngestionKeyLimit = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateIngestionKeyLimit>>,
		TError,
		{
			pathParams: UpdateIngestionKeyLimitPathParameters;
			data: GatewaytypesUpdatableIngestionKeyLimitDTO;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateIngestionKeyLimit>>,
	TError,
	{
		pathParams: UpdateIngestionKeyLimitPathParameters;
		data: GatewaytypesUpdatableIngestionKeyLimitDTO;
	},
	TContext
> => {
	const mutationOptions = getUpdateIngestionKeyLimitMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint returns the ingestion keys for a workspace
 * @summary Search ingestion keys for workspace
 */
export const searchIngestionKeys = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<SearchIngestionKeys200>({
		url: `/api/v2/gateway/ingestion_keys/search`,
		method: 'GET',
		signal,
	});
};

export const getSearchIngestionKeysQueryKey = () => {
	return ['searchIngestionKeys'] as const;
};

export const getSearchIngestionKeysQueryOptions = <
	TData = Awaited<ReturnType<typeof searchIngestionKeys>>,
	TError = RenderErrorResponseDTO
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof searchIngestionKeys>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getSearchIngestionKeysQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof searchIngestionKeys>>
	> = ({ signal }) => searchIngestionKeys(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof searchIngestionKeys>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type SearchIngestionKeysQueryResult = NonNullable<
	Awaited<ReturnType<typeof searchIngestionKeys>>
>;
export type SearchIngestionKeysQueryError = RenderErrorResponseDTO;

/**
 * @summary Search ingestion keys for workspace
 */

export function useSearchIngestionKeys<
	TData = Awaited<ReturnType<typeof searchIngestionKeys>>,
	TError = RenderErrorResponseDTO
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof searchIngestionKeys>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getSearchIngestionKeysQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Search ingestion keys for workspace
 */
export const invalidateSearchIngestionKeys = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getSearchIngestionKeysQueryKey() },
		options,
	);

	return queryClient;
};
