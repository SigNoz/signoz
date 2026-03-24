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
	ChangePasswordPathParameters,
	CreateAPIKey201,
	CreateInvite201,
	DeleteUserPathParameters,
	GetMyUser200,
	GetMyUserDeprecated200,
	GetResetPasswordToken200,
	GetResetPasswordTokenPathParameters,
	GetUser200,
	GetUserDeprecated200,
	GetUserDeprecatedPathParameters,
	GetUserPathParameters,
	GetUserRoles200,
	GetUserRolesPathParameters,
	GetUsersByRoleID200,
	GetUsersByRoleIDPathParameters,
	ListAPIKeys200,
	ListUsers200,
	ListUsersDeprecated200,
	RenderErrorResponseDTO,
	RevokeAPIKeyPathParameters,
	TypesChangePasswordRequestDTO,
	TypesDeprecatedUserDTO,
	TypesPostableAPIKeyDTO,
	TypesPostableBulkInviteRequestDTO,
	TypesPostableForgotPasswordDTO,
	TypesPostableInviteDTO,
	TypesPostableResetPasswordDTO,
	TypesStorableAPIKeyDTO,
	TypesUpdatableSelfUserDTO,
	TypesUpdatableUserDTO,
	UpdateAPIKeyPathParameters,
	UpdateUser200,
	UpdateUserPathParameters,
	UpdateUserV2PathParameters,
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
 * This endpoint creates a bulk invite for a user
 * @summary Create bulk invite
 */
