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
	ConfigReceiverDTO,
	CreateChannel201,
	DeleteChannelByIDPathParameters,
	GetChannelByID200,
	GetChannelByIDPathParameters,
	ListChannels200,
	RenderErrorResponseDTO,
	UpdateChannelByIDPathParameters,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

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

	query.queryKey = queryOptions.queryKey;

	return query;
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
	alertmanagertypesPostableChannelDTO: BodyType<AlertmanagertypesPostableChannelDTO>,
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
		{ data: BodyType<AlertmanagertypesPostableChannelDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createChannel>>,
	TError,
	{ data: BodyType<AlertmanagertypesPostableChannelDTO> },
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
		{ data: BodyType<AlertmanagertypesPostableChannelDTO> }
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
	BodyType<AlertmanagertypesPostableChannelDTO>;
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
		{ data: BodyType<AlertmanagertypesPostableChannelDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createChannel>>,
	TError,
	{ data: BodyType<AlertmanagertypesPostableChannelDTO> },
	TContext
> => {
	const mutationOptions = getCreateChannelMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint deletes a notification channel by ID
 * @summary Delete notification channel
 */
export const deleteChannelByID = ({ id }: DeleteChannelByIDPathParameters) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/channels/${id}`,
		method: 'DELETE',
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
	const mutationOptions = getDeleteChannelByIDMutationOptions(options);

	return useMutation(mutationOptions);
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
		enabled: !!id,
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

	query.queryKey = queryOptions.queryKey;

	return query;
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
	configReceiverDTO: BodyType<ConfigReceiverDTO>,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/channels/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: configReceiverDTO,
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
			data: BodyType<ConfigReceiverDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateChannelByID>>,
	TError,
	{
		pathParams: UpdateChannelByIDPathParameters;
		data: BodyType<ConfigReceiverDTO>;
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
			data: BodyType<ConfigReceiverDTO>;
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
export type UpdateChannelByIDMutationBody = BodyType<ConfigReceiverDTO>;
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
			data: BodyType<ConfigReceiverDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateChannelByID>>,
	TError,
	{
		pathParams: UpdateChannelByIDPathParameters;
		data: BodyType<ConfigReceiverDTO>;
	},
	TContext
> => {
	const mutationOptions = getUpdateChannelByIDMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint tests a notification channel by sending a test notification
 * @summary Test notification channel
 */
export const testChannel = (
	configReceiverDTO: BodyType<ConfigReceiverDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/channels/test`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: configReceiverDTO,
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
		{ data: BodyType<ConfigReceiverDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof testChannel>>,
	TError,
	{ data: BodyType<ConfigReceiverDTO> },
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
		{ data: BodyType<ConfigReceiverDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return testChannel(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type TestChannelMutationResult = NonNullable<
	Awaited<ReturnType<typeof testChannel>>
>;
export type TestChannelMutationBody = BodyType<ConfigReceiverDTO>;
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
		{ data: BodyType<ConfigReceiverDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof testChannel>>,
	TError,
	{ data: BodyType<ConfigReceiverDTO> },
	TContext
> => {
	const mutationOptions = getTestChannelMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Deprecated: use /api/v1/channels/test instead
 * @deprecated
 * @summary Test notification channel (deprecated)
 */
export const testChannelDeprecated = (
	configReceiverDTO: BodyType<ConfigReceiverDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/testChannel`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: configReceiverDTO,
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
		{ data: BodyType<ConfigReceiverDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof testChannelDeprecated>>,
	TError,
	{ data: BodyType<ConfigReceiverDTO> },
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
		{ data: BodyType<ConfigReceiverDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return testChannelDeprecated(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type TestChannelDeprecatedMutationResult = NonNullable<
	Awaited<ReturnType<typeof testChannelDeprecated>>
>;
export type TestChannelDeprecatedMutationBody = BodyType<ConfigReceiverDTO>;
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
		{ data: BodyType<ConfigReceiverDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof testChannelDeprecated>>,
	TError,
	{ data: BodyType<ConfigReceiverDTO> },
	TContext
> => {
	const mutationOptions = getTestChannelDeprecatedMutationOptions(options);

	return useMutation(mutationOptions);
};
