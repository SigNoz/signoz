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
	CreateSpanMapper201,
	CreateSpanMapperGroup201,
	CreateSpanMapperPathParameters,
	DeleteSpanMapperGroupPathParameters,
	DeleteSpanMapperPathParameters,
	ListSpanMapperGroups200,
	ListSpanMapperGroupsParams,
	ListSpanMappers200,
	ListSpanMappersPathParameters,
	RenderErrorResponseDTO,
	SpantypesPostableSpanMapperDTO,
	SpantypesPostableSpanMapperGroupDTO,
	SpantypesUpdatableSpanMapperDTO,
	SpantypesUpdatableSpanMapperGroupDTO,
	UpdateSpanMapperGroupPathParameters,
	UpdateSpanMapperPathParameters,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * Returns all span attribute mapping groups for the authenticated org.
 * @summary List span attribute mapping groups
 */
export const listSpanMapperGroups = (
	params?: ListSpanMapperGroupsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListSpanMapperGroups200>({
		url: `/api/v1/span_mapper_groups`,
		method: 'GET',
		params,
		signal,
	});
};

export const getListSpanMapperGroupsQueryKey = (
	params?: ListSpanMapperGroupsParams,
) => {
	return [`/api/v1/span_mapper_groups`, ...(params ? [params] : [])] as const;
};

