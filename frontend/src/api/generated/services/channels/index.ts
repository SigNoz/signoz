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
	AlertmanagertypesPostableChannelDTO,
	AlertmanagertypesPostableNotificationChannelDTO,
	AlertmanagertypesReceiverDTO,
	AlertmanagertypesTestableNotificationChannelDTO,
	AlertmanagertypesUpdatableNotificationChannelDTO,
	CreateChannel201,
	CreateNotificationChannel201,
	DeleteChannelByIDPathParameters,
	DeleteNotificationChannelPathParameters,
	GetChannelByID200,
	GetChannelByIDPathParameters,
	GetNotificationChannel200,
	GetNotificationChannelPathParameters,
	ListChannels200,
	ListNotificationChannels200,
	ListNotificationChannelsParams,
	RenderErrorResponseDTO,
	UpdateChannelByIDPathParameters,
	UpdateNotificationChannel200,
	UpdateNotificationChannelPathParameters,
} from '../sigNoz.schemas';

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
 * @summary List notification channels
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

export const getCreateChannelMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createChannel>>,
		TError,
		{ data?: BodyType<AlertmanagertypesPostableChannelDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createChannel>>,
	TError,
	{ data?: BodyType<AlertmanagertypesPostableChannelDTO> },
	TContext
> => {
	const mutationKey = ['createChannel'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createChannel>>,
		{ data?: BodyType<AlertmanagertypesPostableChannelDTO> }
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
		{ data?: BodyType<AlertmanagertypesPostableChannelDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createChannel>>,
	TError,
	{ data?: BodyType<AlertmanagertypesPostableChannelDTO> },
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

export const getDeleteChannelByIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteChannelByID>>,
		TError,
		{ pathParams: DeleteChannelByIDPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteChannelByID>>,
	TError,
	{ pathParams: DeleteChannelByIDPathParameters },
	TContext
> => {
	const mutationKey = ['deleteChannelByID'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteChannelByID>>,
		{ pathParams: DeleteChannelByIDPathParameters }
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
		{ pathParams: DeleteChannelByIDPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteChannelByID>>,
	TError,
	{ pathParams: DeleteChannelByIDPathParameters },
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
 * @summary Get notification channel by ID
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

export const getUpdateChannelByIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateChannelByID>>,
		TError,
		{
			pathParams: UpdateChannelByIDPathParameters;
			data?: BodyType<AlertmanagertypesReceiverDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateChannelByID>>,
	TError,
	{
		pathParams: UpdateChannelByIDPathParameters;
		data?: BodyType<AlertmanagertypesReceiverDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateChannelByID'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateChannelByID>>,
		{
			pathParams: UpdateChannelByIDPathParameters;
			data?: BodyType<AlertmanagertypesReceiverDTO>;
		}
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
		{
			pathParams: UpdateChannelByIDPathParameters;
			data?: BodyType<AlertmanagertypesReceiverDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateChannelByID>>,
	TError,
	{
		pathParams: UpdateChannelByIDPathParameters;
		data?: BodyType<AlertmanagertypesReceiverDTO>;
	},
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

export const getTestChannelMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof testChannel>>,
		TError,
		{ data?: BodyType<AlertmanagertypesReceiverDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof testChannel>>,
	TError,
	{ data?: BodyType<AlertmanagertypesReceiverDTO> },
	TContext
> => {
	const mutationKey = ['testChannel'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof testChannel>>,
		{ data?: BodyType<AlertmanagertypesReceiverDTO> }
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
		{ data?: BodyType<AlertmanagertypesReceiverDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof testChannel>>,
	TError,
	{ data?: BodyType<AlertmanagertypesReceiverDTO> },
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

export const getTestChannelDeprecatedMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof testChannelDeprecated>>,
		TError,
		{ data?: BodyType<AlertmanagertypesReceiverDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof testChannelDeprecated>>,
	TError,
	{ data?: BodyType<AlertmanagertypesReceiverDTO> },
	TContext
> => {
	const mutationKey = ['testChannelDeprecated'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof testChannelDeprecated>>,
		{ data?: BodyType<AlertmanagertypesReceiverDTO> }
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
		{ data?: BodyType<AlertmanagertypesReceiverDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof testChannelDeprecated>>,
	TError,
	{ data?: BodyType<AlertmanagertypesReceiverDTO> },
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
 * @summary List notification channels
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

export const getCreateNotificationChannelMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createNotificationChannel>>,
		TError,
		{ data?: BodyType<AlertmanagertypesPostableNotificationChannelDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createNotificationChannel>>,
	TError,
	{ data?: BodyType<AlertmanagertypesPostableNotificationChannelDTO> },
	TContext
> => {
	const mutationKey = ['createNotificationChannel'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createNotificationChannel>>,
		{ data?: BodyType<AlertmanagertypesPostableNotificationChannelDTO> }
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
		{ data?: BodyType<AlertmanagertypesPostableNotificationChannelDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createNotificationChannel>>,
	TError,
	{ data?: BodyType<AlertmanagertypesPostableNotificationChannelDTO> },
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

export const getDeleteNotificationChannelMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteNotificationChannel>>,
		TError,
		{ pathParams: DeleteNotificationChannelPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteNotificationChannel>>,
	TError,
	{ pathParams: DeleteNotificationChannelPathParameters },
	TContext
> => {
	const mutationKey = ['deleteNotificationChannel'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteNotificationChannel>>,
		{ pathParams: DeleteNotificationChannelPathParameters }
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
		{ pathParams: DeleteNotificationChannelPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteNotificationChannel>>,
	TError,
	{ pathParams: DeleteNotificationChannelPathParameters },
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
 * @summary Get notification channel by ID
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

export const getUpdateNotificationChannelMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateNotificationChannel>>,
		TError,
		{
			pathParams: UpdateNotificationChannelPathParameters;
			data?: BodyType<AlertmanagertypesUpdatableNotificationChannelDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateNotificationChannel>>,
	TError,
	{
		pathParams: UpdateNotificationChannelPathParameters;
		data?: BodyType<AlertmanagertypesUpdatableNotificationChannelDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateNotificationChannel'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateNotificationChannel>>,
		{
			pathParams: UpdateNotificationChannelPathParameters;
			data?: BodyType<AlertmanagertypesUpdatableNotificationChannelDTO>;
		}
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
		{
			pathParams: UpdateNotificationChannelPathParameters;
			data?: BodyType<AlertmanagertypesUpdatableNotificationChannelDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateNotificationChannel>>,
	TError,
	{
		pathParams: UpdateNotificationChannelPathParameters;
		data?: BodyType<AlertmanagertypesUpdatableNotificationChannelDTO>;
	},
	TContext
> => {
	return useMutation(getUpdateNotificationChannelMutationOptions(options));
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

export const getTestNotificationChannelMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof testNotificationChannel>>,
		TError,
		{ data?: BodyType<AlertmanagertypesTestableNotificationChannelDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof testNotificationChannel>>,
	TError,
	{ data?: BodyType<AlertmanagertypesTestableNotificationChannelDTO> },
	TContext
> => {
	const mutationKey = ['testNotificationChannel'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof testNotificationChannel>>,
		{ data?: BodyType<AlertmanagertypesTestableNotificationChannelDTO> }
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
		{ data?: BodyType<AlertmanagertypesTestableNotificationChannelDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof testNotificationChannel>>,
	TError,
	{ data?: BodyType<AlertmanagertypesTestableNotificationChannelDTO> },
	TContext
> => {
	return useMutation(getTestNotificationChannelMutationOptions(options));
};
