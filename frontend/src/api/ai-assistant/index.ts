/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz AI Assistant
 * * regenerate with 'yarn generate:api'
 * SigNoz AI Assistant API
 * OpenAPI spec version: 0.1.0
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
	ActionResultResponseDTO,
	ApproveApiV1AssistantApprovePostHeaders,
	ApproveRequestDTO,
	ApproveResponseDTO,
	CancelApiV1AssistantCancelPostHeaders,
	CancelRequestDTO,
	CancelResponseDTO,
	ChipsResponseDTO,
	ClarifyApiV1AssistantClarifyPostHeaders,
	ClarifyRequestDTO,
	ClarifyResponseDTO,
	CreateMessageApiV1AssistantThreadsThreadIdMessagesPostHeaders,
	CreateMessageApiV1AssistantThreadsThreadIdMessagesPostPathParameters,
	CreateMessageRequestDTO,
	CreateMessageResponseDTO,
	CreateThreadApiV1AssistantThreadsPostBody,
	CreateThreadApiV1AssistantThreadsPostHeaders,
	CreateThreadResponseDTO,
	ErrorResponseDTO,
	FeedbackRequestDTO,
	FeedbackResponseDTO,
	GetChipsApiV1AssistantEmptyStateChipsGetHeaders,
	GetChipsApiV1AssistantEmptyStateChipsGetParams,
	GetThreadApiV1AssistantThreadsThreadIdGetHeaders,
	GetThreadApiV1AssistantThreadsThreadIdGetPathParameters,
	GetUsageApiV1AssistantUsageGetHeaders,
	HTTPValidationErrorDTO,
	HealthResponseDTO,
	ListThreadsApiV1AssistantThreadsGetHeaders,
	ListThreadsApiV1AssistantThreadsGetParams,
	ReadinessResponseDTO,
	RegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostHeaders,
	RegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostPathParameters,
	RegenerateResponseDTO,
	RejectApiV1AssistantRejectPostHeaders,
	RejectRequestDTO,
	RestoreApiV1AssistantRestorePostHeaders,
	RestoreRequestDTO,
	RevertApiV1AssistantRevertPostHeaders,
	RevertRequestDTO,
	SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostHeaders,
	SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostPathParameters,
	ThreadDetailResponseDTO,
	ThreadListResponseDTO,
	ThreadSummaryDTO,
	UndoApiV1AssistantUndoPostHeaders,
	UndoRequestDTO,
	UpdateThreadApiV1AssistantThreadsThreadIdPatchHeaders,
	UpdateThreadApiV1AssistantThreadsThreadIdPatchPathParameters,
	UpdateThreadRequestDTO,
	UsageResponseDTO,
} from './sigNozAIAssistantAPI.schemas';

import { GeneratedAPIInstance } from '../generatedAPIInstance';
import type { ErrorType, BodyType } from '../generatedAPIInstance';

/**
 * @summary Healthz
 */
export const healthzHealthzGet = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<HealthResponseDTO>({
		url: `/healthz`,
		method: 'GET',
		signal,
	});
};

export const getHealthzHealthzGetQueryKey = () => {
	return [`/healthz`] as const;
};

export const getHealthzHealthzGetQueryOptions = <
	TData = Awaited<ReturnType<typeof healthzHealthzGet>>,
	TError = ErrorType<unknown>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof healthzHealthzGet>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getHealthzHealthzGetQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof healthzHealthzGet>>
	> = ({ signal }) => healthzHealthzGet(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof healthzHealthzGet>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type HealthzHealthzGetQueryResult = NonNullable<
	Awaited<ReturnType<typeof healthzHealthzGet>>
>;
export type HealthzHealthzGetQueryError = ErrorType<unknown>;

/**
 * @summary Healthz
 */

export function useHealthzHealthzGet<
	TData = Awaited<ReturnType<typeof healthzHealthzGet>>,
	TError = ErrorType<unknown>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof healthzHealthzGet>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getHealthzHealthzGetQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Healthz
 */
export const invalidateHealthzHealthzGet = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getHealthzHealthzGetQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * @summary Readyz
 */
export const readyzReadyzGet = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ReadinessResponseDTO>({
		url: `/readyz`,
		method: 'GET',
		signal,
	});
};

export const getReadyzReadyzGetQueryKey = () => {
	return [`/readyz`] as const;
};

