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
	CreateDowntimeSchedule201,
	DeleteDowntimeScheduleByIDPathParameters,
	GetDowntimeScheduleByID200,
	GetDowntimeScheduleByIDPathParameters,
	ListDowntimeSchedules200,
	ListDowntimeSchedulesParams,
	RenderErrorResponseDTO,
	RuletypesPostablePlannedMaintenanceDTO,
	UpdateDowntimeScheduleByIDPathParameters,
} from '../sigNoz.schemas';

/**
 * This endpoint lists all planned maintenance / downtime schedules
 * @summary List downtime schedules
 */
export const listDowntimeSchedules = (
	params?: ListDowntimeSchedulesParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListDowntimeSchedules200>({
		url: `/api/v1/downtime_schedules`,
		method: 'GET',
		params,
		signal,
	});
};

export const getListDowntimeSchedulesQueryKey = (
	params?: ListDowntimeSchedulesParams,
) => {
	return [`/api/v1/downtime_schedules`, ...(params ? [params] : [])] as const;
};

export const getListDowntimeSchedulesQueryOptions = <
	TData = Awaited<ReturnType<typeof listDowntimeSchedules>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	params?: ListDowntimeSchedulesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listDowntimeSchedules>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getListDowntimeSchedulesQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listDowntimeSchedules>>
	> = ({ signal }) => listDowntimeSchedules(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listDowntimeSchedules>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListDowntimeSchedulesQueryResult = NonNullable<
	Awaited<ReturnType<typeof listDowntimeSchedules>>
>;
export type ListDowntimeSchedulesQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List downtime schedules
 */

export function useListDowntimeSchedules<
	TData = Awaited<ReturnType<typeof listDowntimeSchedules>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	params?: ListDowntimeSchedulesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listDowntimeSchedules>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListDowntimeSchedulesQueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List downtime schedules
 */
export const invalidateListDowntimeSchedules = async (
	queryClient: QueryClient,
	params?: ListDowntimeSchedulesParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListDowntimeSchedulesQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates a new planned maintenance / downtime schedule
 * @summary Create downtime schedule
 */
export const createDowntimeSchedule = (
	ruletypesPostablePlannedMaintenanceDTO: BodyType<RuletypesPostablePlannedMaintenanceDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateDowntimeSchedule201>({
		url: `/api/v1/downtime_schedules`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: ruletypesPostablePlannedMaintenanceDTO,
		signal,
	});
};

export const getCreateDowntimeScheduleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createDowntimeSchedule>>,
		TError,
		{ data: BodyType<RuletypesPostablePlannedMaintenanceDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createDowntimeSchedule>>,
	TError,
	{ data: BodyType<RuletypesPostablePlannedMaintenanceDTO> },
	TContext
> => {
	const mutationKey = ['createDowntimeSchedule'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createDowntimeSchedule>>,
		{ data: BodyType<RuletypesPostablePlannedMaintenanceDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createDowntimeSchedule(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateDowntimeScheduleMutationResult = NonNullable<
	Awaited<ReturnType<typeof createDowntimeSchedule>>
>;
export type CreateDowntimeScheduleMutationBody = BodyType<RuletypesPostablePlannedMaintenanceDTO>;
export type CreateDowntimeScheduleMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create downtime schedule
 */
export const useCreateDowntimeSchedule = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createDowntimeSchedule>>,
		TError,
		{ data: BodyType<RuletypesPostablePlannedMaintenanceDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createDowntimeSchedule>>,
	TError,
	{ data: BodyType<RuletypesPostablePlannedMaintenanceDTO> },
	TContext
> => {
	const mutationOptions = getCreateDowntimeScheduleMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint deletes a downtime schedule by ID
 * @summary Delete downtime schedule
 */
export const deleteDowntimeScheduleByID = ({
	id,
}: DeleteDowntimeScheduleByIDPathParameters) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/downtime_schedules/${id}`,
		method: 'DELETE',
	});
};

export const getDeleteDowntimeScheduleByIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteDowntimeScheduleByID>>,
		TError,
		{ pathParams: DeleteDowntimeScheduleByIDPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteDowntimeScheduleByID>>,
	TError,
	{ pathParams: DeleteDowntimeScheduleByIDPathParameters },
	TContext
> => {
	const mutationKey = ['deleteDowntimeScheduleByID'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteDowntimeScheduleByID>>,
		{ pathParams: DeleteDowntimeScheduleByIDPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteDowntimeScheduleByID(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteDowntimeScheduleByIDMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteDowntimeScheduleByID>>
>;

export type DeleteDowntimeScheduleByIDMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete downtime schedule
 */
export const useDeleteDowntimeScheduleByID = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteDowntimeScheduleByID>>,
		TError,
		{ pathParams: DeleteDowntimeScheduleByIDPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteDowntimeScheduleByID>>,
	TError,
	{ pathParams: DeleteDowntimeScheduleByIDPathParameters },
	TContext
> => {
	const mutationOptions = getDeleteDowntimeScheduleByIDMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint returns a downtime schedule by ID
 * @summary Get downtime schedule by ID
 */
export const getDowntimeScheduleByID = (
	{ id }: GetDowntimeScheduleByIDPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetDowntimeScheduleByID200>({
		url: `/api/v1/downtime_schedules/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetDowntimeScheduleByIDQueryKey = ({
	id,
}: GetDowntimeScheduleByIDPathParameters) => {
	return [`/api/v1/downtime_schedules/${id}`] as const;
};

export const getGetDowntimeScheduleByIDQueryOptions = <
	TData = Awaited<ReturnType<typeof getDowntimeScheduleByID>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetDowntimeScheduleByIDPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getDowntimeScheduleByID>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetDowntimeScheduleByIDQueryKey({ id });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getDowntimeScheduleByID>>
	> = ({ signal }) => getDowntimeScheduleByID({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getDowntimeScheduleByID>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetDowntimeScheduleByIDQueryResult = NonNullable<
	Awaited<ReturnType<typeof getDowntimeScheduleByID>>
>;
export type GetDowntimeScheduleByIDQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get downtime schedule by ID
 */

export function useGetDowntimeScheduleByID<
	TData = Awaited<ReturnType<typeof getDowntimeScheduleByID>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetDowntimeScheduleByIDPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getDowntimeScheduleByID>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetDowntimeScheduleByIDQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get downtime schedule by ID
 */
export const invalidateGetDowntimeScheduleByID = async (
	queryClient: QueryClient,
	{ id }: GetDowntimeScheduleByIDPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetDowntimeScheduleByIDQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint updates a downtime schedule by ID
 * @summary Update downtime schedule
 */
export const updateDowntimeScheduleByID = (
	{ id }: UpdateDowntimeScheduleByIDPathParameters,
	ruletypesPostablePlannedMaintenanceDTO: BodyType<RuletypesPostablePlannedMaintenanceDTO>,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/downtime_schedules/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: ruletypesPostablePlannedMaintenanceDTO,
	});
};

export const getUpdateDowntimeScheduleByIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateDowntimeScheduleByID>>,
		TError,
		{
			pathParams: UpdateDowntimeScheduleByIDPathParameters;
			data: BodyType<RuletypesPostablePlannedMaintenanceDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateDowntimeScheduleByID>>,
	TError,
	{
		pathParams: UpdateDowntimeScheduleByIDPathParameters;
		data: BodyType<RuletypesPostablePlannedMaintenanceDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateDowntimeScheduleByID'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateDowntimeScheduleByID>>,
		{
			pathParams: UpdateDowntimeScheduleByIDPathParameters;
			data: BodyType<RuletypesPostablePlannedMaintenanceDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateDowntimeScheduleByID(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateDowntimeScheduleByIDMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateDowntimeScheduleByID>>
>;
export type UpdateDowntimeScheduleByIDMutationBody = BodyType<RuletypesPostablePlannedMaintenanceDTO>;
export type UpdateDowntimeScheduleByIDMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update downtime schedule
 */
export const useUpdateDowntimeScheduleByID = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateDowntimeScheduleByID>>,
		TError,
		{
			pathParams: UpdateDowntimeScheduleByIDPathParameters;
			data: BodyType<RuletypesPostablePlannedMaintenanceDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateDowntimeScheduleByID>>,
	TError,
	{
		pathParams: UpdateDowntimeScheduleByIDPathParameters;
		data: BodyType<RuletypesPostablePlannedMaintenanceDTO>;
	},
	TContext
> => {
	const mutationOptions = getUpdateDowntimeScheduleByIDMutationOptions(options);

	return useMutation(mutationOptions);
};
