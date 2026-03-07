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
	AuthtypesPostableEmailPasswordSessionDTO,
	AuthtypesPostableRotateTokenDTO,
	CreateSessionByEmailPassword200,
	CreateSessionByGoogleCallback303,
	CreateSessionByOIDCCallback303,
	CreateSessionBySAMLCallback303,
	CreateSessionBySAMLCallbackBody,
	CreateSessionBySAMLCallbackParams,
	GetSessionContext200,
	RenderErrorResponseDTO,
	RotateSession200,
} from '../sigNoz.schemas';

/**
 * This endpoint creates a session for a user using google callback
 * @summary Create session by google callback
 */
export const createSessionByGoogleCallback = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<unknown>({
		url: `/api/v1/complete/google`,
		method: 'GET',
		signal,
	});
};

export const getCreateSessionByGoogleCallbackQueryKey = () => {
	return [`/api/v1/complete/google`] as const;
};

export const getCreateSessionByGoogleCallbackQueryOptions = <
	TData = Awaited<ReturnType<typeof createSessionByGoogleCallback>>,
	TError = ErrorType<CreateSessionByGoogleCallback303 | RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof createSessionByGoogleCallback>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getCreateSessionByGoogleCallbackQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof createSessionByGoogleCallback>>
	> = ({ signal }) => createSessionByGoogleCallback(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof createSessionByGoogleCallback>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type CreateSessionByGoogleCallbackQueryResult = NonNullable<
	Awaited<ReturnType<typeof createSessionByGoogleCallback>>
>;
export type CreateSessionByGoogleCallbackQueryError = ErrorType<
	CreateSessionByGoogleCallback303 | RenderErrorResponseDTO
>;

/**
 * @summary Create session by google callback
 */

export function useCreateSessionByGoogleCallback<
	TData = Awaited<ReturnType<typeof createSessionByGoogleCallback>>,
	TError = ErrorType<CreateSessionByGoogleCallback303 | RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof createSessionByGoogleCallback>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getCreateSessionByGoogleCallbackQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Create session by google callback
 */
export const invalidateCreateSessionByGoogleCallback = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getCreateSessionByGoogleCallbackQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates a session for a user using oidc callback
 * @summary Create session by oidc callback
 */
export const createSessionByOIDCCallback = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<unknown>({
		url: `/api/v1/complete/oidc`,
		method: 'GET',
		signal,
	});
};

export const getCreateSessionByOIDCCallbackQueryKey = () => {
	return [`/api/v1/complete/oidc`] as const;
};