export const getReadyzReadyzGetQueryOptions = <
	TData = Awaited<ReturnType<typeof readyzReadyzGet>>,
	TError = ErrorType<ReadinessResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof readyzReadyzGet>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getReadyzReadyzGetQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof readyzReadyzGet>>> = ({
		signal,
	}) => readyzReadyzGet(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof readyzReadyzGet>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ReadyzReadyzGetQueryResult = NonNullable<
	Awaited<ReturnType<typeof readyzReadyzGet>>
>;
export type ReadyzReadyzGetQueryError = ErrorType<ReadinessResponseDTO>;

/**
 * @summary Readyz
 */

export function useReadyzReadyzGet<
	TData = Awaited<ReturnType<typeof readyzReadyzGet>>,
	TError = ErrorType<ReadinessResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof readyzReadyzGet>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getReadyzReadyzGetQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Readyz
 */
export const invalidateReadyzReadyzGet = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getReadyzReadyzGetQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * @summary Create a new thread
 */
export const createThreadApiV1AssistantThreadsPost = (
	createThreadApiV1AssistantThreadsPostBody?: BodyType<CreateThreadApiV1AssistantThreadsPostBody>,
	headers?: CreateThreadApiV1AssistantThreadsPostHeaders,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateThreadResponseDTO>({
		url: `/api/v1/assistant/threads`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		data: createThreadApiV1AssistantThreadsPostBody,
		signal,
	});
};

export const getCreateThreadApiV1AssistantThreadsPostMutationOptions = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createThreadApiV1AssistantThreadsPost>>,
		TError,
		{
			data?: BodyType<CreateThreadApiV1AssistantThreadsPostBody>;
			headers?: CreateThreadApiV1AssistantThreadsPostHeaders;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createThreadApiV1AssistantThreadsPost>>,
	TError,
	{
		data?: BodyType<CreateThreadApiV1AssistantThreadsPostBody>;
		headers?: CreateThreadApiV1AssistantThreadsPostHeaders;
	},
	TContext
> => {
	const mutationKey = ['createThreadApiV1AssistantThreadsPost'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createThreadApiV1AssistantThreadsPost>>,
		{
			data?: BodyType<CreateThreadApiV1AssistantThreadsPostBody>;
			headers?: CreateThreadApiV1AssistantThreadsPostHeaders;
		}
	> = (props) => {
		const { data, headers } = props ?? {};

		return createThreadApiV1AssistantThreadsPost(data, headers);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateThreadApiV1AssistantThreadsPostMutationResult = NonNullable<
	Awaited<ReturnType<typeof createThreadApiV1AssistantThreadsPost>>
>;
export type CreateThreadApiV1AssistantThreadsPostMutationBody =
	| BodyType<CreateThreadApiV1AssistantThreadsPostBody>
	| undefined;
export type CreateThreadApiV1AssistantThreadsPostMutationError = ErrorType<
	ErrorResponseDTO | HTTPValidationErrorDTO
>;

/**
 * @summary Create a new thread
 */
export const useCreateThreadApiV1AssistantThreadsPost = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createThreadApiV1AssistantThreadsPost>>,
		TError,
		{
			data?: BodyType<CreateThreadApiV1AssistantThreadsPostBody>;
			headers?: CreateThreadApiV1AssistantThreadsPostHeaders;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createThreadApiV1AssistantThreadsPost>>,
	TError,
	{
		data?: BodyType<CreateThreadApiV1AssistantThreadsPostBody>;
		headers?: CreateThreadApiV1AssistantThreadsPostHeaders;
	},
	TContext
> => {
	return useMutation(
		getCreateThreadApiV1AssistantThreadsPostMutationOptions(options),
	);
};
/**
 * Cursor-based pagination, sorted by updatedAt desc. Use `archived=true|false|all` to filter.
 * @summary List threads
 */
export const listThreadsApiV1AssistantThreadsGet = (
	params?: ListThreadsApiV1AssistantThreadsGetParams,
	headers?: ListThreadsApiV1AssistantThreadsGetHeaders,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ThreadListResponseDTO>({
		url: `/api/v1/assistant/threads`,
		method: 'GET',
		headers,
		params,
		signal,
	});
};

export const getListThreadsApiV1AssistantThreadsGetQueryKey = (
	params?: ListThreadsApiV1AssistantThreadsGetParams,
) => {
	return [`/api/v1/assistant/threads`, ...(params ? [params] : [])] as const;
};

export const getListThreadsApiV1AssistantThreadsGetQueryOptions = <
	TData = Awaited<ReturnType<typeof listThreadsApiV1AssistantThreadsGet>>,
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
>(
	params?: ListThreadsApiV1AssistantThreadsGetParams,
	headers?: ListThreadsApiV1AssistantThreadsGetHeaders,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listThreadsApiV1AssistantThreadsGet>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getListThreadsApiV1AssistantThreadsGetQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listThreadsApiV1AssistantThreadsGet>>
	> = ({ signal }) =>
		listThreadsApiV1AssistantThreadsGet(params, headers, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listThreadsApiV1AssistantThreadsGet>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListThreadsApiV1AssistantThreadsGetQueryResult = NonNullable<
	Awaited<ReturnType<typeof listThreadsApiV1AssistantThreadsGet>>
>;
export type ListThreadsApiV1AssistantThreadsGetQueryError = ErrorType<
	ErrorResponseDTO | HTTPValidationErrorDTO
>;

/**
 * @summary List threads
 */

export function useListThreadsApiV1AssistantThreadsGet<
	TData = Awaited<ReturnType<typeof listThreadsApiV1AssistantThreadsGet>>,
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
>(
	params?: ListThreadsApiV1AssistantThreadsGetParams,
	headers?: ListThreadsApiV1AssistantThreadsGetHeaders,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listThreadsApiV1AssistantThreadsGet>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListThreadsApiV1AssistantThreadsGetQueryOptions(
		params,
		headers,
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary List threads
 */
export const invalidateListThreadsApiV1AssistantThreadsGet = async (
	queryClient: QueryClient,
	params?: ListThreadsApiV1AssistantThreadsGetParams,
	headers?: ListThreadsApiV1AssistantThreadsGetHeaders,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListThreadsApiV1AssistantThreadsGetQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * Cold-start reconstruction path. Returns all messages, pending approval/clarification, and active execution.
 * @summary Get thread with full conversation state
 */
export const getThreadApiV1AssistantThreadsThreadIdGet = (
	{ threadId }: GetThreadApiV1AssistantThreadsThreadIdGetPathParameters,
	headers?: GetThreadApiV1AssistantThreadsThreadIdGetHeaders,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ThreadDetailResponseDTO>({
		url: `/api/v1/assistant/threads/${threadId}`,
		method: 'GET',
		headers,
		signal,
	});
};

export const getGetThreadApiV1AssistantThreadsThreadIdGetQueryKey = ({
	threadId,
}: GetThreadApiV1AssistantThreadsThreadIdGetPathParameters) => {
	return [`/api/v1/assistant/threads/${threadId}`] as const;
};

export const getGetThreadApiV1AssistantThreadsThreadIdGetQueryOptions = <
	TData = Awaited<ReturnType<typeof getThreadApiV1AssistantThreadsThreadIdGet>>,
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
>(
	{ threadId }: GetThreadApiV1AssistantThreadsThreadIdGetPathParameters,
	headers?: GetThreadApiV1AssistantThreadsThreadIdGetHeaders,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getThreadApiV1AssistantThreadsThreadIdGet>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getGetThreadApiV1AssistantThreadsThreadIdGetQueryKey({ threadId });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getThreadApiV1AssistantThreadsThreadIdGet>>
	> = ({ signal }) =>
		getThreadApiV1AssistantThreadsThreadIdGet({ threadId }, headers, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!threadId,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getThreadApiV1AssistantThreadsThreadIdGet>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetThreadApiV1AssistantThreadsThreadIdGetQueryResult = NonNullable<
	Awaited<ReturnType<typeof getThreadApiV1AssistantThreadsThreadIdGet>>
>;
export type GetThreadApiV1AssistantThreadsThreadIdGetQueryError = ErrorType<
	ErrorResponseDTO | HTTPValidationErrorDTO
>;

/**
 * @summary Get thread with full conversation state
 */

export function useGetThreadApiV1AssistantThreadsThreadIdGet<
	TData = Awaited<ReturnType<typeof getThreadApiV1AssistantThreadsThreadIdGet>>,
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
>(
	{ threadId }: GetThreadApiV1AssistantThreadsThreadIdGetPathParameters,
	headers?: GetThreadApiV1AssistantThreadsThreadIdGetHeaders,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getThreadApiV1AssistantThreadsThreadIdGet>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetThreadApiV1AssistantThreadsThreadIdGetQueryOptions(
		{ threadId },
		headers,
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get thread with full conversation state
 */
export const invalidateGetThreadApiV1AssistantThreadsThreadIdGet = async (
	queryClient: QueryClient,
	{ threadId }: GetThreadApiV1AssistantThreadsThreadIdGetPathParameters,
	headers?: GetThreadApiV1AssistantThreadsThreadIdGetHeaders,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{
			queryKey: getGetThreadApiV1AssistantThreadsThreadIdGetQueryKey({ threadId }),
		},
		options,
	);

	return queryClient;
};

/**
 * @summary Update thread (rename or archive/unarchive)
 */
export const updateThreadApiV1AssistantThreadsThreadIdPatch = (
	{ threadId }: UpdateThreadApiV1AssistantThreadsThreadIdPatchPathParameters,
	updateThreadRequestDTO: BodyType<UpdateThreadRequestDTO>,
	headers?: UpdateThreadApiV1AssistantThreadsThreadIdPatchHeaders,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ThreadSummaryDTO>({
		url: `/api/v1/assistant/threads/${threadId}`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json', ...headers },
		data: updateThreadRequestDTO,
		signal,
	});
};

export const getUpdateThreadApiV1AssistantThreadsThreadIdPatchMutationOptions =
	<
		TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
		TContext = unknown,
	>(options?: {
		mutation?: UseMutationOptions<
			Awaited<ReturnType<typeof updateThreadApiV1AssistantThreadsThreadIdPatch>>,
			TError,
			{
				pathParams: UpdateThreadApiV1AssistantThreadsThreadIdPatchPathParameters;
				data: BodyType<UpdateThreadRequestDTO>;
				headers?: UpdateThreadApiV1AssistantThreadsThreadIdPatchHeaders;
			},
			TContext
		>;
	}): UseMutationOptions<
		Awaited<ReturnType<typeof updateThreadApiV1AssistantThreadsThreadIdPatch>>,
		TError,
		{
			pathParams: UpdateThreadApiV1AssistantThreadsThreadIdPatchPathParameters;
			data: BodyType<UpdateThreadRequestDTO>;
			headers?: UpdateThreadApiV1AssistantThreadsThreadIdPatchHeaders;
		},
		TContext
	> => {
		const mutationKey = ['updateThreadApiV1AssistantThreadsThreadIdPatch'];
		const { mutation: mutationOptions } = options
			? options.mutation &&
				'mutationKey' in options.mutation &&
				options.mutation.mutationKey
				? options
				: { ...options, mutation: { ...options.mutation, mutationKey } }
			: { mutation: { mutationKey } };

		const mutationFn: MutationFunction<
			Awaited<ReturnType<typeof updateThreadApiV1AssistantThreadsThreadIdPatch>>,
			{
				pathParams: UpdateThreadApiV1AssistantThreadsThreadIdPatchPathParameters;
				data: BodyType<UpdateThreadRequestDTO>;
				headers?: UpdateThreadApiV1AssistantThreadsThreadIdPatchHeaders;
			}
		> = (props) => {
			const { pathParams, data, headers } = props ?? {};

			return updateThreadApiV1AssistantThreadsThreadIdPatch(
				pathParams,
				data,
				headers,
			);
		};

		return { mutationFn, ...mutationOptions };
	};

export type UpdateThreadApiV1AssistantThreadsThreadIdPatchMutationResult =
	NonNullable<
		Awaited<ReturnType<typeof updateThreadApiV1AssistantThreadsThreadIdPatch>>
	>;
export type UpdateThreadApiV1AssistantThreadsThreadIdPatchMutationBody =
	BodyType<UpdateThreadRequestDTO>;
export type UpdateThreadApiV1AssistantThreadsThreadIdPatchMutationError =
	ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>;

/**
 * @summary Update thread (rename or archive/unarchive)
 */
export const useUpdateThreadApiV1AssistantThreadsThreadIdPatch = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateThreadApiV1AssistantThreadsThreadIdPatch>>,
		TError,
		{
			pathParams: UpdateThreadApiV1AssistantThreadsThreadIdPatchPathParameters;
			data: BodyType<UpdateThreadRequestDTO>;
			headers?: UpdateThreadApiV1AssistantThreadsThreadIdPatchHeaders;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateThreadApiV1AssistantThreadsThreadIdPatch>>,
	TError,
	{
		pathParams: UpdateThreadApiV1AssistantThreadsThreadIdPatchPathParameters;
		data: BodyType<UpdateThreadRequestDTO>;
		headers?: UpdateThreadApiV1AssistantThreadsThreadIdPatchHeaders;
	},
	TContext
> => {
	return useMutation(
		getUpdateThreadApiV1AssistantThreadsThreadIdPatchMutationOptions(options),
	);
};
/**
 * Persists the user message, creates an execution (state: queued), kicks off the agent loop asynchronously, and returns immediately. Open `GET /executions/{executionId}/events` for the SSE stream.
 * @summary Send a message and start execution
 */
export const createMessageApiV1AssistantThreadsThreadIdMessagesPost = (
	{
		threadId,
	}: CreateMessageApiV1AssistantThreadsThreadIdMessagesPostPathParameters,
	createMessageRequestDTO: BodyType<CreateMessageRequestDTO>,
	headers?: CreateMessageApiV1AssistantThreadsThreadIdMessagesPostHeaders,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateMessageResponseDTO>({
		url: `/api/v1/assistant/threads/${threadId}/messages`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		data: createMessageRequestDTO,
		signal,
	});
};

export const getCreateMessageApiV1AssistantThreadsThreadIdMessagesPostMutationOptions =
	<
		TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
		TContext = unknown,
	>(options?: {
		mutation?: UseMutationOptions<
			Awaited<
				ReturnType<typeof createMessageApiV1AssistantThreadsThreadIdMessagesPost>
			>,
			TError,
			{
				pathParams: CreateMessageApiV1AssistantThreadsThreadIdMessagesPostPathParameters;
				data: BodyType<CreateMessageRequestDTO>;
				headers?: CreateMessageApiV1AssistantThreadsThreadIdMessagesPostHeaders;
			},
			TContext
		>;
	}): UseMutationOptions<
		Awaited<
			ReturnType<typeof createMessageApiV1AssistantThreadsThreadIdMessagesPost>
		>,
		TError,
		{
			pathParams: CreateMessageApiV1AssistantThreadsThreadIdMessagesPostPathParameters;
			data: BodyType<CreateMessageRequestDTO>;
			headers?: CreateMessageApiV1AssistantThreadsThreadIdMessagesPostHeaders;
		},
		TContext
	> => {
		const mutationKey = [
			'createMessageApiV1AssistantThreadsThreadIdMessagesPost',
		];
		const { mutation: mutationOptions } = options
			? options.mutation &&
				'mutationKey' in options.mutation &&
				options.mutation.mutationKey
				? options
				: { ...options, mutation: { ...options.mutation, mutationKey } }
			: { mutation: { mutationKey } };

		const mutationFn: MutationFunction<
			Awaited<
				ReturnType<typeof createMessageApiV1AssistantThreadsThreadIdMessagesPost>
			>,
			{
				pathParams: CreateMessageApiV1AssistantThreadsThreadIdMessagesPostPathParameters;
				data: BodyType<CreateMessageRequestDTO>;
				headers?: CreateMessageApiV1AssistantThreadsThreadIdMessagesPostHeaders;
			}
		> = (props) => {
			const { pathParams, data, headers } = props ?? {};

			return createMessageApiV1AssistantThreadsThreadIdMessagesPost(
				pathParams,
				data,
				headers,
			);
		};

		return { mutationFn, ...mutationOptions };
	};

export type CreateMessageApiV1AssistantThreadsThreadIdMessagesPostMutationResult =
	NonNullable<
		Awaited<
			ReturnType<typeof createMessageApiV1AssistantThreadsThreadIdMessagesPost>
		>
	>;
export type CreateMessageApiV1AssistantThreadsThreadIdMessagesPostMutationBody =
	BodyType<CreateMessageRequestDTO>;
export type CreateMessageApiV1AssistantThreadsThreadIdMessagesPostMutationError =
	ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>;

/**
 * @summary Send a message and start execution
 */
export const useCreateMessageApiV1AssistantThreadsThreadIdMessagesPost = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<
			ReturnType<typeof createMessageApiV1AssistantThreadsThreadIdMessagesPost>
		>,
		TError,
		{
			pathParams: CreateMessageApiV1AssistantThreadsThreadIdMessagesPostPathParameters;
			data: BodyType<CreateMessageRequestDTO>;
			headers?: CreateMessageApiV1AssistantThreadsThreadIdMessagesPostHeaders;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<
		ReturnType<typeof createMessageApiV1AssistantThreadsThreadIdMessagesPost>
	>,
	TError,
	{
		pathParams: CreateMessageApiV1AssistantThreadsThreadIdMessagesPostPathParameters;
		data: BodyType<CreateMessageRequestDTO>;
		headers?: CreateMessageApiV1AssistantThreadsThreadIdMessagesPostHeaders;
	},
	TContext
> => {
	return useMutation(
		getCreateMessageApiV1AssistantThreadsThreadIdMessagesPostMutationOptions(
			options,
		),
	);
};
/**
 * Clean-slate regeneration. Starts a fresh execution with conversation history up to (excluding) the original assistant response.
 * @summary Regenerate assistant response
 */
export const regenerateMessageApiV1AssistantMessagesMessageIdRegeneratePost = (
	{
		messageId,
	}: RegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostPathParameters,
	headers?: RegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostHeaders,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<RegenerateResponseDTO>({
		url: `/api/v1/assistant/messages/${messageId}/regenerate`,
		method: 'POST',
		headers,
		signal,
	});
};

export const getRegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostMutationOptions =
	<
		TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
		TContext = unknown,
	>(options?: {
		mutation?: UseMutationOptions<
			Awaited<
				ReturnType<
					typeof regenerateMessageApiV1AssistantMessagesMessageIdRegeneratePost
				>
			>,
			TError,
			{
				pathParams: RegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostPathParameters;
				headers?: RegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostHeaders;
			},
			TContext
		>;
	}): UseMutationOptions<
		Awaited<
			ReturnType<
				typeof regenerateMessageApiV1AssistantMessagesMessageIdRegeneratePost
			>
		>,
		TError,
		{
			pathParams: RegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostPathParameters;
			headers?: RegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostHeaders;
		},
		TContext
	> => {
		const mutationKey = [
			'regenerateMessageApiV1AssistantMessagesMessageIdRegeneratePost',
		];
		const { mutation: mutationOptions } = options
			? options.mutation &&
				'mutationKey' in options.mutation &&
				options.mutation.mutationKey
				? options
				: { ...options, mutation: { ...options.mutation, mutationKey } }
			: { mutation: { mutationKey } };

		const mutationFn: MutationFunction<
			Awaited<
				ReturnType<
					typeof regenerateMessageApiV1AssistantMessagesMessageIdRegeneratePost
				>
			>,
			{
				pathParams: RegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostPathParameters;
				headers?: RegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostHeaders;
			}
		> = (props) => {
			const { pathParams, headers } = props ?? {};

			return regenerateMessageApiV1AssistantMessagesMessageIdRegeneratePost(
				pathParams,
				headers,
			);
		};

		return { mutationFn, ...mutationOptions };
	};

export type RegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostMutationResult =
	NonNullable<
		Awaited<
			ReturnType<
				typeof regenerateMessageApiV1AssistantMessagesMessageIdRegeneratePost
			>
		>
	>;

export type RegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostMutationError =
	ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>;

/**
 * @summary Regenerate assistant response
 */
export const useRegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePost =
	<
		TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
		TContext = unknown,
	>(options?: {
		mutation?: UseMutationOptions<
			Awaited<
				ReturnType<
					typeof regenerateMessageApiV1AssistantMessagesMessageIdRegeneratePost
				>
			>,
			TError,
			{
				pathParams: RegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostPathParameters;
				headers?: RegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostHeaders;
			},
			TContext
		>;
	}): UseMutationResult<
		Awaited<
			ReturnType<
				typeof regenerateMessageApiV1AssistantMessagesMessageIdRegeneratePost
			>
		>,
		TError,
		{
			pathParams: RegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostPathParameters;
			headers?: RegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostHeaders;
		},
		TContext
	> => {
		return useMutation(
			getRegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostMutationOptions(
				options,
			),
		);
	};
/**
 * Triggers a replay execution that runs the stored tool call with exact params. Returns a new executionId — open SSE for that execution.
 * @summary Approve a pending action
 */
export const approveApiV1AssistantApprovePost = (
	approveRequestDTO: BodyType<ApproveRequestDTO>,
	headers?: ApproveApiV1AssistantApprovePostHeaders,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ApproveResponseDTO>({
		url: `/api/v1/assistant/approve`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		data: approveRequestDTO,
		signal,
	});
};

export const getApproveApiV1AssistantApprovePostMutationOptions = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof approveApiV1AssistantApprovePost>>,
		TError,
		{
			data: BodyType<ApproveRequestDTO>;
			headers?: ApproveApiV1AssistantApprovePostHeaders;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof approveApiV1AssistantApprovePost>>,
	TError,
	{
		data: BodyType<ApproveRequestDTO>;
		headers?: ApproveApiV1AssistantApprovePostHeaders;
	},
	TContext
> => {
	const mutationKey = ['approveApiV1AssistantApprovePost'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof approveApiV1AssistantApprovePost>>,
		{
			data: BodyType<ApproveRequestDTO>;
			headers?: ApproveApiV1AssistantApprovePostHeaders;
		}
	> = (props) => {
		const { data, headers } = props ?? {};

		return approveApiV1AssistantApprovePost(data, headers);
	};

	return { mutationFn, ...mutationOptions };
};

export type ApproveApiV1AssistantApprovePostMutationResult = NonNullable<
	Awaited<ReturnType<typeof approveApiV1AssistantApprovePost>>
>;
export type ApproveApiV1AssistantApprovePostMutationBody =
	BodyType<ApproveRequestDTO>;
export type ApproveApiV1AssistantApprovePostMutationError = ErrorType<
	ErrorResponseDTO | HTTPValidationErrorDTO
>;

/**
 * @summary Approve a pending action
 */
export const useApproveApiV1AssistantApprovePost = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof approveApiV1AssistantApprovePost>>,
		TError,
		{
			data: BodyType<ApproveRequestDTO>;
			headers?: ApproveApiV1AssistantApprovePostHeaders;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof approveApiV1AssistantApprovePost>>,
	TError,
	{
		data: BodyType<ApproveRequestDTO>;
		headers?: ApproveApiV1AssistantApprovePostHeaders;
	},
	TContext
> => {
	return useMutation(
		getApproveApiV1AssistantApprovePostMutationOptions(options),
	);
};
/**
 * Marks the approval as rejected. The execution completes with no tool execution.
 * @summary Reject a pending action
 */
export const rejectApiV1AssistantRejectPost = (
	rejectRequestDTO: BodyType<RejectRequestDTO>,
	headers?: RejectApiV1AssistantRejectPostHeaders,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/assistant/reject`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		data: rejectRequestDTO,
		signal,
	});
};

export const getRejectApiV1AssistantRejectPostMutationOptions = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof rejectApiV1AssistantRejectPost>>,
		TError,
		{
			data: BodyType<RejectRequestDTO>;
			headers?: RejectApiV1AssistantRejectPostHeaders;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof rejectApiV1AssistantRejectPost>>,
	TError,
	{
		data: BodyType<RejectRequestDTO>;
		headers?: RejectApiV1AssistantRejectPostHeaders;
	},
	TContext
> => {
	const mutationKey = ['rejectApiV1AssistantRejectPost'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof rejectApiV1AssistantRejectPost>>,
		{
			data: BodyType<RejectRequestDTO>;
			headers?: RejectApiV1AssistantRejectPostHeaders;
		}
	> = (props) => {
		const { data, headers } = props ?? {};

		return rejectApiV1AssistantRejectPost(data, headers);
	};

	return { mutationFn, ...mutationOptions };
};

export type RejectApiV1AssistantRejectPostMutationResult = NonNullable<
	Awaited<ReturnType<typeof rejectApiV1AssistantRejectPost>>
>;
export type RejectApiV1AssistantRejectPostMutationBody =
	BodyType<RejectRequestDTO>;
export type RejectApiV1AssistantRejectPostMutationError = ErrorType<
	ErrorResponseDTO | HTTPValidationErrorDTO
>;

/**
 * @summary Reject a pending action
 */
export const useRejectApiV1AssistantRejectPost = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof rejectApiV1AssistantRejectPost>>,
		TError,
		{
			data: BodyType<RejectRequestDTO>;
			headers?: RejectApiV1AssistantRejectPostHeaders;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof rejectApiV1AssistantRejectPost>>,
	TError,
	{
		data: BodyType<RejectRequestDTO>;
		headers?: RejectApiV1AssistantRejectPostHeaders;
	},
	TContext
> => {
	return useMutation(getRejectApiV1AssistantRejectPostMutationOptions(options));
};
/**
 * Provides structured answers to a clarification request. Persists the answers as a user transcript message, emits `user_message` as the first replayable event on the new execution stream, and resumes the agent with the answers as tool results.
 * @summary Submit clarification answers
 */
export const clarifyApiV1AssistantClarifyPost = (
	clarifyRequestDTO: BodyType<ClarifyRequestDTO>,
	headers?: ClarifyApiV1AssistantClarifyPostHeaders,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ClarifyResponseDTO>({
		url: `/api/v1/assistant/clarify`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		data: clarifyRequestDTO,
		signal,
	});
};

export const getClarifyApiV1AssistantClarifyPostMutationOptions = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof clarifyApiV1AssistantClarifyPost>>,
		TError,
		{
			data: BodyType<ClarifyRequestDTO>;
			headers?: ClarifyApiV1AssistantClarifyPostHeaders;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof clarifyApiV1AssistantClarifyPost>>,
	TError,
	{
		data: BodyType<ClarifyRequestDTO>;
		headers?: ClarifyApiV1AssistantClarifyPostHeaders;
	},
	TContext
> => {
	const mutationKey = ['clarifyApiV1AssistantClarifyPost'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof clarifyApiV1AssistantClarifyPost>>,
		{
			data: BodyType<ClarifyRequestDTO>;
			headers?: ClarifyApiV1AssistantClarifyPostHeaders;
		}
	> = (props) => {
		const { data, headers } = props ?? {};

		return clarifyApiV1AssistantClarifyPost(data, headers);
	};

	return { mutationFn, ...mutationOptions };
};

export type ClarifyApiV1AssistantClarifyPostMutationResult = NonNullable<
	Awaited<ReturnType<typeof clarifyApiV1AssistantClarifyPost>>
>;
export type ClarifyApiV1AssistantClarifyPostMutationBody =
	BodyType<ClarifyRequestDTO>;
export type ClarifyApiV1AssistantClarifyPostMutationError = ErrorType<
	ErrorResponseDTO | HTTPValidationErrorDTO
>;

/**
 * @summary Submit clarification answers
 */
export const useClarifyApiV1AssistantClarifyPost = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof clarifyApiV1AssistantClarifyPost>>,
		TError,
		{
			data: BodyType<ClarifyRequestDTO>;
			headers?: ClarifyApiV1AssistantClarifyPostHeaders;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof clarifyApiV1AssistantClarifyPost>>,
	TError,
	{
		data: BodyType<ClarifyRequestDTO>;
		headers?: ClarifyApiV1AssistantClarifyPostHeaders;
	},
	TContext
> => {
	return useMutation(
		getClarifyApiV1AssistantClarifyPostMutationOptions(options),
	);
};
/**
 * Cooperative cancel. The agent loop finishes its current step, emits a truncated message if streaming, and transitions to canceled.
 * @summary Cancel the active execution on a thread
 */
export const cancelApiV1AssistantCancelPost = (
	cancelRequestDTO: BodyType<CancelRequestDTO>,
	headers?: CancelApiV1AssistantCancelPostHeaders,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CancelResponseDTO>({
		url: `/api/v1/assistant/cancel`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		data: cancelRequestDTO,
		signal,
	});
};

export const getCancelApiV1AssistantCancelPostMutationOptions = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof cancelApiV1AssistantCancelPost>>,
		TError,
		{
			data: BodyType<CancelRequestDTO>;
			headers?: CancelApiV1AssistantCancelPostHeaders;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof cancelApiV1AssistantCancelPost>>,
	TError,
	{
		data: BodyType<CancelRequestDTO>;
		headers?: CancelApiV1AssistantCancelPostHeaders;
	},
	TContext
> => {
	const mutationKey = ['cancelApiV1AssistantCancelPost'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof cancelApiV1AssistantCancelPost>>,
		{
			data: BodyType<CancelRequestDTO>;
			headers?: CancelApiV1AssistantCancelPostHeaders;
		}
	> = (props) => {
		const { data, headers } = props ?? {};

		return cancelApiV1AssistantCancelPost(data, headers);
	};

	return { mutationFn, ...mutationOptions };
};

export type CancelApiV1AssistantCancelPostMutationResult = NonNullable<
	Awaited<ReturnType<typeof cancelApiV1AssistantCancelPost>>
>;
export type CancelApiV1AssistantCancelPostMutationBody =
	BodyType<CancelRequestDTO>;
export type CancelApiV1AssistantCancelPostMutationError = ErrorType<
	ErrorResponseDTO | HTTPValidationErrorDTO
>;

/**
 * @summary Cancel the active execution on a thread
 */
export const useCancelApiV1AssistantCancelPost = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof cancelApiV1AssistantCancelPost>>,
		TError,
		{
			data: BodyType<CancelRequestDTO>;
			headers?: CancelApiV1AssistantCancelPostHeaders;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof cancelApiV1AssistantCancelPost>>,
	TError,
	{
		data: BodyType<CancelRequestDTO>;
		headers?: CancelApiV1AssistantCancelPostHeaders;
	},
	TContext
> => {
	return useMutation(getCancelApiV1AssistantCancelPostMutationOptions(options));
};
/**
 * Deletes the resource that was created by the assistant.
 * @summary Undo a create action
 */
export const undoApiV1AssistantUndoPost = (
	undoRequestDTO: BodyType<UndoRequestDTO>,
	headers?: UndoApiV1AssistantUndoPostHeaders,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ActionResultResponseDTO>({
		url: `/api/v1/assistant/undo`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		data: undoRequestDTO,
		signal,
	});
};

export const getUndoApiV1AssistantUndoPostMutationOptions = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof undoApiV1AssistantUndoPost>>,
		TError,
		{
			data: BodyType<UndoRequestDTO>;
			headers?: UndoApiV1AssistantUndoPostHeaders;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof undoApiV1AssistantUndoPost>>,
	TError,
	{
		data: BodyType<UndoRequestDTO>;
		headers?: UndoApiV1AssistantUndoPostHeaders;
	},
	TContext
> => {
	const mutationKey = ['undoApiV1AssistantUndoPost'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof undoApiV1AssistantUndoPost>>,
		{
			data: BodyType<UndoRequestDTO>;
			headers?: UndoApiV1AssistantUndoPostHeaders;
		}
	> = (props) => {
		const { data, headers } = props ?? {};

		return undoApiV1AssistantUndoPost(data, headers);
	};

	return { mutationFn, ...mutationOptions };
};

export type UndoApiV1AssistantUndoPostMutationResult = NonNullable<
	Awaited<ReturnType<typeof undoApiV1AssistantUndoPost>>
>;
export type UndoApiV1AssistantUndoPostMutationBody = BodyType<UndoRequestDTO>;
export type UndoApiV1AssistantUndoPostMutationError = ErrorType<
	ErrorResponseDTO | HTTPValidationErrorDTO
>;

/**
 * @summary Undo a create action
 */
export const useUndoApiV1AssistantUndoPost = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof undoApiV1AssistantUndoPost>>,
		TError,
		{
			data: BodyType<UndoRequestDTO>;
			headers?: UndoApiV1AssistantUndoPostHeaders;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof undoApiV1AssistantUndoPost>>,
	TError,
	{
		data: BodyType<UndoRequestDTO>;
		headers?: UndoApiV1AssistantUndoPostHeaders;
	},
	TContext
> => {
	return useMutation(getUndoApiV1AssistantUndoPostMutationOptions(options));
};
/**
 * Rolls back the resource to its pre-change snapshot.
 * @summary Revert a modify action
 */
export const revertApiV1AssistantRevertPost = (
	revertRequestDTO: BodyType<RevertRequestDTO>,
	headers?: RevertApiV1AssistantRevertPostHeaders,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ActionResultResponseDTO>({
		url: `/api/v1/assistant/revert`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		data: revertRequestDTO,
		signal,
	});
};

export const getRevertApiV1AssistantRevertPostMutationOptions = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof revertApiV1AssistantRevertPost>>,
		TError,
		{
			data: BodyType<RevertRequestDTO>;
			headers?: RevertApiV1AssistantRevertPostHeaders;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof revertApiV1AssistantRevertPost>>,
	TError,
	{
		data: BodyType<RevertRequestDTO>;
		headers?: RevertApiV1AssistantRevertPostHeaders;
	},
	TContext
> => {
	const mutationKey = ['revertApiV1AssistantRevertPost'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof revertApiV1AssistantRevertPost>>,
		{
			data: BodyType<RevertRequestDTO>;
			headers?: RevertApiV1AssistantRevertPostHeaders;
		}
	> = (props) => {
		const { data, headers } = props ?? {};

		return revertApiV1AssistantRevertPost(data, headers);
	};

	return { mutationFn, ...mutationOptions };
};

export type RevertApiV1AssistantRevertPostMutationResult = NonNullable<
	Awaited<ReturnType<typeof revertApiV1AssistantRevertPost>>
>;
export type RevertApiV1AssistantRevertPostMutationBody =
	BodyType<RevertRequestDTO>;
export type RevertApiV1AssistantRevertPostMutationError = ErrorType<
	ErrorResponseDTO | HTTPValidationErrorDTO
>;

/**
 * @summary Revert a modify action
 */
export const useRevertApiV1AssistantRevertPost = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof revertApiV1AssistantRevertPost>>,
		TError,
		{
			data: BodyType<RevertRequestDTO>;
			headers?: RevertApiV1AssistantRevertPostHeaders;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof revertApiV1AssistantRevertPost>>,
	TError,
	{
		data: BodyType<RevertRequestDTO>;
		headers?: RevertApiV1AssistantRevertPostHeaders;
	},
	TContext
> => {
	return useMutation(getRevertApiV1AssistantRevertPostMutationOptions(options));
};
/**
 * Recreates the resource from its pre-delete snapshot.
 * @summary Restore a deleted resource
 */
export const restoreApiV1AssistantRestorePost = (
	restoreRequestDTO: BodyType<RestoreRequestDTO>,
	headers?: RestoreApiV1AssistantRestorePostHeaders,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ActionResultResponseDTO>({
		url: `/api/v1/assistant/restore`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		data: restoreRequestDTO,
		signal,
	});
};

export const getRestoreApiV1AssistantRestorePostMutationOptions = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof restoreApiV1AssistantRestorePost>>,
		TError,
		{
			data: BodyType<RestoreRequestDTO>;
			headers?: RestoreApiV1AssistantRestorePostHeaders;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof restoreApiV1AssistantRestorePost>>,
	TError,
	{
		data: BodyType<RestoreRequestDTO>;
		headers?: RestoreApiV1AssistantRestorePostHeaders;
	},
	TContext
> => {
	const mutationKey = ['restoreApiV1AssistantRestorePost'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof restoreApiV1AssistantRestorePost>>,
		{
			data: BodyType<RestoreRequestDTO>;
			headers?: RestoreApiV1AssistantRestorePostHeaders;
		}
	> = (props) => {
		const { data, headers } = props ?? {};

		return restoreApiV1AssistantRestorePost(data, headers);
	};

	return { mutationFn, ...mutationOptions };
};

export type RestoreApiV1AssistantRestorePostMutationResult = NonNullable<
	Awaited<ReturnType<typeof restoreApiV1AssistantRestorePost>>
>;
export type RestoreApiV1AssistantRestorePostMutationBody =
	BodyType<RestoreRequestDTO>;
export type RestoreApiV1AssistantRestorePostMutationError = ErrorType<
	ErrorResponseDTO | HTTPValidationErrorDTO
>;

/**
 * @summary Restore a deleted resource
 */
export const useRestoreApiV1AssistantRestorePost = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof restoreApiV1AssistantRestorePost>>,
		TError,
		{
			data: BodyType<RestoreRequestDTO>;
			headers?: RestoreApiV1AssistantRestorePostHeaders;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof restoreApiV1AssistantRestorePost>>,
	TError,
	{
		data: BodyType<RestoreRequestDTO>;
		headers?: RestoreApiV1AssistantRestorePostHeaders;
	},
	TContext
> => {
	return useMutation(
		getRestoreApiV1AssistantRestorePostMutationOptions(options),
	);
};
/**
 * @summary Submit feedback on an assistant message
 */
export const submitFeedbackApiV1AssistantMessagesMessageIdFeedbackPost = (
	{
		messageId,
	}: SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostPathParameters,
	feedbackRequestDTO: BodyType<FeedbackRequestDTO>,
	headers?: SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostHeaders,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<FeedbackResponseDTO>({
		url: `/api/v1/assistant/messages/${messageId}/feedback`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		data: feedbackRequestDTO,
		signal,
	});
};

export const getSubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostMutationOptions =
	<
		TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
		TContext = unknown,
	>(options?: {
		mutation?: UseMutationOptions<
			Awaited<
				ReturnType<typeof submitFeedbackApiV1AssistantMessagesMessageIdFeedbackPost>
			>,
			TError,
			{
				pathParams: SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostPathParameters;
				data: BodyType<FeedbackRequestDTO>;
				headers?: SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostHeaders;
			},
			TContext
		>;
	}): UseMutationOptions<
		Awaited<
			ReturnType<typeof submitFeedbackApiV1AssistantMessagesMessageIdFeedbackPost>
		>,
		TError,
		{
			pathParams: SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostPathParameters;
			data: BodyType<FeedbackRequestDTO>;
			headers?: SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostHeaders;
		},
		TContext
	> => {
		const mutationKey = [
			'submitFeedbackApiV1AssistantMessagesMessageIdFeedbackPost',
		];
		const { mutation: mutationOptions } = options
			? options.mutation &&
				'mutationKey' in options.mutation &&
				options.mutation.mutationKey
				? options
				: { ...options, mutation: { ...options.mutation, mutationKey } }
			: { mutation: { mutationKey } };

		const mutationFn: MutationFunction<
			Awaited<
				ReturnType<typeof submitFeedbackApiV1AssistantMessagesMessageIdFeedbackPost>
			>,
			{
				pathParams: SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostPathParameters;
				data: BodyType<FeedbackRequestDTO>;
				headers?: SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostHeaders;
			}
		> = (props) => {
			const { pathParams, data, headers } = props ?? {};

			return submitFeedbackApiV1AssistantMessagesMessageIdFeedbackPost(
				pathParams,
				data,
				headers,
			);
		};

		return { mutationFn, ...mutationOptions };
	};

export type SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostMutationResult =
	NonNullable<
		Awaited<
			ReturnType<typeof submitFeedbackApiV1AssistantMessagesMessageIdFeedbackPost>
		>
	>;
export type SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostMutationBody =
	BodyType<FeedbackRequestDTO>;
export type SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostMutationError =
	ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>;

/**
 * @summary Submit feedback on an assistant message
 */
export const useSubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPost = <
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<
			ReturnType<typeof submitFeedbackApiV1AssistantMessagesMessageIdFeedbackPost>
		>,
		TError,
		{
			pathParams: SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostPathParameters;
			data: BodyType<FeedbackRequestDTO>;
			headers?: SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostHeaders;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<
		ReturnType<typeof submitFeedbackApiV1AssistantMessagesMessageIdFeedbackPost>
	>,
	TError,
	{
		pathParams: SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostPathParameters;
		data: BodyType<FeedbackRequestDTO>;
		headers?: SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostHeaders;
	},
	TContext
> => {
	return useMutation(
		getSubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostMutationOptions(
			options,
		),
	);
};
/**
 * @summary Current rate-limit usage for the authenticated user + org
 */
export const getUsageApiV1AssistantUsageGet = (
	headers?: GetUsageApiV1AssistantUsageGetHeaders,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<UsageResponseDTO>({
		url: `/api/v1/assistant/usage`,
		method: 'GET',
		headers,
		signal,
	});
};

export const getGetUsageApiV1AssistantUsageGetQueryKey = () => {
	return [`/api/v1/assistant/usage`] as const;
};

export const getGetUsageApiV1AssistantUsageGetQueryOptions = <
	TData = Awaited<ReturnType<typeof getUsageApiV1AssistantUsageGet>>,
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
>(
	headers?: GetUsageApiV1AssistantUsageGetHeaders,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getUsageApiV1AssistantUsageGet>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetUsageApiV1AssistantUsageGetQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getUsageApiV1AssistantUsageGet>>
	> = ({ signal }) => getUsageApiV1AssistantUsageGet(headers, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getUsageApiV1AssistantUsageGet>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetUsageApiV1AssistantUsageGetQueryResult = NonNullable<
	Awaited<ReturnType<typeof getUsageApiV1AssistantUsageGet>>
>;
export type GetUsageApiV1AssistantUsageGetQueryError = ErrorType<
	ErrorResponseDTO | HTTPValidationErrorDTO
>;

/**
 * @summary Current rate-limit usage for the authenticated user + org
 */

export function useGetUsageApiV1AssistantUsageGet<
	TData = Awaited<ReturnType<typeof getUsageApiV1AssistantUsageGet>>,
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
>(
	headers?: GetUsageApiV1AssistantUsageGetHeaders,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getUsageApiV1AssistantUsageGet>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetUsageApiV1AssistantUsageGetQueryOptions(
		headers,
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Current rate-limit usage for the authenticated user + org
 */
export const invalidateGetUsageApiV1AssistantUsageGet = async (
	queryClient: QueryClient,
	headers?: GetUsageApiV1AssistantUsageGetHeaders,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetUsageApiV1AssistantUsageGetQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * @summary Contextual empty-state chips
 */
export const getChipsApiV1AssistantEmptyStateChipsGet = (
	params: GetChipsApiV1AssistantEmptyStateChipsGetParams,
	headers?: GetChipsApiV1AssistantEmptyStateChipsGetHeaders,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ChipsResponseDTO>({
		url: `/api/v1/assistant/empty-state/chips`,
		method: 'GET',
		headers,
		params,
		signal,
	});
};

export const getGetChipsApiV1AssistantEmptyStateChipsGetQueryKey = (
	params?: GetChipsApiV1AssistantEmptyStateChipsGetParams,
) => {
	return [
		`/api/v1/assistant/empty-state/chips`,
		...(params ? [params] : []),
	] as const;
};

export const getGetChipsApiV1AssistantEmptyStateChipsGetQueryOptions = <
	TData = Awaited<ReturnType<typeof getChipsApiV1AssistantEmptyStateChipsGet>>,
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
>(
	params: GetChipsApiV1AssistantEmptyStateChipsGetParams,
	headers?: GetChipsApiV1AssistantEmptyStateChipsGetHeaders,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getChipsApiV1AssistantEmptyStateChipsGet>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getGetChipsApiV1AssistantEmptyStateChipsGetQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getChipsApiV1AssistantEmptyStateChipsGet>>
	> = ({ signal }) =>
		getChipsApiV1AssistantEmptyStateChipsGet(params, headers, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getChipsApiV1AssistantEmptyStateChipsGet>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetChipsApiV1AssistantEmptyStateChipsGetQueryResult = NonNullable<
	Awaited<ReturnType<typeof getChipsApiV1AssistantEmptyStateChipsGet>>
>;
export type GetChipsApiV1AssistantEmptyStateChipsGetQueryError = ErrorType<
	ErrorResponseDTO | HTTPValidationErrorDTO
>;

/**
 * @summary Contextual empty-state chips
 */

export function useGetChipsApiV1AssistantEmptyStateChipsGet<
	TData = Awaited<ReturnType<typeof getChipsApiV1AssistantEmptyStateChipsGet>>,
	TError = ErrorType<ErrorResponseDTO | HTTPValidationErrorDTO>,
>(
	params: GetChipsApiV1AssistantEmptyStateChipsGetParams,
	headers?: GetChipsApiV1AssistantEmptyStateChipsGetHeaders,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getChipsApiV1AssistantEmptyStateChipsGet>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetChipsApiV1AssistantEmptyStateChipsGetQueryOptions(
		params,
		headers,
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Contextual empty-state chips
 */
export const invalidateGetChipsApiV1AssistantEmptyStateChipsGet = async (
	queryClient: QueryClient,
	params: GetChipsApiV1AssistantEmptyStateChipsGetParams,
	headers?: GetChipsApiV1AssistantEmptyStateChipsGetHeaders,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetChipsApiV1AssistantEmptyStateChipsGetQueryKey(params) },
		options,
	);

	return queryClient;
};
