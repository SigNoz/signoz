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

import { GeneratedAPIInstance } from '../../../index';
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
	TypesPostableInviteDTO,
	TypesPostableResetPasswordDTO,
	TypesStorableAPIKeyDTO,
	TypesUserDTO,
	UpdateAPIKeyPathParameters,
	UpdateUser200,
	UpdateUserPathParameters,
} from '../sigNoz.schemas';

type AwaitedInput<T> = PromiseLike<T> | T;

type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

/**
 * This endpoint changes the password by id
 * @summary Change password
 */
export const changePassword = (
	{ id }: ChangePasswordPathParameters,
	typesChangePasswordRequestDTO: TypesChangePasswordRequestDTO,
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
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof changePassword>>,
		TError,
		{
			pathParams: ChangePasswordPathParameters;
			data: TypesChangePasswordRequestDTO;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof changePassword>>,
	TError,
	{
		pathParams: ChangePasswordPathParameters;
		data: TypesChangePasswordRequestDTO;
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
			data: TypesChangePasswordRequestDTO;
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
export type ChangePasswordMutationBody = TypesChangePasswordRequestDTO;
export type ChangePasswordMutationError = RenderErrorResponseDTO;

/**
 * @summary Change password
 */
export const useChangePassword = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof changePassword>>,
		TError,
		{
			pathParams: ChangePasswordPathParameters;
			data: TypesChangePasswordRequestDTO;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof changePassword>>,
	TError,
	{
		pathParams: ChangePasswordPathParameters;
		data: TypesChangePasswordRequestDTO;
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
	return ['getResetPasswordToken'] as const;
};

export const getGetResetPasswordTokenQueryOptions = <
	TData = Awaited<ReturnType<typeof getResetPasswordToken>>,
	TError = RenderErrorResponseDTO
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
export type GetResetPasswordTokenQueryError = RenderErrorResponseDTO;

/**
 * @summary Get reset password token
 */

export function useGetResetPasswordToken<
	TData = Awaited<ReturnType<typeof getResetPasswordToken>>,
	TError = RenderErrorResponseDTO
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
	return ['listInvite'] as const;
};

export const getListInviteQueryOptions = <
	TData = Awaited<ReturnType<typeof listInvite>>,
	TError = RenderErrorResponseDTO
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
export type ListInviteQueryError = RenderErrorResponseDTO;

/**
 * @summary List invites
 */

export function useListInvite<
	TData = Awaited<ReturnType<typeof listInvite>>,
	TError = RenderErrorResponseDTO
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
	typesPostableInviteDTO: TypesPostableInviteDTO,
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
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createInvite>>,
		TError,
		{ data: TypesPostableInviteDTO },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createInvite>>,
	TError,
	{ data: TypesPostableInviteDTO },
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
		{ data: TypesPostableInviteDTO }
	> = (props) => {
		const { data } = props ?? {};

		return createInvite(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateInviteMutationResult = NonNullable<
	Awaited<ReturnType<typeof createInvite>>
>;
export type CreateInviteMutationBody = TypesPostableInviteDTO;
export type CreateInviteMutationError = RenderErrorResponseDTO;

/**
 * @summary Create invite
 */
export const useCreateInvite = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createInvite>>,
		TError,
		{ data: TypesPostableInviteDTO },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createInvite>>,
	TError,
	{ data: TypesPostableInviteDTO },
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
	TError = RenderErrorResponseDTO,
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

export type DeleteInviteMutationError = RenderErrorResponseDTO;

/**
 * @summary Delete invite
 */
export const useDeleteInvite = <
	TError = RenderErrorResponseDTO,
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
	return ['getInvite'] as const;
};

export const getGetInviteQueryOptions = <
	TData = Awaited<ReturnType<typeof getInvite>>,
	TError = RenderErrorResponseDTO
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
export type GetInviteQueryError = RenderErrorResponseDTO;

/**
 * @summary Get invite
 */

export function useGetInvite<
	TData = Awaited<ReturnType<typeof getInvite>>,
	TError = RenderErrorResponseDTO
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
	typesPostableAcceptInviteDTO: TypesPostableAcceptInviteDTO,
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
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof acceptInvite>>,
		TError,
		{ data: TypesPostableAcceptInviteDTO },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof acceptInvite>>,
	TError,
	{ data: TypesPostableAcceptInviteDTO },
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
		{ data: TypesPostableAcceptInviteDTO }
	> = (props) => {
		const { data } = props ?? {};

		return acceptInvite(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type AcceptInviteMutationResult = NonNullable<
	Awaited<ReturnType<typeof acceptInvite>>
>;
export type AcceptInviteMutationBody = TypesPostableAcceptInviteDTO;
export type AcceptInviteMutationError = RenderErrorResponseDTO;

/**
 * @summary Accept invite
 */
export const useAcceptInvite = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof acceptInvite>>,
		TError,
		{ data: TypesPostableAcceptInviteDTO },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof acceptInvite>>,
	TError,
	{ data: TypesPostableAcceptInviteDTO },
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
	typesPostableInviteDTO: TypesPostableInviteDTO[],
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
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createBulkInvite>>,
		TError,
		{ data: TypesPostableInviteDTO[] },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createBulkInvite>>,
	TError,
	{ data: TypesPostableInviteDTO[] },
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
		{ data: TypesPostableInviteDTO[] }
	> = (props) => {
		const { data } = props ?? {};

		return createBulkInvite(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateBulkInviteMutationResult = NonNullable<
	Awaited<ReturnType<typeof createBulkInvite>>
>;
export type CreateBulkInviteMutationBody = TypesPostableInviteDTO[];
export type CreateBulkInviteMutationError = RenderErrorResponseDTO;

/**
 * @summary Create bulk invite
 */
export const useCreateBulkInvite = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createBulkInvite>>,
		TError,
		{ data: TypesPostableInviteDTO[] },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createBulkInvite>>,
	TError,
	{ data: TypesPostableInviteDTO[] },
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
	return ['listAPIKeys'] as const;
};

export const getListAPIKeysQueryOptions = <
	TData = Awaited<ReturnType<typeof listAPIKeys>>,
	TError = RenderErrorResponseDTO
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
export type ListAPIKeysQueryError = RenderErrorResponseDTO;

/**
 * @summary List api keys
 */

export function useListAPIKeys<
	TData = Awaited<ReturnType<typeof listAPIKeys>>,
	TError = RenderErrorResponseDTO
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
	typesPostableAPIKeyDTO: TypesPostableAPIKeyDTO,
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
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createAPIKey>>,
		TError,
		{ data: TypesPostableAPIKeyDTO },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createAPIKey>>,
	TError,
	{ data: TypesPostableAPIKeyDTO },
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
		{ data: TypesPostableAPIKeyDTO }
	> = (props) => {
		const { data } = props ?? {};

		return createAPIKey(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateAPIKeyMutationResult = NonNullable<
	Awaited<ReturnType<typeof createAPIKey>>
>;
export type CreateAPIKeyMutationBody = TypesPostableAPIKeyDTO;
export type CreateAPIKeyMutationError = RenderErrorResponseDTO;

/**
 * @summary Create api key
 */
export const useCreateAPIKey = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createAPIKey>>,
		TError,
		{ data: TypesPostableAPIKeyDTO },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createAPIKey>>,
	TError,
	{ data: TypesPostableAPIKeyDTO },
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
	TError = RenderErrorResponseDTO,
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

export type RevokeAPIKeyMutationError = RenderErrorResponseDTO;

/**
 * @summary Revoke api key
 */
export const useRevokeAPIKey = <
	TError = RenderErrorResponseDTO,
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
	typesStorableAPIKeyDTO: TypesStorableAPIKeyDTO,
) => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/pats/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: typesStorableAPIKeyDTO,
	});
};

export const getUpdateAPIKeyMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateAPIKey>>,
		TError,
		{ pathParams: UpdateAPIKeyPathParameters; data: TypesStorableAPIKeyDTO },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateAPIKey>>,
	TError,
	{ pathParams: UpdateAPIKeyPathParameters; data: TypesStorableAPIKeyDTO },
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
		{ pathParams: UpdateAPIKeyPathParameters; data: TypesStorableAPIKeyDTO }
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateAPIKey(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateAPIKeyMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateAPIKey>>
>;
export type UpdateAPIKeyMutationBody = TypesStorableAPIKeyDTO;
export type UpdateAPIKeyMutationError = RenderErrorResponseDTO;

/**
 * @summary Update api key
 */
export const useUpdateAPIKey = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateAPIKey>>,
		TError,
		{ pathParams: UpdateAPIKeyPathParameters; data: TypesStorableAPIKeyDTO },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateAPIKey>>,
	TError,
	{ pathParams: UpdateAPIKeyPathParameters; data: TypesStorableAPIKeyDTO },
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
	typesPostableResetPasswordDTO: TypesPostableResetPasswordDTO,
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
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof resetPassword>>,
		TError,
		{ data: TypesPostableResetPasswordDTO },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof resetPassword>>,
	TError,
	{ data: TypesPostableResetPasswordDTO },
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
		{ data: TypesPostableResetPasswordDTO }
	> = (props) => {
		const { data } = props ?? {};

		return resetPassword(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ResetPasswordMutationResult = NonNullable<
	Awaited<ReturnType<typeof resetPassword>>
>;
export type ResetPasswordMutationBody = TypesPostableResetPasswordDTO;
export type ResetPasswordMutationError = RenderErrorResponseDTO;

/**
 * @summary Reset password
 */
export const useResetPassword = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof resetPassword>>,
		TError,
		{ data: TypesPostableResetPasswordDTO },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof resetPassword>>,
	TError,
	{ data: TypesPostableResetPasswordDTO },
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
	return ['listUsers'] as const;
};

export const getListUsersQueryOptions = <
	TData = Awaited<ReturnType<typeof listUsers>>,
	TError = RenderErrorResponseDTO
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
export type ListUsersQueryError = RenderErrorResponseDTO;

/**
 * @summary List users
 */

export function useListUsers<
	TData = Awaited<ReturnType<typeof listUsers>>,
	TError = RenderErrorResponseDTO
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
	TError = RenderErrorResponseDTO,
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

export type DeleteUserMutationError = RenderErrorResponseDTO;

/**
 * @summary Delete user
 */
export const useDeleteUser = <
	TError = RenderErrorResponseDTO,
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
	return ['getUser'] as const;
};

export const getGetUserQueryOptions = <
	TData = Awaited<ReturnType<typeof getUser>>,
	TError = RenderErrorResponseDTO
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
export type GetUserQueryError = RenderErrorResponseDTO;

/**
 * @summary Get user
 */

export function useGetUser<
	TData = Awaited<ReturnType<typeof getUser>>,
	TError = RenderErrorResponseDTO
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
	typesUserDTO: TypesUserDTO,
) => {
	return GeneratedAPIInstance<UpdateUser200>({
		url: `/api/v1/user/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: typesUserDTO,
	});
};

export const getUpdateUserMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateUser>>,
		TError,
		{ pathParams: UpdateUserPathParameters; data: TypesUserDTO },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateUser>>,
	TError,
	{ pathParams: UpdateUserPathParameters; data: TypesUserDTO },
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
		{ pathParams: UpdateUserPathParameters; data: TypesUserDTO }
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateUser(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateUserMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateUser>>
>;
export type UpdateUserMutationBody = TypesUserDTO;
export type UpdateUserMutationError = RenderErrorResponseDTO;

/**
 * @summary Update user
 */
export const useUpdateUser = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateUser>>,
		TError,
		{ pathParams: UpdateUserPathParameters; data: TypesUserDTO },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateUser>>,
	TError,
	{ pathParams: UpdateUserPathParameters; data: TypesUserDTO },
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
	return ['getMyUser'] as const;
};

export const getGetMyUserQueryOptions = <
	TData = Awaited<ReturnType<typeof getMyUser>>,
	TError = RenderErrorResponseDTO
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
export type GetMyUserQueryError = RenderErrorResponseDTO;

/**
 * @summary Get my user
 */

export function useGetMyUser<
	TData = Awaited<ReturnType<typeof getMyUser>>,
	TError = RenderErrorResponseDTO
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
