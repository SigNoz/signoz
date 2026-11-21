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

import type { AlertmanagertypesPostableChannelDTO } from '../sigNoz.schemas/alertmanagertypesPostableChannelDTO';

import type { AlertmanagertypesPostableNotificationChannelDTO } from '../sigNoz.schemas/alertmanagertypesPostableNotificationChannelDTO';

import type { AlertmanagertypesReceiverDTO } from '../sigNoz.schemas/alertmanagertypesReceiverDTO';

import type { AlertmanagertypesRepairChannelParamsDTO } from '../sigNoz.schemas/alertmanagertypesRepairChannelParamsDTO';

import type { AlertmanagertypesTestableNotificationChannelDTO } from '../sigNoz.schemas/alertmanagertypesTestableNotificationChannelDTO';

import type { AlertmanagertypesUpdatableNotificationChannelDTO } from '../sigNoz.schemas/alertmanagertypesUpdatableNotificationChannelDTO';

import type { CreateChannel201 } from '../sigNoz.schemas/createChannel201';

import type { CreateNotificationChannel201 } from '../sigNoz.schemas/createNotificationChannel201';

import type { DeleteChannelByIDPathParameters } from '../sigNoz.schemas/deleteChannelByIDPathParameters';

import type { DeleteNotificationChannelPathParameters } from '../sigNoz.schemas/deleteNotificationChannelPathParameters';

import type { GetChannelByID200 } from '../sigNoz.schemas/getChannelByID200';

import type { GetChannelByIDPathParameters } from '../sigNoz.schemas/getChannelByIDPathParameters';

import type { GetNotificationChannel200 } from '../sigNoz.schemas/getNotificationChannel200';

import type { GetNotificationChannelPathParameters } from '../sigNoz.schemas/getNotificationChannelPathParameters';

import type { ListChannels200 } from '../sigNoz.schemas/listChannels200';

import type { ListNotificationChannels200 } from '../sigNoz.schemas/listNotificationChannels200';

import type { ListNotificationChannelsParams } from '../sigNoz.schemas/listNotificationChannelsParams';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

import type { RepairNotificationChannel200 } from '../sigNoz.schemas/repairNotificationChannel200';

import type { RepairNotificationChannelParams } from '../sigNoz.schemas/repairNotificationChannelParams';

import type { RepairNotificationChannelPathParameters } from '../sigNoz.schemas/repairNotificationChannelPathParameters';

import type { UpdateChannelByIDPathParameters } from '../sigNoz.schemas/updateChannelByIDPathParameters';

import type { UpdateNotificationChannel200 } from '../sigNoz.schemas/updateNotificationChannel200';

import type { UpdateNotificationChannelPathParameters } from '../sigNoz.schemas/updateNotificationChannelPathParameters';

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
 * This endpoint lists all notification channels for the organization
 * @summary List notification channels
 */
export const listChannels = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListChannels200>({
		url: `/api/v1/channels`,
		method: 'GET',
		signal,
	});
};

export const getListChannelsQueryKey = () => {
	return [`/api/v1/channels`] as const;
};

export const getListChannelsQueryOptions = <
	TData = Awaited<ReturnType<typeof listChannels>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listChannels>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListChannelsQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof listChannels>>> = ({
		signal,
	}) => listChannels(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listChannels>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListChannelsQueryResult = NonNullable<
	Awaited<ReturnType<typeof listChannels>>
>;
export type ListChannelsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List notification channels
 */

export function useListChannels<
	TData = Awaited<ReturnType<typeof listChannels>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listChannels>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListChannelsQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListChannels} query
 */
export const invalidateListChannels = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListChannelsQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates a notification channel
 * @summary Create notification channel
 */
export const createChannel = (
	alertmanagertypesPostableChannelDTO?: BodyType<AlertmanagertypesPostableChannelDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateChannel201>({
		url: `/api/v1/channels`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: alertmanagertypesPostableChannelDTO,
		signal,
	});
};

export const getCreateChannelMutationKey = () => ['createChannel'] as const;