export const getCreateSessionByOIDCCallbackQueryOptions = <
	TData = Awaited<ReturnType<typeof createSessionByOIDCCallback>>,
	TError = ErrorType<CreateSessionByOIDCCallback303 | RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof createSessionByOIDCCallback>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getCreateSessionByOIDCCallbackQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof createSessionByOIDCCallback>>
	> = ({ signal }) => createSessionByOIDCCallback(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof createSessionByOIDCCallback>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type CreateSessionByOIDCCallbackQueryResult = NonNullable<
	Awaited<ReturnType<typeof createSessionByOIDCCallback>>
>;
export type CreateSessionByOIDCCallbackQueryError = ErrorType<
	CreateSessionByOIDCCallback303 | RenderErrorResponseDTO
>;

/**
 * @summary Create session by oidc callback
 */

export function useCreateSessionByOIDCCallback<
	TData = Awaited<ReturnType<typeof createSessionByOIDCCallback>>,
	TError = ErrorType<CreateSessionByOIDCCallback303 | RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof createSessionByOIDCCallback>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getCreateSessionByOIDCCallbackQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Create session by oidc callback
 */
export const invalidateCreateSessionByOIDCCallback = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getCreateSessionByOIDCCallbackQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates a session for a user using saml callback
 * @summary Create session by saml callback
 */
export const createSessionBySAMLCallback = (
	createSessionBySAMLCallbackBody: BodyType<CreateSessionBySAMLCallbackBody>,
	params?: CreateSessionBySAMLCallbackParams,
	signal?: AbortSignal,
) => {
	const formUrlEncoded = new URLSearchParams();
	if (createSessionBySAMLCallbackBody.RelayState !== undefined) {
		formUrlEncoded.append(
			`RelayState`,
			createSessionBySAMLCallbackBody.RelayState,
		);
	}
	if (createSessionBySAMLCallbackBody.SAMLResponse !== undefined) {
		formUrlEncoded.append(
			`SAMLResponse`,
			createSessionBySAMLCallbackBody.SAMLResponse,
		);
	}

	return GeneratedAPIInstance<unknown>({
		url: `/api/v1/complete/saml`,
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		data: formUrlEncoded,
		params,
		signal,
	});
};

export const getCreateSessionBySAMLCallbackMutationOptions = <
	TError = ErrorType<CreateSessionBySAMLCallback303 | RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createSessionBySAMLCallback>>,
		TError,
		{
			data: BodyType<CreateSessionBySAMLCallbackBody>;
			params?: CreateSessionBySAMLCallbackParams;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createSessionBySAMLCallback>>,
	TError,
	{
		data: BodyType<CreateSessionBySAMLCallbackBody>;
		params?: CreateSessionBySAMLCallbackParams;
	},
	TContext
> => {
	const mutationKey = ['createSessionBySAMLCallback'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createSessionBySAMLCallback>>,
		{
			data: BodyType<CreateSessionBySAMLCallbackBody>;
			params?: CreateSessionBySAMLCallbackParams;
		}
	> = (props) => {
		const { data, params } = props ?? {};

		return createSessionBySAMLCallback(data, params);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateSessionBySAMLCallbackMutationResult = NonNullable<
	Awaited<ReturnType<typeof createSessionBySAMLCallback>>
>;
export type CreateSessionBySAMLCallbackMutationBody = BodyType<CreateSessionBySAMLCallbackBody>;
export type CreateSessionBySAMLCallbackMutationError = ErrorType<
	CreateSessionBySAMLCallback303 | RenderErrorResponseDTO
>;

/**
 * @summary Create session by saml callback
 */
export const useCreateSessionBySAMLCallback = <
	TError = ErrorType<CreateSessionBySAMLCallback303 | RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createSessionBySAMLCallback>>,
		TError,
		{
			data: BodyType<CreateSessionBySAMLCallbackBody>;
			params?: CreateSessionBySAMLCallbackParams;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createSessionBySAMLCallback>>,
	TError,
	{
		data: BodyType<CreateSessionBySAMLCallbackBody>;
		params?: CreateSessionBySAMLCallbackParams;
	},
	TContext
> => {
	const mutationOptions = getCreateSessionBySAMLCallbackMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint deletes the session
 * @summary Delete session
 */
export const deleteSession = () => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/sessions`,
		method: 'DELETE',
	});
};

export const getDeleteSessionMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteSession>>,
		TError,
		void,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteSession>>,
	TError,
	void,
	TContext
> => {
	const mutationKey = ['deleteSession'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteSession>>,
		void
	> = () => {
		return deleteSession();
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteSessionMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteSession>>
>;

export type DeleteSessionMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete session
 */
export const useDeleteSession = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteSession>>,
		TError,
		void,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteSession>>,
	TError,
	void,
	TContext
> => {
	const mutationOptions = getDeleteSessionMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint returns the context for the session
 * @summary Get session context
 */
export const getSessionContext = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetSessionContext200>({
		url: `/api/v2/sessions/context`,
		method: 'GET',
		signal,
	});
};

export const getGetSessionContextQueryKey = () => {
	return [`/api/v2/sessions/context`] as const;
};

export const getGetSessionContextQueryOptions = <
	TData = Awaited<ReturnType<typeof getSessionContext>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getSessionContext>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetSessionContextQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getSessionContext>>
	> = ({ signal }) => getSessionContext(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getSessionContext>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetSessionContextQueryResult = NonNullable<
	Awaited<ReturnType<typeof getSessionContext>>
>;
export type GetSessionContextQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get session context
 */

export function useGetSessionContext<
	TData = Awaited<ReturnType<typeof getSessionContext>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getSessionContext>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetSessionContextQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get session context
 */
export const invalidateGetSessionContext = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetSessionContextQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates a session for a user using email and password.
 * @summary Create session by email and password
 */
export const createSessionByEmailPassword = (
	authtypesPostableEmailPasswordSessionDTO: BodyType<AuthtypesPostableEmailPasswordSessionDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateSessionByEmailPassword200>({
		url: `/api/v2/sessions/email_password`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: authtypesPostableEmailPasswordSessionDTO,
		signal,
	});
};

export const getCreateSessionByEmailPasswordMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createSessionByEmailPassword>>,
		TError,
		{ data: BodyType<AuthtypesPostableEmailPasswordSessionDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createSessionByEmailPassword>>,
	TError,
	{ data: BodyType<AuthtypesPostableEmailPasswordSessionDTO> },
	TContext
> => {
	const mutationKey = ['createSessionByEmailPassword'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createSessionByEmailPassword>>,
		{ data: BodyType<AuthtypesPostableEmailPasswordSessionDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createSessionByEmailPassword(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateSessionByEmailPasswordMutationResult = NonNullable<
	Awaited<ReturnType<typeof createSessionByEmailPassword>>
>;
export type CreateSessionByEmailPasswordMutationBody = BodyType<AuthtypesPostableEmailPasswordSessionDTO>;
export type CreateSessionByEmailPasswordMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create session by email and password
 */
export const useCreateSessionByEmailPassword = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createSessionByEmailPassword>>,
		TError,
		{ data: BodyType<AuthtypesPostableEmailPasswordSessionDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createSessionByEmailPassword>>,
	TError,
	{ data: BodyType<AuthtypesPostableEmailPasswordSessionDTO> },
	TContext
> => {
	const mutationOptions = getCreateSessionByEmailPasswordMutationOptions(
		options,
	);

	return useMutation(mutationOptions);
};
/**
 * This endpoint rotates the session
 * @summary Rotate session
 */
export const rotateSession = (
	authtypesPostableRotateTokenDTO: BodyType<AuthtypesPostableRotateTokenDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<RotateSession200>({
		url: `/api/v2/sessions/rotate`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: authtypesPostableRotateTokenDTO,
		signal,
	});
};

export const getRotateSessionMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof rotateSession>>,
		TError,
		{ data: BodyType<AuthtypesPostableRotateTokenDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof rotateSession>>,
	TError,
	{ data: BodyType<AuthtypesPostableRotateTokenDTO> },
	TContext
> => {
	const mutationKey = ['rotateSession'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof rotateSession>>,
		{ data: BodyType<AuthtypesPostableRotateTokenDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return rotateSession(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type RotateSessionMutationResult = NonNullable<
	Awaited<ReturnType<typeof rotateSession>>
>;
export type RotateSessionMutationBody = BodyType<AuthtypesPostableRotateTokenDTO>;
export type RotateSessionMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Rotate session
 */
export const useRotateSession = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof rotateSession>>,
		TError,
		{ data: BodyType<AuthtypesPostableRotateTokenDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof rotateSession>>,
	TError,
	{ data: BodyType<AuthtypesPostableRotateTokenDTO> },
	TContext
> => {
	const mutationOptions = getRotateSessionMutationOptions(options);

	return useMutation(mutationOptions);
};
