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
	CreateMapper201,
	CreateMapperPathParameters,
	CreateMappingGroup201,
	DeleteMapperPathParameters,
	DeleteMappingGroupPathParameters,
	ListMappers200,
	ListMappersPathParameters,
	ListSpanAttributeMappingGroups200,
	ListSpanAttributeMappingGroupsParams,
	RenderErrorResponseDTO,
	SpanattributemappingtypesPostableGroupDTO,
	SpanattributemappingtypesPostableMapperDTO,
	SpanattributemappingtypesUpdatableGroupDTO,
	SpanattributemappingtypesUpdatableMapperDTO,
	UpdateMapperPathParameters,
	UpdateMappingGroupPathParameters,
} from '../sigNoz.schemas';

/**
 * Returns all span attribute mapping groups for the authenticated org.
 * @summary List span attribute mapping groups
 */
export const listSpanAttributeMappingGroups = (
	params?: ListSpanAttributeMappingGroupsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListSpanAttributeMappingGroups200>({
		url: `/api/v1/span_attribute_mapping_groups`,
		method: 'GET',
		params,
		signal,
	});
};

export const getListSpanAttributeMappingGroupsQueryKey = (
	params?: ListSpanAttributeMappingGroupsParams,
) => {
	return [
		`/api/v1/span_attribute_mapping_groups`,
		...(params ? [params] : []),
	] as const;
};

