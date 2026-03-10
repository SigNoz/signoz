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
	AcceptInvite201,
	ChangePasswordPathParameters,
	CreateAPIKey201,
	CreateInvite201,
	DeleteInvitePathParameters,
	DeleteUserPathParameters,
	GetInvite200,
	GetInvitePathParameters,
	GetMyUser200,
	GetResetPasswordToken200,
	GetResetPasswordTokenPathParameters,
	GetUser200,
	GetUserPathParameters,
	ListAPIKeys200,
	ListInvite200,
	ListUsers200,
	RenderErrorResponseDTO,
	RevokeAPIKeyPathParameters,
	TypesChangePasswordRequestDTO,
	TypesPostableAcceptInviteDTO,
	TypesPostableAPIKeyDTO,
	TypesPostableForgotPasswordDTO,
	TypesPostableInviteDTO,
	TypesPostableResetPasswordDTO,
	TypesStorableAPIKeyDTO,
	TypesUserDTO,
	UpdateAPIKeyPathParameters,
	UpdateUser200,
	UpdateUserPathParameters,
} from '../sigNoz.schemas';

/**
 * This endpoint changes the password by id
 * @summary Change password
 */
export const changePassword = (
	{ id }: ChangePasswordPathParameters,
	typesChangePasswordRequestDTO: BodyType<TypesChangePasswordRequestDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/changePassword/${id}`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: typesChangePasswordRequestDTO,
		signal,
	});
};

export const getChangePasswordMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof changePassword>>,
		TError,
		{
			pathParams: ChangePasswordPathParameters;
			data: BodyType<TypesChangePasswordRequestDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof changePassword>>,
	TError,
	{
		pathParams: ChangePasswordPathParameters;
		data: BodyType<TypesChangePasswordRequestDTO>;
	},
	TContext
> => {
	const mutationKey = ['changePassword'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof changePassword>>,
		{
			pathParams: ChangePasswordPathParameters;
			data: BodyType<TypesChangePasswordRequestDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return changePassword(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ChangePasswordMutationResult = NonNullable<
	Awaited<ReturnType<typeof changePassword>>
>;
export type ChangePasswordMutationBody = BodyType<TypesChangePasswordRequestDTO>;
export type ChangePasswordMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Change password
 */
export const useChangePassword = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof changePassword>>,
		TError,
		{
			pathParams: ChangePasswordPathParameters;
			data: BodyType<TypesChangePasswordRequestDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof changePassword>>,
	TError,
	{
		pathParams: ChangePasswordPathParameters;
		data: BodyType<TypesChangePasswordRequestDTO>;
	},
	TContext
> => {
	const mutationOptions = getChangePasswordMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint returns the reset password token by id
 * @summary Get reset password token
 */
export const getResetPasswordToken = (
	{ id }: GetResetPasswordTokenPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetResetPasswordToken200>({
		url: `/api/v1/getResetPasswordToken/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetResetPasswordTokenQueryKey = ({
	id,
}: GetResetPasswordTokenPathParameters) => {
	return [`/api/v1/getResetPasswordToken/${id}`] as const;
};

export const getGetResetPasswordTokenQueryOptions = <
	TData = Awaited<ReturnType<typeof getResetPasswordToken>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetResetPasswordTokenPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getResetPasswordToken>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetResetPasswordTokenQueryKey({ id });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getResetPasswordToken>>
	> = ({ signal }) => getResetPasswordToken({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getResetPasswordToken>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetResetPasswordTokenQueryResult = NonNullable<
	Awaited<ReturnType<typeof getResetPasswordToken>>
>;
export type GetResetPasswordTokenQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get reset password token
 */

export function useGetResetPasswordToken<
	TData = Awaited<ReturnType<typeof getResetPasswordToken>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetResetPasswordTokenPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getResetPasswordToken>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetResetPasswordTokenQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get reset password token
 */
export const invalidateGetResetPasswordToken = async (
	queryClient: QueryClient,
	{ id }: GetResetPasswordTokenPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetResetPasswordTokenQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint lists all invites
 * @summary List invites
 */
export const listInvite = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListInvite200>({
		url: `/api/v1/invite`,
		method: 'GET',
		signal,
	});
};

export const getListInviteQueryKey = () => {
	return [`/api/v1/invite`] as const;
};

export const getListInviteQueryOptions = <
	TData = Awaited<ReturnType<typeof listInvite>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof listInvite>>, TError, TData>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListInviteQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof listInvite>>> = ({
		signal,
	}) => listInvite(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listInvite>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListInviteQueryResult = NonNullable<
	Awaited<ReturnType<typeof listInvite>>
>;
export type ListInviteQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List invites
 */

export function useListInvite<
	TData = Awaited<ReturnType<typeof listInvite>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof listInvite>>, TError, TData>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListInviteQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List invites
 */
export const invalidateListInvite = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListInviteQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates an invite for a user
 * @summary Create invite
 */
export const createInvite = (
	typesPostableInviteDTO: BodyType<TypesPostableInviteDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateInvite201>({
		url: `/api/v1/invite`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: typesPostableInviteDTO,
		signal,
	});
};

export const getCreateInviteMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createInvite>>,
		TError,
		{ data: BodyType<TypesPostableInviteDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createInvite>>,
	TError,
	{ data: BodyType<TypesPostableInviteDTO> },
	TContext
> => {
	const mutationKey = ['createInvite'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createInvite>>,
		{ data: BodyType<TypesPostableInviteDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createInvite(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateInviteMutationResult = NonNullable<
	Awaited<ReturnType<typeof createInvite>>
>;
export type CreateInviteMutationBody = BodyType<TypesPostableInviteDTO>;
export type CreateInviteMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create invite
 */
export const useCreateInvite = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createInvite>>,
		TError,
		{ data: BodyType<TypesPostableInviteDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createInvite>>,
	TError,
	{ data: BodyType<TypesPostableInviteDTO> },
	TContext
> => {
	const mutationOptions = getCreateInviteMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint deletes an invite by id
 * @summary Delete invite
 */
export const deleteInvite = ({ id }: DeleteInvitePathParameters) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/invite/${id}`,
		method: 'DELETE',
	});
};

export const getDeleteInviteMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteInvite>>,
		TError,
		{ pathParams: DeleteInvitePathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteInvite>>,
	TError,
	{ pathParams: DeleteInvitePathParameters },
	TContext
> => {
	const mutationKey = ['deleteInvite'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteInvite>>,
		{ pathParams: DeleteInvitePathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteInvite(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteInviteMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteInvite>>
>;

export type DeleteInviteMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete invite
 */
export const useDeleteInvite = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteInvite>>,
		TError,
		{ pathParams: DeleteInvitePathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteInvite>>,
	TError,
	{ pathParams: DeleteInvitePathParameters },
	TContext
> => {
	const mutationOptions = getDeleteInviteMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint gets an invite by token
 * @summary Get invite
 */
export const getInvite = (
	{ token }: GetInvitePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetInvite200>({
		url: `/api/v1/invite/${token}`,
		method: 'GET',
		signal,
	});
};

export const getGetInviteQueryKey = ({ token }: GetInvitePathParameters) => {
	return [`/api/v1/invite/${token}`] as const;
};

export const getGetInviteQueryOptions = <
	TData = Awaited<ReturnType<typeof getInvite>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ token }: GetInvitePathParameters,
	options?: {
		query?: UseQueryOptions<Awaited<ReturnType<typeof getInvite>>, TError, TData>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetInviteQueryKey({ token });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getInvite>>> = ({
		signal,
	}) => getInvite({ token }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!token,
		...queryOptions,
	} as UseQueryOptions<Awaited<ReturnType<typeof getInvite>>, TError, TData> & {
		queryKey: QueryKey;
	};
};

export type GetInviteQueryResult = NonNullable<
	Awaited<ReturnType<typeof getInvite>>
>;
export type GetInviteQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get invite
 */

export function useGetInvite<
	TData = Awaited<ReturnType<typeof getInvite>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ token }: GetInvitePathParameters,
	options?: {
		query?: UseQueryOptions<Awaited<ReturnType<typeof getInvite>>, TError, TData>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetInviteQueryOptions({ token }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get invite
 */
export const invalidateGetInvite = async (
	queryClient: QueryClient,
	{ token }: GetInvitePathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetInviteQueryKey({ token }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint accepts an invite by token
 * @summary Accept invite
 */
export const acceptInvite = (
	typesPostableAcceptInviteDTO: BodyType<TypesPostableAcceptInviteDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<AcceptInvite201>({
		url: `/api/v1/invite/accept`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: typesPostableAcceptInviteDTO,
		signal,
	});
};

export const getAcceptInviteMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof acceptInvite>>,
		TError,
		{ data: BodyType<TypesPostableAcceptInviteDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof acceptInvite>>,
	TError,
	{ data: BodyType<TypesPostableAcceptInviteDTO> },
	TContext
> => {
	const mutationKey = ['acceptInvite'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof acceptInvite>>,
		{ data: BodyType<TypesPostableAcceptInviteDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return acceptInvite(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type AcceptInviteMutationResult = NonNullable<
	Awaited<ReturnType<typeof acceptInvite>>
>;
export type AcceptInviteMutationBody = BodyType<TypesPostableAcceptInviteDTO>;
export type AcceptInviteMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Accept invite
 */
export const useAcceptInvite = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof acceptInvite>>,
		TError,
		{ data: BodyType<TypesPostableAcceptInviteDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof acceptInvite>>,
	TError,
	{ data: BodyType<TypesPostableAcceptInviteDTO> },
	TContext
> => {
	const mutationOptions = getAcceptInviteMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint creates a bulk invite for a user
 * @summary Create bulk invite
 */
export const createBulkInvite = (
	typesPostableInviteDTO: BodyType<TypesPostableInviteDTO[]>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/invite/bulk`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: typesPostableInviteDTO,
		signal,
	});
};

export const getCreateBulkInviteMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createBulkInvite>>,
		TError,
		{ data: BodyType<TypesPostableInviteDTO[]> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createBulkInvite>>,
	TError,
	{ data: BodyType<TypesPostableInviteDTO[]> },
	TContext
> => {
	const mutationKey = ['createBulkInvite'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createBulkInvite>>,
		{ data: BodyType<TypesPostableInviteDTO[]> }
	> = (props) => {
		const { data } = props ?? {};

		return createBulkInvite(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateBulkInviteMutationResult = NonNullable<
	Awaited<ReturnType<typeof createBulkInvite>>
>;
export type CreateBulkInviteMutationBody = BodyType<TypesPostableInviteDTO[]>;
export type CreateBulkInviteMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create bulk invite
 */
export const useCreateBulkInvite = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createBulkInvite>>,
		TError,
		{ data: BodyType<TypesPostableInviteDTO[]> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createBulkInvite>>,
	TError,
	{ data: BodyType<TypesPostableInviteDTO[]> },
	TContext
> => {
	const mutationOptions = getCreateBulkInviteMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint lists all api keys
 * @summary List api keys
 */
export const listAPIKeys = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListAPIKeys200>({
		url: `/api/v1/pats`,
		method: 'GET',
		signal,
	});
};

export const getListAPIKeysQueryKey = () => {
	return [`/api/v1/pats`] as const;
};

export const getListAPIKeysQueryOptions = <
	TData = Awaited<ReturnType<typeof listAPIKeys>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listAPIKeys>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListAPIKeysQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof listAPIKeys>>> = ({
		signal,
	}) => listAPIKeys(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listAPIKeys>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListAPIKeysQueryResult = NonNullable<
	Awaited<ReturnType<typeof listAPIKeys>>
>;
export type ListAPIKeysQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List api keys
 */

export function useListAPIKeys<
	TData = Awaited<ReturnType<typeof listAPIKeys>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listAPIKeys>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListAPIKeysQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List api keys
 */
export const invalidateListAPIKeys = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListAPIKeysQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates an api key
 * @summary Create api key
 */
export const createAPIKey = (
	typesPostableAPIKeyDTO: BodyType<TypesPostableAPIKeyDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateAPIKey201>({
		url: `/api/v1/pats`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: typesPostableAPIKeyDTO,
		signal,
	});
};

export const getCreateAPIKeyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createAPIKey>>,
		TError,
		{ data: BodyType<TypesPostableAPIKeyDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createAPIKey>>,
	TError,
	{ data: BodyType<TypesPostableAPIKeyDTO> },
	TContext
> => {
	const mutationKey = ['createAPIKey'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createAPIKey>>,
		{ data: BodyType<TypesPostableAPIKeyDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createAPIKey(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateAPIKeyMutationResult = NonNullable<
	Awaited<ReturnType<typeof createAPIKey>>
>;
export type CreateAPIKeyMutationBody = BodyType<TypesPostableAPIKeyDTO>;
export type CreateAPIKeyMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create api key
 */
export const useCreateAPIKey = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createAPIKey>>,
		TError,
		{ data: BodyType<TypesPostableAPIKeyDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createAPIKey>>,
	TError,
	{ data: BodyType<TypesPostableAPIKeyDTO> },
	TContext
> => {
	const mutationOptions = getCreateAPIKeyMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint revokes an api key
 * @summary Revoke api key
 */
export const revokeAPIKey = ({ id }: RevokeAPIKeyPathParameters) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/pats/${id}`,
		method: 'DELETE',
	});
};

export const getRevokeAPIKeyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof revokeAPIKey>>,
		TError,
		{ pathParams: RevokeAPIKeyPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof revokeAPIKey>>,
	TError,
	{ pathParams: RevokeAPIKeyPathParameters },
	TContext
> => {
	const mutationKey = ['revokeAPIKey'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof revokeAPIKey>>,
		{ pathParams: RevokeAPIKeyPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return revokeAPIKey(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type RevokeAPIKeyMutationResult = NonNullable<
	Awaited<ReturnType<typeof revokeAPIKey>>
>;

export type RevokeAPIKeyMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Revoke api key
 */
export const useRevokeAPIKey = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof revokeAPIKey>>,
		TError,
		{ pathParams: RevokeAPIKeyPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof revokeAPIKey>>,
	TError,
	{ pathParams: RevokeAPIKeyPathParameters },
	TContext
> => {
	const mutationOptions = getRevokeAPIKeyMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint updates an api key
 * @summary Update api key
 */
export const updateAPIKey = (
	{ id }: UpdateAPIKeyPathParameters,
	typesStorableAPIKeyDTO: BodyType<TypesStorableAPIKeyDTO>,
) => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/pats/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: typesStorableAPIKeyDTO,
	});
};

export const getUpdateAPIKeyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateAPIKey>>,
		TError,
		{
			pathParams: UpdateAPIKeyPathParameters;
			data: BodyType<TypesStorableAPIKeyDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateAPIKey>>,
	TError,
	{
		pathParams: UpdateAPIKeyPathParameters;
		data: BodyType<TypesStorableAPIKeyDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateAPIKey'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateAPIKey>>,
		{
			pathParams: UpdateAPIKeyPathParameters;
			data: BodyType<TypesStorableAPIKeyDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateAPIKey(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateAPIKeyMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateAPIKey>>
>;
export type UpdateAPIKeyMutationBody = BodyType<TypesStorableAPIKeyDTO>;
export type UpdateAPIKeyMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update api key
 */
export const useUpdateAPIKey = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateAPIKey>>,
		TError,
		{
			pathParams: UpdateAPIKeyPathParameters;
			data: BodyType<TypesStorableAPIKeyDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateAPIKey>>,
	TError,
	{
		pathParams: UpdateAPIKeyPathParameters;
		data: BodyType<TypesStorableAPIKeyDTO>;
	},
	TContext
> => {
	const mutationOptions = getUpdateAPIKeyMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint resets the password by token
 * @summary Reset password
 */
export const resetPassword = (
	typesPostableResetPasswordDTO: BodyType<TypesPostableResetPasswordDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/resetPassword`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: typesPostableResetPasswordDTO,
		signal,
	});
};

export const getResetPasswordMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof resetPassword>>,
		TError,
		{ data: BodyType<TypesPostableResetPasswordDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof resetPassword>>,
	TError,
	{ data: BodyType<TypesPostableResetPasswordDTO> },
	TContext
> => {
	const mutationKey = ['resetPassword'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof resetPassword>>,
		{ data: BodyType<TypesPostableResetPasswordDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return resetPassword(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ResetPasswordMutationResult = NonNullable<
	Awaited<ReturnType<typeof resetPassword>>
>;
export type ResetPasswordMutationBody = BodyType<TypesPostableResetPasswordDTO>;
export type ResetPasswordMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Reset password
 */
export const useResetPassword = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof resetPassword>>,
		TError,
		{ data: BodyType<TypesPostableResetPasswordDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof resetPassword>>,
	TError,
	{ data: BodyType<TypesPostableResetPasswordDTO> },
	TContext
> => {
	const mutationOptions = getResetPasswordMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint lists all users
 * @summary List users
 */
export const listUsers = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListUsers200>({
		url: `/api/v1/user`,
		method: 'GET',
		signal,
	});
};

export const getListUsersQueryKey = () => {
	return [`/api/v1/user`] as const;
};

export const getListUsersQueryOptions = <
	TData = Awaited<ReturnType<typeof listUsers>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListUsersQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof listUsers>>> = ({
		signal,
	}) => listUsers(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listUsers>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListUsersQueryResult = NonNullable<
	Awaited<ReturnType<typeof listUsers>>
>;
export type ListUsersQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List users
 */

export function useListUsers<
	TData = Awaited<ReturnType<typeof listUsers>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListUsersQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List users
 */
export const invalidateListUsers = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListUsersQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint deletes the user by id
 * @summary Delete user
 */
export const deleteUser = ({ id }: DeleteUserPathParameters) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/user/${id}`,
		method: 'DELETE',
	});
};

export const getDeleteUserMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteUser>>,
		TError,
		{ pathParams: DeleteUserPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteUser>>,
	TError,
	{ pathParams: DeleteUserPathParameters },
	TContext
> => {
	const mutationKey = ['deleteUser'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteUser>>,
		{ pathParams: DeleteUserPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteUser(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteUserMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteUser>>
>;

export type DeleteUserMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete user
 */
export const useDeleteUser = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteUser>>,
		TError,
		{ pathParams: DeleteUserPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteUser>>,
	TError,
	{ pathParams: DeleteUserPathParameters },
	TContext
> => {
	const mutationOptions = getDeleteUserMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint returns the user by id
 * @summary Get user
 */
export const getUser = (
	{ id }: GetUserPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetUser200>({
		url: `/api/v1/user/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetUserQueryKey = ({ id }: GetUserPathParameters) => {
	return [`/api/v1/user/${id}`] as const;
};

export const getGetUserQueryOptions = <
	TData = Awaited<ReturnType<typeof getUser>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetUserPathParameters,
	options?: {
		query?: UseQueryOptions<Awaited<ReturnType<typeof getUser>>, TError, TData>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetUserQueryKey({ id });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getUser>>> = ({
		signal,
	}) => getUser({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<Awaited<ReturnType<typeof getUser>>, TError, TData> & {
		queryKey: QueryKey;
	};
};

export type GetUserQueryResult = NonNullable<
	Awaited<ReturnType<typeof getUser>>
>;
export type GetUserQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get user
 */

export function useGetUser<
	TData = Awaited<ReturnType<typeof getUser>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetUserPathParameters,
	options?: {
		query?: UseQueryOptions<Awaited<ReturnType<typeof getUser>>, TError, TData>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetUserQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get user
 */
export const invalidateGetUser = async (
	queryClient: QueryClient,
	{ id }: GetUserPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetUserQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint updates the user by id
 * @summary Update user
 */
export const updateUser = (
	{ id }: UpdateUserPathParameters,
	typesUserDTO: BodyType<TypesUserDTO>,
) => {
	return GeneratedAPIInstance<UpdateUser200>({
		url: `/api/v1/user/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: typesUserDTO,
	});
};

export const getUpdateUserMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateUser>>,
		TError,
		{ pathParams: UpdateUserPathParameters; data: BodyType<TypesUserDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateUser>>,
	TError,
	{ pathParams: UpdateUserPathParameters; data: BodyType<TypesUserDTO> },
	TContext
> => {
	const mutationKey = ['updateUser'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateUser>>,
		{ pathParams: UpdateUserPathParameters; data: BodyType<TypesUserDTO> }
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateUser(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateUserMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateUser>>
>;
export type UpdateUserMutationBody = BodyType<TypesUserDTO>;
export type UpdateUserMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update user
 */
export const useUpdateUser = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateUser>>,
		TError,
		{ pathParams: UpdateUserPathParameters; data: BodyType<TypesUserDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateUser>>,
	TError,
	{ pathParams: UpdateUserPathParameters; data: BodyType<TypesUserDTO> },
	TContext
> => {
	const mutationOptions = getUpdateUserMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint returns the user I belong to
 * @summary Get my user
 */
export const getMyUser = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetMyUser200>({
		url: `/api/v1/user/me`,
		method: 'GET',
		signal,
	});
};

export const getGetMyUserQueryKey = () => {
	return [`/api/v1/user/me`] as const;
};

export const getGetMyUserQueryOptions = <
	TData = Awaited<ReturnType<typeof getMyUser>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof getMyUser>>, TError, TData>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetMyUserQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getMyUser>>> = ({
		signal,
	}) => getMyUser(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getMyUser>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetMyUserQueryResult = NonNullable<
	Awaited<ReturnType<typeof getMyUser>>
>;
export type GetMyUserQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get my user
 */

export function useGetMyUser<
	TData = Awaited<ReturnType<typeof getMyUser>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof getMyUser>>, TError, TData>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMyUserQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get my user
 */
export const invalidateGetMyUser = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMyUserQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint initiates the forgot password flow by sending a reset password email
 * @summary Forgot password
 */
export const forgotPassword = (
	typesPostableForgotPasswordDTO: BodyType<TypesPostableForgotPasswordDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/factor_password/forgot`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: typesPostableForgotPasswordDTO,
		signal,
	});
};

export const getForgotPasswordMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof forgotPassword>>,
		TError,
		{ data: BodyType<TypesPostableForgotPasswordDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof forgotPassword>>,
	TError,
	{ data: BodyType<TypesPostableForgotPasswordDTO> },
	TContext
> => {
	const mutationKey = ['forgotPassword'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof forgotPassword>>,
		{ data: BodyType<TypesPostableForgotPasswordDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return forgotPassword(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ForgotPasswordMutationResult = NonNullable<
	Awaited<ReturnType<typeof forgotPassword>>
>;
export type ForgotPasswordMutationBody = BodyType<TypesPostableForgotPasswordDTO>;
export type ForgotPasswordMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Forgot password
 */
export const useForgotPassword = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof forgotPassword>>,
		TError,
		{ data: BodyType<TypesPostableForgotPasswordDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof forgotPassword>>,
	TError,
	{ data: BodyType<TypesPostableForgotPasswordDTO> },
	TContext
> => {
	const mutationOptions = getForgotPasswordMutationOptions(options);

	return useMutation(mutationOptions);
};
