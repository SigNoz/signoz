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

import type { CreateSpanMapper201 } from '../sigNoz.schemas/createSpanMapper201';

import type { CreateSpanMapperGroup201 } from '../sigNoz.schemas/createSpanMapperGroup201';

import type { CreateSpanMapperPathParameters } from '../sigNoz.schemas/createSpanMapperPathParameters';

import type { DeleteSpanMapperGroupPathParameters } from '../sigNoz.schemas/deleteSpanMapperGroupPathParameters';

import type { DeleteSpanMapperPathParameters } from '../sigNoz.schemas/deleteSpanMapperPathParameters';

import type { ListSpanMapperGroups200 } from '../sigNoz.schemas/listSpanMapperGroups200';

import type { ListSpanMapperGroupsParams } from '../sigNoz.schemas/listSpanMapperGroupsParams';

import type { ListSpanMappers200 } from '../sigNoz.schemas/listSpanMappers200';

import type { ListSpanMappersPathParameters } from '../sigNoz.schemas/listSpanMappersPathParameters';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

import type { SpantypesPostableSpanMapperDTO } from '../sigNoz.schemas/spantypesPostableSpanMapperDTO';

import type { SpantypesPostableSpanMapperGroupDTO } from '../sigNoz.schemas/spantypesPostableSpanMapperGroupDTO';

import type { SpantypesPostableSpanMapperTestDTO } from '../sigNoz.schemas/spantypesPostableSpanMapperTestDTO';

import type { SpantypesUpdatableSpanMapperDTO } from '../sigNoz.schemas/spantypesUpdatableSpanMapperDTO';

import type { SpantypesUpdatableSpanMapperGroupDTO } from '../sigNoz.schemas/spantypesUpdatableSpanMapperGroupDTO';

import type { TestSpanMappers200 } from '../sigNoz.schemas/testSpanMappers200';

import type { UpdateSpanMapperGroupPathParameters } from '../sigNoz.schemas/updateSpanMapperGroupPathParameters';

import type { UpdateSpanMapperPathParameters } from '../sigNoz.schemas/updateSpanMapperPathParameters';

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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListSpanMapperGroups} query
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
	spantypesPostableSpanMapperGroupDTO?: BodyType<SpantypesPostableSpanMapperGroupDTO>,
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

export const getCreateSpanMapperGroupMutationKey = () =>
	['createSpanMapperGroup'] as const;

export const getCreateSpanMapperGroupMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createSpanMapperGroup>>,
		TError,
		CreateSpanMapperGroupMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createSpanMapperGroup>>,
	TError,
	CreateSpanMapperGroupMutationVariables,
	TContext