export const getListSpanAttributeMappingGroupsQueryOptions = <
	TData = Awaited<ReturnType<typeof listSpanAttributeMappingGroups>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	params?: ListSpanAttributeMappingGroupsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listSpanAttributeMappingGroups>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getListSpanAttributeMappingGroupsQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listSpanAttributeMappingGroups>>
	> = ({ signal }) => listSpanAttributeMappingGroups(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listSpanAttributeMappingGroups>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListSpanAttributeMappingGroupsQueryResult = NonNullable<
	Awaited<ReturnType<typeof listSpanAttributeMappingGroups>>
>;
export type ListSpanAttributeMappingGroupsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List span attribute mapping groups
 */

export function useListSpanAttributeMappingGroups<
	TData = Awaited<ReturnType<typeof listSpanAttributeMappingGroups>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	params?: ListSpanAttributeMappingGroupsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listSpanAttributeMappingGroups>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListSpanAttributeMappingGroupsQueryOptions(
		params,
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List span attribute mapping groups
 */
export const invalidateListSpanAttributeMappingGroups = async (
	queryClient: QueryClient,
	params?: ListSpanAttributeMappingGroupsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListSpanAttributeMappingGroupsQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * Creates a new span attribute mapping group for the org.
 * @summary Create a span attribute mapping group
 */
export const createMappingGroup = (
	spanattributemappingtypesPostableGroupDTO: BodyType<SpanattributemappingtypesPostableGroupDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateMappingGroup201>({
		url: `/api/v1/span_attribute_mapping_groups`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: spanattributemappingtypesPostableGroupDTO,
		signal,
	});
};

export const getCreateMappingGroupMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createMappingGroup>>,
		TError,
		{ data: BodyType<SpanattributemappingtypesPostableGroupDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createMappingGroup>>,
	TError,
	{ data: BodyType<SpanattributemappingtypesPostableGroupDTO> },
	TContext
> => {
	const mutationKey = ['createMappingGroup'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createMappingGroup>>,
		{ data: BodyType<SpanattributemappingtypesPostableGroupDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createMappingGroup(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateMappingGroupMutationResult = NonNullable<
	Awaited<ReturnType<typeof createMappingGroup>>
>;
export type CreateMappingGroupMutationBody = BodyType<SpanattributemappingtypesPostableGroupDTO>;
export type CreateMappingGroupMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create a span attribute mapping group
 */
export const useCreateMappingGroup = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createMappingGroup>>,
		TError,
		{ data: BodyType<SpanattributemappingtypesPostableGroupDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createMappingGroup>>,
	TError,
	{ data: BodyType<SpanattributemappingtypesPostableGroupDTO> },
	TContext
> => {
	const mutationOptions = getCreateMappingGroupMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Hard-deletes a mapping group and cascades to all its mappers.
 * @summary Delete a span attribute mapping group
 */
export const deleteMappingGroup = ({
	groupId,
}: DeleteMappingGroupPathParameters) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/span_attribute_mapping_groups/${groupId}`,
		method: 'DELETE',
	});
};

export const getDeleteMappingGroupMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteMappingGroup>>,
		TError,
		{ pathParams: DeleteMappingGroupPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteMappingGroup>>,
	TError,
	{ pathParams: DeleteMappingGroupPathParameters },
	TContext
> => {
	const mutationKey = ['deleteMappingGroup'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteMappingGroup>>,
		{ pathParams: DeleteMappingGroupPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteMappingGroup(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteMappingGroupMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteMappingGroup>>
>;

export type DeleteMappingGroupMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete a span attribute mapping group
 */
export const useDeleteMappingGroup = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteMappingGroup>>,
		TError,
		{ pathParams: DeleteMappingGroupPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteMappingGroup>>,
	TError,
	{ pathParams: DeleteMappingGroupPathParameters },
	TContext
> => {
	const mutationOptions = getDeleteMappingGroupMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Partially updates an existing mapping group's name, condition, or enabled state.
 * @summary Update a span attribute mapping group
 */
export const updateMappingGroup = (
	{ groupId }: UpdateMappingGroupPathParameters,
	spanattributemappingtypesUpdatableGroupDTO: BodyType<SpanattributemappingtypesUpdatableGroupDTO>,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/span_attribute_mapping_groups/${groupId}`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		data: spanattributemappingtypesUpdatableGroupDTO,
	});
};

export const getUpdateMappingGroupMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMappingGroup>>,
		TError,
		{
			pathParams: UpdateMappingGroupPathParameters;
			data: BodyType<SpanattributemappingtypesUpdatableGroupDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateMappingGroup>>,
	TError,
	{
		pathParams: UpdateMappingGroupPathParameters;
		data: BodyType<SpanattributemappingtypesUpdatableGroupDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateMappingGroup'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateMappingGroup>>,
		{
			pathParams: UpdateMappingGroupPathParameters;
			data: BodyType<SpanattributemappingtypesUpdatableGroupDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateMappingGroup(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateMappingGroupMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateMappingGroup>>
>;
export type UpdateMappingGroupMutationBody = BodyType<SpanattributemappingtypesUpdatableGroupDTO>;
export type UpdateMappingGroupMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update a span attribute mapping group
 */
export const useUpdateMappingGroup = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMappingGroup>>,
		TError,
		{
			pathParams: UpdateMappingGroupPathParameters;
			data: BodyType<SpanattributemappingtypesUpdatableGroupDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateMappingGroup>>,
	TError,
	{
		pathParams: UpdateMappingGroupPathParameters;
		data: BodyType<SpanattributemappingtypesUpdatableGroupDTO>;
	},
	TContext
> => {
	const mutationOptions = getUpdateMappingGroupMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Returns all attribute mappers belonging to a mapping group.
 * @summary List span attribute mappers for a group
 */
export const listMappers = (
	{ groupId }: ListMappersPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListMappers200>({
		url: `/api/v1/span_attribute_mapping_groups/${groupId}/mappers`,
		method: 'GET',
		signal,
	});
};

export const getListMappersQueryKey = ({
	groupId,
}: ListMappersPathParameters) => {
	return [`/api/v1/span_attribute_mapping_groups/${groupId}/mappers`] as const;
};

export const getListMappersQueryOptions = <
	TData = Awaited<ReturnType<typeof listMappers>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ groupId }: ListMappersPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listMappers>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListMappersQueryKey({ groupId });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof listMappers>>> = ({
		signal,
	}) => listMappers({ groupId }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!groupId,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof listMappers>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListMappersQueryResult = NonNullable<
	Awaited<ReturnType<typeof listMappers>>
>;
export type ListMappersQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List span attribute mappers for a group
 */

export function useListMappers<
	TData = Awaited<ReturnType<typeof listMappers>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ groupId }: ListMappersPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listMappers>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListMappersQueryOptions({ groupId }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List span attribute mappers for a group
 */
export const invalidateListMappers = async (
	queryClient: QueryClient,
	{ groupId }: ListMappersPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListMappersQueryKey({ groupId }) },
		options,
	);

	return queryClient;
};

/**
 * Adds a new attribute mapper to the specified mapping group.
 * @summary Create a span attribute mapper
 */
export const createMapper = (
	{ groupId }: CreateMapperPathParameters,
	spanattributemappingtypesPostableMapperDTO: BodyType<SpanattributemappingtypesPostableMapperDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateMapper201>({
		url: `/api/v1/span_attribute_mapping_groups/${groupId}/mappers`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: spanattributemappingtypesPostableMapperDTO,
		signal,
	});
};

export const getCreateMapperMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createMapper>>,
		TError,
		{
			pathParams: CreateMapperPathParameters;
			data: BodyType<SpanattributemappingtypesPostableMapperDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createMapper>>,
	TError,
	{
		pathParams: CreateMapperPathParameters;
		data: BodyType<SpanattributemappingtypesPostableMapperDTO>;
	},
	TContext
> => {
	const mutationKey = ['createMapper'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createMapper>>,
		{
			pathParams: CreateMapperPathParameters;
			data: BodyType<SpanattributemappingtypesPostableMapperDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return createMapper(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateMapperMutationResult = NonNullable<
	Awaited<ReturnType<typeof createMapper>>
>;
export type CreateMapperMutationBody = BodyType<SpanattributemappingtypesPostableMapperDTO>;
export type CreateMapperMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create a span attribute mapper
 */
export const useCreateMapper = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createMapper>>,
		TError,
		{
			pathParams: CreateMapperPathParameters;
			data: BodyType<SpanattributemappingtypesPostableMapperDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createMapper>>,
	TError,
	{
		pathParams: CreateMapperPathParameters;
		data: BodyType<SpanattributemappingtypesPostableMapperDTO>;
	},
	TContext
> => {
	const mutationOptions = getCreateMapperMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Hard-deletes a mapper from a mapping group.
 * @summary Delete a span attribute mapper
 */
export const deleteMapper = ({
	groupId,
	mapperId,
}: DeleteMapperPathParameters) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/span_attribute_mapping_groups/${groupId}/mappers/${mapperId}`,
		method: 'DELETE',
	});
};

export const getDeleteMapperMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteMapper>>,
		TError,
		{ pathParams: DeleteMapperPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteMapper>>,
	TError,
	{ pathParams: DeleteMapperPathParameters },
	TContext
> => {
	const mutationKey = ['deleteMapper'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteMapper>>,
		{ pathParams: DeleteMapperPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteMapper(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteMapperMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteMapper>>
>;

export type DeleteMapperMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete a span attribute mapper
 */
export const useDeleteMapper = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteMapper>>,
		TError,
		{ pathParams: DeleteMapperPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteMapper>>,
	TError,
	{ pathParams: DeleteMapperPathParameters },
	TContext
> => {
	const mutationOptions = getDeleteMapperMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Partially updates an existing mapper's field context, config, or enabled state.
 * @summary Update a span attribute mapper
 */
export const updateMapper = (
	{ groupId, mapperId }: UpdateMapperPathParameters,
	spanattributemappingtypesUpdatableMapperDTO: BodyType<SpanattributemappingtypesUpdatableMapperDTO>,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/span_attribute_mapping_groups/${groupId}/mappers/${mapperId}`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		data: spanattributemappingtypesUpdatableMapperDTO,
	});
};

export const getUpdateMapperMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMapper>>,
		TError,
		{
			pathParams: UpdateMapperPathParameters;
			data: BodyType<SpanattributemappingtypesUpdatableMapperDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateMapper>>,
	TError,
	{
		pathParams: UpdateMapperPathParameters;
		data: BodyType<SpanattributemappingtypesUpdatableMapperDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateMapper'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateMapper>>,
		{
			pathParams: UpdateMapperPathParameters;
			data: BodyType<SpanattributemappingtypesUpdatableMapperDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateMapper(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateMapperMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateMapper>>
>;
export type UpdateMapperMutationBody = BodyType<SpanattributemappingtypesUpdatableMapperDTO>;
export type UpdateMapperMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update a span attribute mapper
 */
export const useUpdateMapper = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMapper>>,
		TError,
		{
			pathParams: UpdateMapperPathParameters;
			data: BodyType<SpanattributemappingtypesUpdatableMapperDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateMapper>>,
	TError,
	{
		pathParams: UpdateMapperPathParameters;
		data: BodyType<SpanattributemappingtypesUpdatableMapperDTO>;
	},
	TContext
> => {
	const mutationOptions = getUpdateMapperMutationOptions(options);

	return useMutation(mutationOptions);
};