export const createBulkInvite = (
	typesPostableBulkInviteRequestDTO: BodyType<TypesPostableBulkInviteRequestDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/invite/bulk`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: typesPostableBulkInviteRequestDTO,
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
		{ data: BodyType<TypesPostableBulkInviteRequestDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createBulkInvite>>,
	TError,
	{ data: BodyType<TypesPostableBulkInviteRequestDTO> },
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
		{ data: BodyType<TypesPostableBulkInviteRequestDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createBulkInvite(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateBulkInviteMutationResult = NonNullable<
	Awaited<ReturnType<typeof createBulkInvite>>
>;
export type CreateBulkInviteMutationBody = BodyType<TypesPostableBulkInviteRequestDTO>;
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
		{ data: BodyType<TypesPostableBulkInviteRequestDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createBulkInvite>>,
	TError,
	{ data: BodyType<TypesPostableBulkInviteRequestDTO> },
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
export const listUsersDeprecated = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListUsersDeprecated200>({
		url: `/api/v1/user`,
		method: 'GET',
		signal,
	});
};

export const getListUsersDeprecatedQueryKey = () => {
	return [`/api/v1/user`] as const;
};

export const getListUsersDeprecatedQueryOptions = <
	TData = Awaited<ReturnType<typeof listUsersDeprecated>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listUsersDeprecated>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListUsersDeprecatedQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listUsersDeprecated>>
	> = ({ signal }) => listUsersDeprecated(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listUsersDeprecated>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListUsersDeprecatedQueryResult = NonNullable<
	Awaited<ReturnType<typeof listUsersDeprecated>>
>;
export type ListUsersDeprecatedQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List users
 */

export function useListUsersDeprecated<
	TData = Awaited<ReturnType<typeof listUsersDeprecated>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listUsersDeprecated>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListUsersDeprecatedQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List users
 */
export const invalidateListUsersDeprecated = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListUsersDeprecatedQueryKey() },
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
export const getUserDeprecated = (
	{ id }: GetUserDeprecatedPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetUserDeprecated200>({
		url: `/api/v1/user/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetUserDeprecatedQueryKey = ({
	id,
}: GetUserDeprecatedPathParameters) => {
	return [`/api/v1/user/${id}`] as const;
};

export const getGetUserDeprecatedQueryOptions = <
	TData = Awaited<ReturnType<typeof getUserDeprecated>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetUserDeprecatedPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getUserDeprecated>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetUserDeprecatedQueryKey({ id });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getUserDeprecated>>
	> = ({ signal }) => getUserDeprecated({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getUserDeprecated>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetUserDeprecatedQueryResult = NonNullable<
	Awaited<ReturnType<typeof getUserDeprecated>>
>;
export type GetUserDeprecatedQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get user
 */

export function useGetUserDeprecated<
	TData = Awaited<ReturnType<typeof getUserDeprecated>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetUserDeprecatedPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getUserDeprecated>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetUserDeprecatedQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get user
 */
export const invalidateGetUserDeprecated = async (
	queryClient: QueryClient,
	{ id }: GetUserDeprecatedPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetUserDeprecatedQueryKey({ id }) },
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
	typesDeprecatedUserDTO: BodyType<TypesDeprecatedUserDTO>,
) => {
	return GeneratedAPIInstance<UpdateUser200>({
		url: `/api/v1/user/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: typesDeprecatedUserDTO,
	});
};

export const getUpdateUserMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateUser>>,
		TError,
		{
			pathParams: UpdateUserPathParameters;
			data: BodyType<TypesDeprecatedUserDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateUser>>,
	TError,
	{
		pathParams: UpdateUserPathParameters;
		data: BodyType<TypesDeprecatedUserDTO>;
	},
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
		{
			pathParams: UpdateUserPathParameters;
			data: BodyType<TypesDeprecatedUserDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateUser(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateUserMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateUser>>
>;
export type UpdateUserMutationBody = BodyType<TypesDeprecatedUserDTO>;
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
		{
			pathParams: UpdateUserPathParameters;
			data: BodyType<TypesDeprecatedUserDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateUser>>,
	TError,
	{
		pathParams: UpdateUserPathParameters;
		data: BodyType<TypesDeprecatedUserDTO>;
	},
	TContext
> => {
	const mutationOptions = getUpdateUserMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint returns the user I belong to
 * @summary Get my user
 */
export const getMyUserDeprecated = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetMyUserDeprecated200>({
		url: `/api/v1/user/me`,
		method: 'GET',
		signal,
	});
};

export const getGetMyUserDeprecatedQueryKey = () => {
	return [`/api/v1/user/me`] as const;
};

export const getGetMyUserDeprecatedQueryOptions = <
	TData = Awaited<ReturnType<typeof getMyUserDeprecated>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getMyUserDeprecated>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetMyUserDeprecatedQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getMyUserDeprecated>>
	> = ({ signal }) => getMyUserDeprecated(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getMyUserDeprecated>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetMyUserDeprecatedQueryResult = NonNullable<
	Awaited<ReturnType<typeof getMyUserDeprecated>>
>;
export type GetMyUserDeprecatedQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get my user
 */

export function useGetMyUserDeprecated<
	TData = Awaited<ReturnType<typeof getMyUserDeprecated>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getMyUserDeprecated>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMyUserDeprecatedQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get my user
 */
export const invalidateGetMyUserDeprecated = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetMyUserDeprecatedQueryKey() },
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
/**
 * This endpoint returns the users having the role by role id
 * @summary Get users by role id
 */
export const getUsersByRoleID = (
	{ id }: GetUsersByRoleIDPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetUsersByRoleID200>({
		url: `/api/v2/roles/${id}/users`,
		method: 'GET',
		signal,
	});
};

export const getGetUsersByRoleIDQueryKey = ({
	id,
}: GetUsersByRoleIDPathParameters) => {
	return [`/api/v2/roles/${id}/users`] as const;
};

export const getGetUsersByRoleIDQueryOptions = <
	TData = Awaited<ReturnType<typeof getUsersByRoleID>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetUsersByRoleIDPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getUsersByRoleID>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetUsersByRoleIDQueryKey({ id });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getUsersByRoleID>>> = ({
		signal,
	}) => getUsersByRoleID({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getUsersByRoleID>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetUsersByRoleIDQueryResult = NonNullable<
	Awaited<ReturnType<typeof getUsersByRoleID>>
>;
export type GetUsersByRoleIDQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get users by role id
 */

export function useGetUsersByRoleID<
	TData = Awaited<ReturnType<typeof getUsersByRoleID>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetUsersByRoleIDPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getUsersByRoleID>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetUsersByRoleIDQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get users by role id
 */
export const invalidateGetUsersByRoleID = async (
	queryClient: QueryClient,
	{ id }: GetUsersByRoleIDPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetUsersByRoleIDQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint lists all users for the organization
 * @summary List users v2
 */
export const listUsers = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListUsers200>({
		url: `/api/v2/users`,
		method: 'GET',
		signal,
	});
};

export const getListUsersQueryKey = () => {
	return [`/api/v2/users`] as const;
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
 * @summary List users v2
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
 * @summary List users v2
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
 * This endpoint returns the user by id
 * @summary Get user by user id
 */
export const getUser = (
	{ id }: GetUserPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetUser200>({
		url: `/api/v2/users/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetUserQueryKey = ({ id }: GetUserPathParameters) => {
	return [`/api/v2/users/${id}`] as const;
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
 * @summary Get user by user id
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
 * @summary Get user by user id
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
 * @summary Update user v2
 */
export const updateUserV2 = (
	{ id }: UpdateUserV2PathParameters,
	typesUpdatableUserDTO: BodyType<TypesUpdatableUserDTO>,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/users/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: typesUpdatableUserDTO,
	});
};

export const getUpdateUserV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateUserV2>>,
		TError,
		{
			pathParams: UpdateUserV2PathParameters;
			data: BodyType<TypesUpdatableUserDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateUserV2>>,
	TError,
	{
		pathParams: UpdateUserV2PathParameters;
		data: BodyType<TypesUpdatableUserDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateUserV2'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateUserV2>>,
		{
			pathParams: UpdateUserV2PathParameters;
			data: BodyType<TypesUpdatableUserDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateUserV2(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateUserV2MutationResult = NonNullable<
	Awaited<ReturnType<typeof updateUserV2>>
>;
export type UpdateUserV2MutationBody = BodyType<TypesUpdatableUserDTO>;
export type UpdateUserV2MutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update user v2
 */
export const useUpdateUserV2 = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateUserV2>>,
		TError,
		{
			pathParams: UpdateUserV2PathParameters;
			data: BodyType<TypesUpdatableUserDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateUserV2>>,
	TError,
	{
		pathParams: UpdateUserV2PathParameters;
		data: BodyType<TypesUpdatableUserDTO>;
	},
	TContext
> => {
	const mutationOptions = getUpdateUserV2MutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint returns the user roles by user id
 * @summary Get user roles
 */
export const getUserRoles = (
	{ id }: GetUserRolesPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetUserRoles200>({
		url: `/api/v2/users/${id}/roles`,
		method: 'GET',
		signal,
	});
};

export const getGetUserRolesQueryKey = ({ id }: GetUserRolesPathParameters) => {
	return [`/api/v2/users/${id}/roles`] as const;
};

export const getGetUserRolesQueryOptions = <
	TData = Awaited<ReturnType<typeof getUserRoles>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetUserRolesPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getUserRoles>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetUserRolesQueryKey({ id });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getUserRoles>>> = ({
		signal,
	}) => getUserRoles({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getUserRoles>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetUserRolesQueryResult = NonNullable<
	Awaited<ReturnType<typeof getUserRoles>>
>;
export type GetUserRolesQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get user roles
 */

export function useGetUserRoles<
	TData = Awaited<ReturnType<typeof getUserRoles>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetUserRolesPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getUserRoles>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetUserRolesQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get user roles
 */
export const invalidateGetUserRoles = async (
	queryClient: QueryClient,
	{ id }: GetUserRolesPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetUserRolesQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint returns the user I belong to
 * @summary Get my user v2
 */
export const getMyUser = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetMyUser200>({
		url: `/api/v2/users/me`,
		method: 'GET',
		signal,
	});
};

export const getGetMyUserQueryKey = () => {
	return [`/api/v2/users/me`] as const;
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
 * @summary Get my user v2
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
 * @summary Get my user v2
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
 * This endpoint updates the user I belong to
 * @summary Update my user v2
 */
export const updateMyUserV2 = (
	typesUpdatableSelfUserDTO: BodyType<TypesUpdatableSelfUserDTO>,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/users/me`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: typesUpdatableSelfUserDTO,
	});
};

export const getUpdateMyUserV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMyUserV2>>,
		TError,
		{ data: BodyType<TypesUpdatableSelfUserDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateMyUserV2>>,
	TError,
	{ data: BodyType<TypesUpdatableSelfUserDTO> },
	TContext
> => {
	const mutationKey = ['updateMyUserV2'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateMyUserV2>>,
		{ data: BodyType<TypesUpdatableSelfUserDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return updateMyUserV2(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateMyUserV2MutationResult = NonNullable<
	Awaited<ReturnType<typeof updateMyUserV2>>
>;
export type UpdateMyUserV2MutationBody = BodyType<TypesUpdatableSelfUserDTO>;
export type UpdateMyUserV2MutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update my user v2
 */
export const useUpdateMyUserV2 = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMyUserV2>>,
		TError,
		{ data: BodyType<TypesUpdatableSelfUserDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateMyUserV2>>,
	TError,
	{ data: BodyType<TypesUpdatableSelfUserDTO> },
	TContext
> => {
	const mutationOptions = getUpdateMyUserV2MutationOptions(options);

	return useMutation(mutationOptions);
};