export const getCreateChannelMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createChannel>>,
		TError,
		CreateChannelMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createChannel>>,
	TError,
	CreateChannelMutationVariables,
	TContext
> => {
	const mutationKey = getCreateChannelMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createChannel>>,
		CreateChannelMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return createChannel(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateChannelMutationResult = NonNullable<
	Awaited<ReturnType<typeof createChannel>>
>;
export type CreateChannelMutationBody =
	| BodyType<AlertmanagertypesPostableChannelDTO>
	| undefined;
export type CreateChannelMutationError = ErrorType<RenderErrorResponseDTO>;
export type CreateChannelMutationVariables = {
	data?: BodyType<AlertmanagertypesPostableChannelDTO>;
};

/**
 * @summary Create notification channel
 */
export const useCreateChannel = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createChannel>>,
		TError,
		CreateChannelMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createChannel>>,
	TError,
	CreateChannelMutationVariables,
	TContext
> => {
	return useMutation(getCreateChannelMutationOptions(options));
};
/**
 * This endpoint deletes a notification channel by ID
 * @summary Delete notification channel
 */
export const deleteChannelByID = (
	{ id }: DeleteChannelByIDPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/channels/${id}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteChannelByIDMutationKey = () =>
	['deleteChannelByID'] as const;

export const getDeleteChannelByIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteChannelByID>>,
		TError,
		DeleteChannelByIDMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteChannelByID>>,
	TError,
	DeleteChannelByIDMutationVariables,
	TContext
> => {
	const mutationKey = getDeleteChannelByIDMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteChannelByID>>,
		DeleteChannelByIDMutationVariables
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteChannelByID(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteChannelByIDMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteChannelByID>>
>;

export type DeleteChannelByIDMutationError = ErrorType<RenderErrorResponseDTO>;
export type DeleteChannelByIDMutationVariables = {
	pathParams: DeleteChannelByIDPathParameters;
};

/**
 * @summary Delete notification channel
 */
export const useDeleteChannelByID = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteChannelByID>>,
		TError,
		DeleteChannelByIDMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteChannelByID>>,
	TError,
	DeleteChannelByIDMutationVariables,
	TContext
> => {
	return useMutation(getDeleteChannelByIDMutationOptions(options));
};
/**
 * This endpoint returns a notification channel by ID
 * @summary Get notification channel by ID
 */
export const getChannelByID = (
	{ id }: GetChannelByIDPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetChannelByID200>({
		url: `/api/v1/channels/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetChannelByIDQueryKey = ({
	id,
}: GetChannelByIDPathParameters) => {
	return [`/api/v1/channels/${id}`] as const;
};

export const getGetChannelByIDQueryOptions = <
	TData = Awaited<ReturnType<typeof getChannelByID>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetChannelByIDPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getChannelByID>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetChannelByIDQueryKey({ id });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getChannelByID>>> = ({
		signal,
	}) => getChannelByID({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: id !== null && id !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getChannelByID>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetChannelByIDQueryResult = NonNullable<
	Awaited<ReturnType<typeof getChannelByID>>
>;
export type GetChannelByIDQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get notification channel by ID
 */

export function useGetChannelByID<
	TData = Awaited<ReturnType<typeof getChannelByID>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetChannelByIDPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getChannelByID>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetChannelByIDQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetChannelByID} query
 */
export const invalidateGetChannelByID = async (
	queryClient: QueryClient,
	{ id }: GetChannelByIDPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetChannelByIDQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint updates a notification channel by ID
 * @summary Update notification channel
 */
export const updateChannelByID = (
	{ id }: UpdateChannelByIDPathParameters,
	alertmanagertypesReceiverDTO?: BodyType<AlertmanagertypesReceiverDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/channels/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: alertmanagertypesReceiverDTO,
		signal,
	});
};

export const getUpdateChannelByIDMutationKey = () =>
	['updateChannelByID'] as const;

export const getUpdateChannelByIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateChannelByID>>,
		TError,
		UpdateChannelByIDMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateChannelByID>>,
	TError,
	UpdateChannelByIDMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateChannelByIDMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateChannelByID>>,
		UpdateChannelByIDMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateChannelByID(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateChannelByIDMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateChannelByID>>
>;
export type UpdateChannelByIDMutationBody =
	| BodyType<AlertmanagertypesReceiverDTO>
	| undefined;
export type UpdateChannelByIDMutationError = ErrorType<RenderErrorResponseDTO>;
export type UpdateChannelByIDMutationVariables = {
	pathParams: UpdateChannelByIDPathParameters;
	data?: BodyType<AlertmanagertypesReceiverDTO>;
};

/**
 * @summary Update notification channel
 */
export const useUpdateChannelByID = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateChannelByID>>,
		TError,
		UpdateChannelByIDMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateChannelByID>>,
	TError,
	UpdateChannelByIDMutationVariables,
	TContext
> => {
	return useMutation(getUpdateChannelByIDMutationOptions(options));
};
/**
 * This endpoint tests a notification channel by sending a test notification
 * @summary Test notification channel
 */
export const testChannel = (
	alertmanagertypesReceiverDTO?: BodyType<AlertmanagertypesReceiverDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/channels/test`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: alertmanagertypesReceiverDTO,
		signal,
	});
};

export const getTestChannelMutationKey = () => ['testChannel'] as const;

export const getTestChannelMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof testChannel>>,
		TError,
		TestChannelMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof testChannel>>,
	TError,
	TestChannelMutationVariables,
	TContext
> => {
	const mutationKey = getTestChannelMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof testChannel>>,
		TestChannelMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return testChannel(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type TestChannelMutationResult = NonNullable<
	Awaited<ReturnType<typeof testChannel>>
>;
export type TestChannelMutationBody =
	| BodyType<AlertmanagertypesReceiverDTO>
	| undefined;
export type TestChannelMutationError = ErrorType<RenderErrorResponseDTO>;
export type TestChannelMutationVariables = {
	data?: BodyType<AlertmanagertypesReceiverDTO>;
};

/**
 * @summary Test notification channel
 */
export const useTestChannel = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof testChannel>>,
		TError,
		TestChannelMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof testChannel>>,
	TError,
	TestChannelMutationVariables,
	TContext
> => {
	return useMutation(getTestChannelMutationOptions(options));
};
/**
 * Deprecated: use /api/v1/channels/test instead
 * @deprecated
 * @summary Test notification channel (deprecated)
 */
export const testChannelDeprecated = (
	alertmanagertypesReceiverDTO?: BodyType<AlertmanagertypesReceiverDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/testChannel`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: alertmanagertypesReceiverDTO,
		signal,
	});
};

export const getTestChannelDeprecatedMutationKey = () =>
	['testChannelDeprecated'] as const;

export const getTestChannelDeprecatedMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof testChannelDeprecated>>,
		TError,
		TestChannelDeprecatedMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof testChannelDeprecated>>,
	TError,
	TestChannelDeprecatedMutationVariables,
	TContext
> => {
	const mutationKey = getTestChannelDeprecatedMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof testChannelDeprecated>>,
		TestChannelDeprecatedMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return testChannelDeprecated(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type TestChannelDeprecatedMutationResult = NonNullable<
	Awaited<ReturnType<typeof testChannelDeprecated>>
>;
export type TestChannelDeprecatedMutationBody =
	| BodyType<AlertmanagertypesReceiverDTO>
	| undefined;
export type TestChannelDeprecatedMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type TestChannelDeprecatedMutationVariables = {
	data?: BodyType<AlertmanagertypesReceiverDTO>;
};

/**
 * @deprecated
 * @summary Test notification channel (deprecated)
 */
export const useTestChannelDeprecated = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof testChannelDeprecated>>,
		TError,
		TestChannelDeprecatedMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof testChannelDeprecated>>,
	TError,
	TestChannelDeprecatedMutationVariables,
	TContext
> => {
	return useMutation(getTestChannelDeprecatedMutationOptions(options));
};
/**
 * Returns a page of notification channels for the org. Each entry carries the channel's identity and kind but not its configuration; fetch a channel by ID for that. Supports a case-insensitive display name search (`query`), a kind filter (`kind`), sort (`updated_at`/`created_at`/`name`), order (`asc`/`desc`), and offset-based pagination (`limit`/`offset`).
 * @summary List notification channels
 */
export const listNotificationChannels = (
	params?: ListNotificationChannelsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListNotificationChannels200>({
		url: `/api/v2/notification_channels`,
		method: 'GET',
		params,
		signal,
	});
};

export const getListNotificationChannelsQueryKey = (
	params?: ListNotificationChannelsParams,
) => {
	return [`/api/v2/notification_channels`, ...(params ? [params] : [])] as const;
};

export const getListNotificationChannelsQueryOptions = <
	TData = Awaited<ReturnType<typeof listNotificationChannels>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: ListNotificationChannelsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listNotificationChannels>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getListNotificationChannelsQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listNotificationChannels>>
	> = ({ signal }) => listNotificationChannels(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listNotificationChannels>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListNotificationChannelsQueryResult = NonNullable<
	Awaited<ReturnType<typeof listNotificationChannels>>
>;
export type ListNotificationChannelsQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List notification channels
 */

export function useListNotificationChannels<
	TData = Awaited<ReturnType<typeof listNotificationChannels>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: ListNotificationChannelsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listNotificationChannels>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListNotificationChannelsQueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListNotificationChannels} query
 */
export const invalidateListNotificationChannels = async (
	queryClient: QueryClient,
	params?: ListNotificationChannelsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListNotificationChannelsQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates a notification channel
 * @summary Create notification channel
 */
export const createNotificationChannel = (
	alertmanagertypesPostableNotificationChannelDTO?: BodyType<AlertmanagertypesPostableNotificationChannelDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateNotificationChannel201>({
		url: `/api/v2/notification_channels`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: alertmanagertypesPostableNotificationChannelDTO,
		signal,
	});
};

export const getCreateNotificationChannelMutationKey = () =>
	['createNotificationChannel'] as const;

export const getCreateNotificationChannelMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createNotificationChannel>>,
		TError,
		CreateNotificationChannelMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createNotificationChannel>>,
	TError,
	CreateNotificationChannelMutationVariables,
	TContext
> => {
	const mutationKey = getCreateNotificationChannelMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createNotificationChannel>>,
		CreateNotificationChannelMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return createNotificationChannel(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateNotificationChannelMutationResult = NonNullable<
	Awaited<ReturnType<typeof createNotificationChannel>>
>;
export type CreateNotificationChannelMutationBody =
	| BodyType<AlertmanagertypesPostableNotificationChannelDTO>
	| undefined;
export type CreateNotificationChannelMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type CreateNotificationChannelMutationVariables = {
	data?: BodyType<AlertmanagertypesPostableNotificationChannelDTO>;
};

/**
 * @summary Create notification channel
 */
export const useCreateNotificationChannel = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createNotificationChannel>>,
		TError,
		CreateNotificationChannelMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createNotificationChannel>>,
	TError,
	CreateNotificationChannelMutationVariables,
	TContext
> => {
	return useMutation(getCreateNotificationChannelMutationOptions(options));
};
/**
 * This endpoint deletes a notification channel by ID
 * @summary Delete notification channel
 */
export const deleteNotificationChannel = (
	{ id }: DeleteNotificationChannelPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/notification_channels/${id}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteNotificationChannelMutationKey = () =>
	['deleteNotificationChannel'] as const;

export const getDeleteNotificationChannelMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteNotificationChannel>>,
		TError,
		DeleteNotificationChannelMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteNotificationChannel>>,
	TError,
	DeleteNotificationChannelMutationVariables,
	TContext
> => {
	const mutationKey = getDeleteNotificationChannelMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteNotificationChannel>>,
		DeleteNotificationChannelMutationVariables
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteNotificationChannel(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteNotificationChannelMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteNotificationChannel>>
>;

export type DeleteNotificationChannelMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type DeleteNotificationChannelMutationVariables = {
	pathParams: DeleteNotificationChannelPathParameters;
};

/**
 * @summary Delete notification channel
 */
export const useDeleteNotificationChannel = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteNotificationChannel>>,
		TError,
		DeleteNotificationChannelMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteNotificationChannel>>,
	TError,
	DeleteNotificationChannelMutationVariables,
	TContext
> => {
	return useMutation(getDeleteNotificationChannelMutationOptions(options));
};
/**
 * This endpoint returns a notification channel by ID. A channel written by the v1 API can carry a configuration this API does not model.
 * @summary Get notification channel by ID
 */
export const getNotificationChannel = (
	{ id }: GetNotificationChannelPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetNotificationChannel200>({
		url: `/api/v2/notification_channels/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetNotificationChannelQueryKey = ({
	id,
}: GetNotificationChannelPathParameters) => {
	return [`/api/v2/notification_channels/${id}`] as const;
};

export const getGetNotificationChannelQueryOptions = <
	TData = Awaited<ReturnType<typeof getNotificationChannel>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetNotificationChannelPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getNotificationChannel>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetNotificationChannelQueryKey({ id });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getNotificationChannel>>
	> = ({ signal }) => getNotificationChannel({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: id !== null && id !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getNotificationChannel>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetNotificationChannelQueryResult = NonNullable<
	Awaited<ReturnType<typeof getNotificationChannel>>
>;
export type GetNotificationChannelQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get notification channel by ID
 */

export function useGetNotificationChannel<
	TData = Awaited<ReturnType<typeof getNotificationChannel>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetNotificationChannelPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getNotificationChannel>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetNotificationChannelQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetNotificationChannel} query
 */
export const invalidateGetNotificationChannel = async (
	queryClient: QueryClient,
	{ id }: GetNotificationChannelPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetNotificationChannelQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint replaces a notification channel's configuration in full. Neither name is part of the request body: both are immutable. The kind may change, which replaces the channel's notifier configuration.
 * @summary Update notification channel
 */
export const updateNotificationChannel = (
	{ id }: UpdateNotificationChannelPathParameters,
	alertmanagertypesUpdatableNotificationChannelDTO?: BodyType<AlertmanagertypesUpdatableNotificationChannelDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<UpdateNotificationChannel200>({
		url: `/api/v2/notification_channels/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: alertmanagertypesUpdatableNotificationChannelDTO,
		signal,
	});
};

export const getUpdateNotificationChannelMutationKey = () =>
	['updateNotificationChannel'] as const;

export const getUpdateNotificationChannelMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateNotificationChannel>>,
		TError,
		UpdateNotificationChannelMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateNotificationChannel>>,
	TError,
	UpdateNotificationChannelMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateNotificationChannelMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateNotificationChannel>>,
		UpdateNotificationChannelMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateNotificationChannel(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateNotificationChannelMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateNotificationChannel>>
>;
export type UpdateNotificationChannelMutationBody =
	| BodyType<AlertmanagertypesUpdatableNotificationChannelDTO>
	| undefined;
export type UpdateNotificationChannelMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type UpdateNotificationChannelMutationVariables = {
	pathParams: UpdateNotificationChannelPathParameters;
	data?: BodyType<AlertmanagertypesUpdatableNotificationChannelDTO>;
};

/**
 * @summary Update notification channel
 */
export const useUpdateNotificationChannel = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateNotificationChannel>>,
		TError,
		UpdateNotificationChannelMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateNotificationChannel>>,
	TError,
	UpdateNotificationChannelMutationVariables,
	TContext
> => {
	return useMutation(getUpdateNotificationChannelMutationOptions(options));
};
/**
 * This endpoint diagnoses a stored channel that the v2 API cannot read and applies the fitting action: a channel carrying several notifier configurations is split into one channel per configuration, keeping this ID for the first; a channel whose notifier kind v2 does not model is deleted; a channel with an empty stored type has it rewritten from its data. A delete is refused while a routing policy still names the channel. Nothing is written unless apply=true; by default the response only shows what would happen.
 * @summary Repair notification channel
 */
export const repairNotificationChannel = (
	{ id }: RepairNotificationChannelPathParameters,
	alertmanagertypesRepairChannelParamsDTO?: BodyType<AlertmanagertypesRepairChannelParamsDTO>,
	params?: RepairNotificationChannelParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<RepairNotificationChannel200>({
		url: `/api/v2/notification_channels/${id}/repair`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: alertmanagertypesRepairChannelParamsDTO,
		params,
		signal,
	});
};

export const getRepairNotificationChannelMutationKey = () =>
	['repairNotificationChannel'] as const;

export const getRepairNotificationChannelMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof repairNotificationChannel>>,
		TError,
		RepairNotificationChannelMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof repairNotificationChannel>>,
	TError,
	RepairNotificationChannelMutationVariables,
	TContext
> => {
	const mutationKey = getRepairNotificationChannelMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof repairNotificationChannel>>,
		RepairNotificationChannelMutationVariables
	> = (props) => {
		const { pathParams, data, params } = props ?? {};

		return repairNotificationChannel(pathParams, data, params);
	};

	return { mutationFn, ...mutationOptions };
};

export type RepairNotificationChannelMutationResult = NonNullable<
	Awaited<ReturnType<typeof repairNotificationChannel>>
>;
export type RepairNotificationChannelMutationBody =
	| BodyType<AlertmanagertypesRepairChannelParamsDTO>
	| undefined;
export type RepairNotificationChannelMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type RepairNotificationChannelMutationVariables = {
	pathParams: RepairNotificationChannelPathParameters;
	data?: BodyType<AlertmanagertypesRepairChannelParamsDTO>;
	params?: RepairNotificationChannelParams;
};

/**
 * @summary Repair notification channel
 */
export const useRepairNotificationChannel = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof repairNotificationChannel>>,
		TError,
		RepairNotificationChannelMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof repairNotificationChannel>>,
	TError,
	RepairNotificationChannelMutationVariables,
	TContext
> => {
	return useMutation(getRepairNotificationChannelMutationOptions(options));
};
/**
 * This endpoint sends a test notification for the configuration in the request body. The channel need not exist and nothing is persisted, so the body carries a configuration only.
 * @summary Test notification channel
 */
export const testNotificationChannel = (
	alertmanagertypesTestableNotificationChannelDTO?: BodyType<AlertmanagertypesTestableNotificationChannelDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/notification_channels/test`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: alertmanagertypesTestableNotificationChannelDTO,
		signal,
	});
};

export const getTestNotificationChannelMutationKey = () =>
	['testNotificationChannel'] as const;

export const getTestNotificationChannelMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof testNotificationChannel>>,
		TError,
		TestNotificationChannelMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof testNotificationChannel>>,
	TError,
	TestNotificationChannelMutationVariables,
	TContext
> => {
	const mutationKey = getTestNotificationChannelMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof testNotificationChannel>>,
		TestNotificationChannelMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return testNotificationChannel(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type TestNotificationChannelMutationResult = NonNullable<
	Awaited<ReturnType<typeof testNotificationChannel>>
>;
export type TestNotificationChannelMutationBody =
	| BodyType<AlertmanagertypesTestableNotificationChannelDTO>
	| undefined;
export type TestNotificationChannelMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type TestNotificationChannelMutationVariables = {
	data?: BodyType<AlertmanagertypesTestableNotificationChannelDTO>;
};

/**
 * @summary Test notification channel
 */
export const useTestNotificationChannel = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof testNotificationChannel>>,
		TError,
		TestNotificationChannelMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof testNotificationChannel>>,
	TError,
	TestNotificationChannelMutationVariables,
	TContext
> => {
	return useMutation(getTestNotificationChannelMutationOptions(options));
};
