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

import type { AlertmanagertypesPostablePlannedMaintenanceDTO } from '../sigNoz.schemas/alertmanagertypesPostablePlannedMaintenanceDTO';

import type { CreateDowntimeSchedule201 } from '../sigNoz.schemas/createDowntimeSchedule201';

import type { DeleteDowntimeScheduleByIDPathParameters } from '../sigNoz.schemas/deleteDowntimeScheduleByIDPathParameters';

import type { GetDowntimeScheduleByID200 } from '../sigNoz.schemas/getDowntimeScheduleByID200';

import type { GetDowntimeScheduleByIDPathParameters } from '../sigNoz.schemas/getDowntimeScheduleByIDPathParameters';

import type { ListDowntimeSchedules200 } from '../sigNoz.schemas/listDowntimeSchedules200';

import type { ListDowntimeSchedulesParams } from '../sigNoz.schemas/listDowntimeSchedulesParams';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

import type { UpdateDowntimeScheduleByIDPathParameters } from '../sigNoz.schemas/updateDowntimeScheduleByIDPathParameters';

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
	TError = ErrorType<RenderErrorResponseDTO>,
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
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListDowntimeSchedules} query
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
	alertmanagertypesPostablePlannedMaintenanceDTO?: BodyType<AlertmanagertypesPostablePlannedMaintenanceDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateDowntimeSchedule201>({
		url: `/api/v1/downtime_schedules`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: alertmanagertypesPostablePlannedMaintenanceDTO,
		signal,
	});
};

export const getCreateDowntimeScheduleMutationKey = () =>
	['createDowntimeSchedule'] as const;

export const getCreateDowntimeScheduleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createDowntimeSchedule>>,
		TError,
		CreateDowntimeScheduleMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createDowntimeSchedule>>,
	TError,
	CreateDowntimeScheduleMutationVariables,
	TContext
> => {
	const mutationKey = getCreateDowntimeScheduleMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createDowntimeSchedule>>,
		CreateDowntimeScheduleMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return createDowntimeSchedule(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateDowntimeScheduleMutationResult = NonNullable<
	Awaited<ReturnType<typeof createDowntimeSchedule>>
>;
export type CreateDowntimeScheduleMutationBody =
	| BodyType<AlertmanagertypesPostablePlannedMaintenanceDTO>
	| undefined;
export type CreateDowntimeScheduleMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type CreateDowntimeScheduleMutationVariables = {
	data?: BodyType<AlertmanagertypesPostablePlannedMaintenanceDTO>;
};

/**
 * @summary Create downtime schedule
 */
export const useCreateDowntimeSchedule = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createDowntimeSchedule>>,
		TError,
		CreateDowntimeScheduleMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createDowntimeSchedule>>,
	TError,
	CreateDowntimeScheduleMutationVariables,
	TContext
> => {
	return useMutation(getCreateDowntimeScheduleMutationOptions(options));
};
/**
 * This endpoint deletes a downtime schedule by ID
 * @summary Delete downtime schedule
 */
export const deleteDowntimeScheduleByID = (
	{ id }: DeleteDowntimeScheduleByIDPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/downtime_schedules/${id}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteDowntimeScheduleByIDMutationKey = () =>
	['deleteDowntimeScheduleByID'] as const;

export const getDeleteDowntimeScheduleByIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteDowntimeScheduleByID>>,
		TError,
		DeleteDowntimeScheduleByIDMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteDowntimeScheduleByID>>,
	TError,
	DeleteDowntimeScheduleByIDMutationVariables,
	TContext
> => {
	const mutationKey = getDeleteDowntimeScheduleByIDMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteDowntimeScheduleByID>>,
		DeleteDowntimeScheduleByIDMutationVariables
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteDowntimeScheduleByID(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteDowntimeScheduleByIDMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteDowntimeScheduleByID>>
>;

export type DeleteDowntimeScheduleByIDMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type DeleteDowntimeScheduleByIDMutationVariables = {
	pathParams: DeleteDowntimeScheduleByIDPathParameters;
};

/**
 * @summary Delete downtime schedule
 */
export const useDeleteDowntimeScheduleByID = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteDowntimeScheduleByID>>,
		TError,
		DeleteDowntimeScheduleByIDMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteDowntimeScheduleByID>>,
	TError,
	DeleteDowntimeScheduleByIDMutationVariables,
	TContext
> => {
	return useMutation(getDeleteDowntimeScheduleByIDMutationOptions(options));
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
	TError = ErrorType<RenderErrorResponseDTO>,
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
		enabled: id !== null && id !== undefined,
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
export type GetDowntimeScheduleByIDQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get downtime schedule by ID
 */

export function useGetDowntimeScheduleByID<
	TData = Awaited<ReturnType<typeof getDowntimeScheduleByID>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetDowntimeScheduleByID} query
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
	alertmanagertypesPostablePlannedMaintenanceDTO?: BodyType<AlertmanagertypesPostablePlannedMaintenanceDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/downtime_schedules/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: alertmanagertypesPostablePlannedMaintenanceDTO,
		signal,
	});
};

export const getUpdateDowntimeScheduleByIDMutationKey = () =>
	['updateDowntimeScheduleByID'] as const;

export const getUpdateDowntimeScheduleByIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateDowntimeScheduleByID>>,
		TError,
		UpdateDowntimeScheduleByIDMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateDowntimeScheduleByID>>,
	TError,
	UpdateDowntimeScheduleByIDMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateDowntimeScheduleByIDMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateDowntimeScheduleByID>>,
		UpdateDowntimeScheduleByIDMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateDowntimeScheduleByID(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateDowntimeScheduleByIDMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateDowntimeScheduleByID>>
>;
export type UpdateDowntimeScheduleByIDMutationBody =
	| BodyType<AlertmanagertypesPostablePlannedMaintenanceDTO>
	| undefined;
export type UpdateDowntimeScheduleByIDMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type UpdateDowntimeScheduleByIDMutationVariables = {
	pathParams: UpdateDowntimeScheduleByIDPathParameters;
	data?: BodyType<AlertmanagertypesPostablePlannedMaintenanceDTO>;
};

/**
 * @summary Update downtime schedule
 */
export const useUpdateDowntimeScheduleByID = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateDowntimeScheduleByID>>,
		TError,
		UpdateDowntimeScheduleByIDMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateDowntimeScheduleByID>>,
	TError,
	UpdateDowntimeScheduleByIDMutationVariables,
	TContext
> => {
	return useMutation(getUpdateDowntimeScheduleByIDMutationOptions(options));
};