export const getListSpanMapperGroupsQueryOptions = <
	TData = Awaited<ReturnType<typeof listSpanMapperGroups>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: ListSpanMapperGroupsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listSpanMapperGroups>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getListSpanMapperGroupsQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listSpanMapperGroups>>
	> = ({ signal }) => listSpanMapperGroups(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listSpanMapperGroups>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListSpanMapperGroupsQueryResult = NonNullable<
	Awaited<ReturnType<typeof listSpanMapperGroups>>
>;
export type ListSpanMapperGroupsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List span attribute mapping groups
 */

export function useListSpanMapperGroups<
	TData = Awaited<ReturnType<typeof listSpanMapperGroups>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: ListSpanMapperGroupsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listSpanMapperGroups>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListSpanMapperGroupsQueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List span attribute mapping groups
 */
export const invalidateListSpanMapperGroups = async (
	queryClient: QueryClient,
	params?: ListSpanMapperGroupsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListSpanMapperGroupsQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * Creates a new span attribute mapping group for the org.
 * @summary Create a span attribute mapping group
 */
export const createSpanMapperGroup = (
	spantypesPostableSpanMapperGroupDTO: BodyType<SpantypesPostableSpanMapperGroupDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateSpanMapperGroup201>({
		url: `/api/v1/span_mapper_groups`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: spantypesPostableSpanMapperGroupDTO,
		signal,
	});
};

export const getCreateSpanMapperGroupMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createSpanMapperGroup>>,
		TError,
		{ data: BodyType<SpantypesPostableSpanMapperGroupDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createSpanMapperGroup>>,
	TError,
	{ data: BodyType<SpantypesPostableSpanMapperGroupDTO> },
	TContext
> => {
	const mutationKey = ['createSpanMapperGroup'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createSpanMapperGroup>>,
		{ data: BodyType<SpantypesPostableSpanMapperGroupDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createSpanMapperGroup(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateSpanMapperGroupMutationResult = NonNullable<
	Awaited<ReturnType<typeof createSpanMapperGroup>>
>;
export type CreateSpanMapperGroupMutationBody =
	BodyType<SpantypesPostableSpanMapperGroupDTO>;
export type CreateSpanMapperGroupMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create a span attribute mapping group
 */
export const useCreateSpanMapperGroup = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createSpanMapperGroup>>,
		TError,
		{ data: BodyType<SpantypesPostableSpanMapperGroupDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createSpanMapperGroup>>,
	TError,
	{ data: BodyType<SpantypesPostableSpanMapperGroupDTO> },
	TContext
> => {
	const mutationOptions = getCreateSpanMapperGroupMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Hard-deletes a mapping group and cascades to all its mappers.
 * @summary Delete a span attribute mapping group
 */
export const deleteSpanMapperGroup = ({
	groupId,
}: DeleteSpanMapperGroupPathParameters) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/span_mapper_groups/${groupId}`,
		method: 'DELETE',
	});
};

export const getDeleteSpanMapperGroupMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteSpanMapperGroup>>,
		TError,
		{ pathParams: DeleteSpanMapperGroupPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteSpanMapperGroup>>,
	TError,
	{ pathParams: DeleteSpanMapperGroupPathParameters },
	TContext
> => {
	const mutationKey = ['deleteSpanMapperGroup'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteSpanMapperGroup>>,
		{ pathParams: DeleteSpanMapperGroupPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteSpanMapperGroup(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteSpanMapperGroupMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteSpanMapperGroup>>
>;

export type DeleteSpanMapperGroupMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete a span attribute mapping group
 */
export const useDeleteSpanMapperGroup = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteSpanMapperGroup>>,
		TError,
		{ pathParams: DeleteSpanMapperGroupPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteSpanMapperGroup>>,
	TError,
	{ pathParams: DeleteSpanMapperGroupPathParameters },
	TContext
> => {
	const mutationOptions = getDeleteSpanMapperGroupMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Partially updates an existing mapping group's name, condition, or enabled state.
 * @summary Update a span attribute mapping group
 */
export const updateSpanMapperGroup = (
	{ groupId }: UpdateSpanMapperGroupPathParameters,
	spantypesUpdatableSpanMapperGroupDTO: BodyType<SpantypesUpdatableSpanMapperGroupDTO>,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/span_mapper_groups/${groupId}`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		data: spantypesUpdatableSpanMapperGroupDTO,
	});
};

export const getUpdateSpanMapperGroupMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateSpanMapperGroup>>,
		TError,
		{
			pathParams: UpdateSpanMapperGroupPathParameters;
			data: BodyType<SpantypesUpdatableSpanMapperGroupDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateSpanMapperGroup>>,
	TError,
	{
		pathParams: UpdateSpanMapperGroupPathParameters;
		data: BodyType<SpantypesUpdatableSpanMapperGroupDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateSpanMapperGroup'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateSpanMapperGroup>>,
		{
			pathParams: UpdateSpanMapperGroupPathParameters;
			data: BodyType<SpantypesUpdatableSpanMapperGroupDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateSpanMapperGroup(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateSpanMapperGroupMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateSpanMapperGroup>>
>;
export type UpdateSpanMapperGroupMutationBody =
	BodyType<SpantypesUpdatableSpanMapperGroupDTO>;
export type UpdateSpanMapperGroupMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update a span attribute mapping group
 */
export const useUpdateSpanMapperGroup = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateSpanMapperGroup>>,
		TError,
		{
			pathParams: UpdateSpanMapperGroupPathParameters;
			data: BodyType<SpantypesUpdatableSpanMapperGroupDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateSpanMapperGroup>>,
	TError,
	{
		pathParams: UpdateSpanMapperGroupPathParameters;
		data: BodyType<SpantypesUpdatableSpanMapperGroupDTO>;
	},
	TContext
> => {
	const mutationOptions = getUpdateSpanMapperGroupMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Returns all mappers belonging to a mapping group.
 * @summary List span mappers for a group
 */
export const listSpanMappers = (
	{ groupId }: ListSpanMappersPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListSpanMappers200>({
		url: `/api/v1/span_mapper_groups/${groupId}/span_mappers`,
		method: 'GET',
		signal,
	});
};

export const getListSpanMappersQueryKey = ({
	groupId,
}: ListSpanMappersPathParameters) => {
	return [`/api/v1/span_mapper_groups/${groupId}/span_mappers`] as const;
};

export const getListSpanMappersQueryOptions = <
	TData = Awaited<ReturnType<typeof listSpanMappers>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ groupId }: ListSpanMappersPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listSpanMappers>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getListSpanMappersQueryKey({ groupId });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof listSpanMappers>>> = ({
		signal,
	}) => listSpanMappers({ groupId }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!groupId,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof listSpanMappers>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListSpanMappersQueryResult = NonNullable<
	Awaited<ReturnType<typeof listSpanMappers>>
>;
export type ListSpanMappersQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List span mappers for a group
 */

export function useListSpanMappers<
	TData = Awaited<ReturnType<typeof listSpanMappers>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ groupId }: ListSpanMappersPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listSpanMappers>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListSpanMappersQueryOptions({ groupId }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List span mappers for a group
 */
export const invalidateListSpanMappers = async (
	queryClient: QueryClient,
	{ groupId }: ListSpanMappersPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListSpanMappersQueryKey({ groupId }) },
		options,
	);

	return queryClient;
};

/**
 * Adds a new mapper to the specified mapping group.
 * @summary Create a span mapper
 */
export const createSpanMapper = (
	{ groupId }: CreateSpanMapperPathParameters,
	spantypesPostableSpanMapperDTO: BodyType<SpantypesPostableSpanMapperDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateSpanMapper201>({
		url: `/api/v1/span_mapper_groups/${groupId}/span_mappers`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: spantypesPostableSpanMapperDTO,
		signal,
	});
};

export const getCreateSpanMapperMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createSpanMapper>>,
		TError,
		{
			pathParams: CreateSpanMapperPathParameters;
			data: BodyType<SpantypesPostableSpanMapperDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createSpanMapper>>,
	TError,
	{
		pathParams: CreateSpanMapperPathParameters;
		data: BodyType<SpantypesPostableSpanMapperDTO>;
	},
	TContext
> => {
	const mutationKey = ['createSpanMapper'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createSpanMapper>>,
		{
			pathParams: CreateSpanMapperPathParameters;
			data: BodyType<SpantypesPostableSpanMapperDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return createSpanMapper(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateSpanMapperMutationResult = NonNullable<
	Awaited<ReturnType<typeof createSpanMapper>>
>;
export type CreateSpanMapperMutationBody =
	BodyType<SpantypesPostableSpanMapperDTO>;
export type CreateSpanMapperMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create a span mapper
 */
export const useCreateSpanMapper = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createSpanMapper>>,
		TError,
		{
			pathParams: CreateSpanMapperPathParameters;
			data: BodyType<SpantypesPostableSpanMapperDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createSpanMapper>>,
	TError,
	{
		pathParams: CreateSpanMapperPathParameters;
		data: BodyType<SpantypesPostableSpanMapperDTO>;
	},
	TContext
> => {
	const mutationOptions = getCreateSpanMapperMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Hard-deletes a mapper from a mapping group.
 * @summary Delete a span mapper
 */
export const deleteSpanMapper = ({
	groupId,
	mapperId,
}: DeleteSpanMapperPathParameters) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/span_mapper_groups/${groupId}/span_mappers/${mapperId}`,
		method: 'DELETE',
	});
};

export const getDeleteSpanMapperMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteSpanMapper>>,
		TError,
		{ pathParams: DeleteSpanMapperPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteSpanMapper>>,
	TError,
	{ pathParams: DeleteSpanMapperPathParameters },
	TContext
> => {
	const mutationKey = ['deleteSpanMapper'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteSpanMapper>>,
		{ pathParams: DeleteSpanMapperPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteSpanMapper(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteSpanMapperMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteSpanMapper>>
>;

export type DeleteSpanMapperMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete a span mapper
 */
export const useDeleteSpanMapper = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteSpanMapper>>,
		TError,
		{ pathParams: DeleteSpanMapperPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteSpanMapper>>,
	TError,
	{ pathParams: DeleteSpanMapperPathParameters },
	TContext
> => {
	const mutationOptions = getDeleteSpanMapperMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Partially updates an existing mapper's field context, config, or enabled state.
 * @summary Update a span mapper
 */
export const updateSpanMapper = (
	{ groupId, mapperId }: UpdateSpanMapperPathParameters,
	spantypesUpdatableSpanMapperDTO: BodyType<SpantypesUpdatableSpanMapperDTO>,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/span_mapper_groups/${groupId}/span_mappers/${mapperId}`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		data: spantypesUpdatableSpanMapperDTO,
	});
};

export const getUpdateSpanMapperMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateSpanMapper>>,
		TError,
		{
			pathParams: UpdateSpanMapperPathParameters;
			data: BodyType<SpantypesUpdatableSpanMapperDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateSpanMapper>>,
	TError,
	{
		pathParams: UpdateSpanMapperPathParameters;
		data: BodyType<SpantypesUpdatableSpanMapperDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateSpanMapper'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateSpanMapper>>,
		{
			pathParams: UpdateSpanMapperPathParameters;
			data: BodyType<SpantypesUpdatableSpanMapperDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateSpanMapper(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateSpanMapperMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateSpanMapper>>
>;
export type UpdateSpanMapperMutationBody =
	BodyType<SpantypesUpdatableSpanMapperDTO>;
export type UpdateSpanMapperMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update a span mapper
 */
export const useUpdateSpanMapper = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateSpanMapper>>,
		TError,
		{
			pathParams: UpdateSpanMapperPathParameters;
			data: BodyType<SpantypesUpdatableSpanMapperDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateSpanMapper>>,
	TError,
	{
		pathParams: UpdateSpanMapperPathParameters;
		data: BodyType<SpantypesUpdatableSpanMapperDTO>;
	},
	TContext
> => {
	const mutationOptions = getUpdateSpanMapperMutationOptions(options);

	return useMutation(mutationOptions);
};