> => {
	const mutationKey = getCreateSpanMapperGroupMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createSpanMapperGroup>>,
		CreateSpanMapperGroupMutationVariables
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
	| BodyType<SpantypesPostableSpanMapperGroupDTO>
	| undefined;
export type CreateSpanMapperGroupMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type CreateSpanMapperGroupMutationVariables = {
	data?: BodyType<SpantypesPostableSpanMapperGroupDTO>;
};

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
		CreateSpanMapperGroupMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createSpanMapperGroup>>,
	TError,
	CreateSpanMapperGroupMutationVariables,
	TContext
> => {
	return useMutation(getCreateSpanMapperGroupMutationOptions(options));
};
/**
 * Hard-deletes a mapping group and cascades to all its mappers.
 * @summary Delete a span attribute mapping group
 */
export const deleteSpanMapperGroup = (
	{ groupId }: DeleteSpanMapperGroupPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/span_mapper_groups/${groupId}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteSpanMapperGroupMutationKey = () =>
	['deleteSpanMapperGroup'] as const;

export const getDeleteSpanMapperGroupMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteSpanMapperGroup>>,
		TError,
		DeleteSpanMapperGroupMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteSpanMapperGroup>>,
	TError,
	DeleteSpanMapperGroupMutationVariables,
	TContext
> => {
	const mutationKey = getDeleteSpanMapperGroupMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteSpanMapperGroup>>,
		DeleteSpanMapperGroupMutationVariables
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
export type DeleteSpanMapperGroupMutationVariables = {
	pathParams: DeleteSpanMapperGroupPathParameters;
};

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
		DeleteSpanMapperGroupMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteSpanMapperGroup>>,
	TError,
	DeleteSpanMapperGroupMutationVariables,
	TContext
> => {
	return useMutation(getDeleteSpanMapperGroupMutationOptions(options));
};
/**
 * Partially updates an existing mapping group's name, condition, or enabled state.
 * @summary Update a span attribute mapping group
 */
export const updateSpanMapperGroup = (
	{ groupId }: UpdateSpanMapperGroupPathParameters,
	spantypesUpdatableSpanMapperGroupDTO?: BodyType<SpantypesUpdatableSpanMapperGroupDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/span_mapper_groups/${groupId}`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		data: spantypesUpdatableSpanMapperGroupDTO,
		signal,
	});
};

export const getUpdateSpanMapperGroupMutationKey = () =>
	['updateSpanMapperGroup'] as const;

export const getUpdateSpanMapperGroupMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateSpanMapperGroup>>,
		TError,
		UpdateSpanMapperGroupMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateSpanMapperGroup>>,
	TError,
	UpdateSpanMapperGroupMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateSpanMapperGroupMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateSpanMapperGroup>>,
		UpdateSpanMapperGroupMutationVariables
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
	| BodyType<SpantypesUpdatableSpanMapperGroupDTO>
	| undefined;
export type UpdateSpanMapperGroupMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type UpdateSpanMapperGroupMutationVariables = {
	pathParams: UpdateSpanMapperGroupPathParameters;
	data?: BodyType<SpantypesUpdatableSpanMapperGroupDTO>;
};

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
		UpdateSpanMapperGroupMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateSpanMapperGroup>>,
	TError,
	UpdateSpanMapperGroupMutationVariables,
	TContext
> => {
	return useMutation(getUpdateSpanMapperGroupMutationOptions(options));
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
		enabled: groupId !== null && groupId !== undefined,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListSpanMappers} query
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
	spantypesPostableSpanMapperDTO?: BodyType<SpantypesPostableSpanMapperDTO>,
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

export const getCreateSpanMapperMutationKey = () =>
	['createSpanMapper'] as const;

export const getCreateSpanMapperMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createSpanMapper>>,
		TError,
		CreateSpanMapperMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createSpanMapper>>,
	TError,
	CreateSpanMapperMutationVariables,
	TContext
> => {
	const mutationKey = getCreateSpanMapperMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createSpanMapper>>,
		CreateSpanMapperMutationVariables
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
	| BodyType<SpantypesPostableSpanMapperDTO>
	| undefined;
export type CreateSpanMapperMutationError = ErrorType<RenderErrorResponseDTO>;
export type CreateSpanMapperMutationVariables = {
	pathParams: CreateSpanMapperPathParameters;
	data?: BodyType<SpantypesPostableSpanMapperDTO>;
};

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
		CreateSpanMapperMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createSpanMapper>>,
	TError,
	CreateSpanMapperMutationVariables,
	TContext
> => {
	return useMutation(getCreateSpanMapperMutationOptions(options));
};
/**
 * Hard-deletes a mapper from a mapping group.
 * @summary Delete a span mapper
 */
export const deleteSpanMapper = (
	{ groupId, mapperId }: DeleteSpanMapperPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/span_mapper_groups/${groupId}/span_mappers/${mapperId}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteSpanMapperMutationKey = () =>
	['deleteSpanMapper'] as const;

export const getDeleteSpanMapperMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteSpanMapper>>,
		TError,
		DeleteSpanMapperMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteSpanMapper>>,
	TError,
	DeleteSpanMapperMutationVariables,
	TContext
> => {
	const mutationKey = getDeleteSpanMapperMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteSpanMapper>>,
		DeleteSpanMapperMutationVariables
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
export type DeleteSpanMapperMutationVariables = {
	pathParams: DeleteSpanMapperPathParameters;
};

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
		DeleteSpanMapperMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteSpanMapper>>,
	TError,
	DeleteSpanMapperMutationVariables,
	TContext
> => {
	return useMutation(getDeleteSpanMapperMutationOptions(options));
};
/**
 * Partially updates an existing mapper's field context, config, or enabled state.
 * @summary Update a span mapper
 */
export const updateSpanMapper = (
	{ groupId, mapperId }: UpdateSpanMapperPathParameters,
	spantypesUpdatableSpanMapperDTO?: BodyType<SpantypesUpdatableSpanMapperDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/span_mapper_groups/${groupId}/span_mappers/${mapperId}`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		data: spantypesUpdatableSpanMapperDTO,
		signal,
	});
};

export const getUpdateSpanMapperMutationKey = () =>
	['updateSpanMapper'] as const;

export const getUpdateSpanMapperMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateSpanMapper>>,
		TError,
		UpdateSpanMapperMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateSpanMapper>>,
	TError,
	UpdateSpanMapperMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateSpanMapperMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateSpanMapper>>,
		UpdateSpanMapperMutationVariables
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
	| BodyType<SpantypesUpdatableSpanMapperDTO>
	| undefined;
export type UpdateSpanMapperMutationError = ErrorType<RenderErrorResponseDTO>;
export type UpdateSpanMapperMutationVariables = {
	pathParams: UpdateSpanMapperPathParameters;
	data?: BodyType<SpantypesUpdatableSpanMapperDTO>;
};

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
		UpdateSpanMapperMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateSpanMapper>>,
	TError,
	UpdateSpanMapperMutationVariables,
	TContext
> => {
	return useMutation(getUpdateSpanMapperMutationOptions(options));
};
/**
 * Tests how span mappers would transform sample spans
 * @summary Test span mappers against sample spans
 */
export const testSpanMappers = (
	spantypesPostableSpanMapperTestDTO?: BodyType<SpantypesPostableSpanMapperTestDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<TestSpanMappers200>({
		url: `/api/v1/span_mapper_groups/test`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: spantypesPostableSpanMapperTestDTO,
		signal,
	});
};

export const getTestSpanMappersMutationKey = () => ['testSpanMappers'] as const;

export const getTestSpanMappersMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof testSpanMappers>>,
		TError,
		TestSpanMappersMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof testSpanMappers>>,
	TError,
	TestSpanMappersMutationVariables,
	TContext
> => {
	const mutationKey = getTestSpanMappersMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof testSpanMappers>>,
		TestSpanMappersMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return testSpanMappers(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type TestSpanMappersMutationResult = NonNullable<
	Awaited<ReturnType<typeof testSpanMappers>>
>;
export type TestSpanMappersMutationBody =
	| BodyType<SpantypesPostableSpanMapperTestDTO>
	| undefined;
export type TestSpanMappersMutationError = ErrorType<RenderErrorResponseDTO>;
export type TestSpanMappersMutationVariables = {
	data?: BodyType<SpantypesPostableSpanMapperTestDTO>;
};

/**
 * @summary Test span mappers against sample spans
 */
export const useTestSpanMappers = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof testSpanMappers>>,
		TError,
		TestSpanMappersMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof testSpanMappers>>,
	TError,
	TestSpanMappersMutationVariables,
	TContext
> => {
	return useMutation(getTestSpanMappersMutationOptions(options));
};
