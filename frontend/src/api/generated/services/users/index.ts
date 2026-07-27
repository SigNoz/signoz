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
	AuthtypesPostableUserDTO,
	AuthtypesPostableUserRoleDTO,
	CreateInvite201,
	CreateResetPasswordToken201,
	CreateResetPasswordTokenPathParameters,
	CreateUser201,
	CreateUserRole201,
	DeleteUserDeprecatedPathParameters,
	DeleteUserPathParameters,
	DeleteUserRolePathParameters,
	GetMyUser200,
	GetMyUserDeprecated200,
	GetResetPasswordToken200,
	GetResetPasswordTokenDeprecated200,
	GetResetPasswordTokenDeprecatedPathParameters,
	GetResetPasswordTokenPathParameters,
	GetRolesByUserID200,
	GetRolesByUserIDPathParameters,
	GetUser200,
	GetUserDeprecated200,
	GetUserDeprecatedPathParameters,
	GetUserPathParameters,
	GetUserRole200,
	GetUserRolePathParameters,
	GetUsersByRoleID200,
	GetUsersByRoleIDPathParameters,
	ListUsers200,
	ListUsersDeprecated200,
	RemoveUserRoleByUserIDAndRoleIDPathParameters,
	RenderErrorResponseDTO,
	SetRoleByUserIDPathParameters,
	TypesChangePasswordRequestDTO,
	TypesDeprecatedUserDTO,
	TypesPostableBulkInviteRequestDTO,
	TypesPostableForgotPasswordDTO,
	TypesPostableInviteDTO,
	TypesPostableResetPasswordDTO,
	TypesPostableRoleDTO,
	TypesPostableVerifyResetPasswordTokenDTO,
	TypesUpdatableUserDTO,
	UpdateUserDeprecated200,
	UpdateUserDeprecatedPathParameters,
	UpdateUserPathParameters,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * This endpoint returns the reset password token by id
 * @deprecated
 * @summary Get reset password token
 */
export const getResetPasswordTokenDeprecated = (
	{ id }: GetResetPasswordTokenDeprecatedPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetResetPasswordTokenDeprecated200>({
		url: `/api/v1/getResetPasswordToken/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetResetPasswordTokenDeprecatedQueryKey = ({
	id,
}: GetResetPasswordTokenDeprecatedPathParameters) => {
	return [`/api/v1/getResetPasswordToken/${id}`] as const;
};

export const getGetResetPasswordTokenDeprecatedQueryOptions = <
	TData = Awaited<ReturnType<typeof getResetPasswordTokenDeprecated>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetResetPasswordTokenDeprecatedPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getResetPasswordTokenDeprecated>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetResetPasswordTokenDeprecatedQueryKey({ id });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getResetPasswordTokenDeprecated>>
	> = ({ signal }) => getResetPasswordTokenDeprecated({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getResetPasswordTokenDeprecated>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetResetPasswordTokenDeprecatedQueryResult = NonNullable<
	Awaited<ReturnType<typeof getResetPasswordTokenDeprecated>>
>;
export type GetResetPasswordTokenDeprecatedQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @deprecated
 * @summary Get reset password token
 */

export function useGetResetPasswordTokenDeprecated<
	TData = Awaited<ReturnType<typeof getResetPasswordTokenDeprecated>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetResetPasswordTokenDeprecatedPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getResetPasswordTokenDeprecated>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetResetPasswordTokenDeprecatedQueryOptions(
		{ id },
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @deprecated
 * @summary Get reset password token
 */
export const invalidateGetResetPasswordTokenDeprecated = async (
	queryClient: QueryClient,
	{ id }: GetResetPasswordTokenDeprecatedPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetResetPasswordTokenDeprecatedQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates an invite for a user
 * @deprecated
 * @summary Create invite
 */
export const createInvite = (
	typesPostableInviteDTO?: BodyType<TypesPostableInviteDTO>,
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
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createInvite>>,
		TError,
		{ data?: BodyType<TypesPostableInviteDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createInvite>>,
	TError,
	{ data?: BodyType<TypesPostableInviteDTO> },
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
		{ data?: BodyType<TypesPostableInviteDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createInvite(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateInviteMutationResult = NonNullable<
	Awaited<ReturnType<typeof createInvite>>
>;
export type CreateInviteMutationBody =
	| BodyType<TypesPostableInviteDTO>
	| undefined;
export type CreateInviteMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @deprecated
 * @summary Create invite
 */
export const useCreateInvite = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createInvite>>,
		TError,
		{ data?: BodyType<TypesPostableInviteDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createInvite>>,
	TError,
	{ data?: BodyType<TypesPostableInviteDTO> },
	TContext
> => {
	return useMutation(getCreateInviteMutationOptions(options));
};
/**
 * This endpoint creates a bulk invite for a user
 * @deprecated
 * @summary Create bulk invite
 */
export const createBulkInvite = (
	typesPostableBulkInviteRequestDTO?: BodyType<TypesPostableBulkInviteRequestDTO>,
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
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createBulkInvite>>,
		TError,
		{ data?: BodyType<TypesPostableBulkInviteRequestDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createBulkInvite>>,
	TError,
	{ data?: BodyType<TypesPostableBulkInviteRequestDTO> },
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
		{ data?: BodyType<TypesPostableBulkInviteRequestDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createBulkInvite(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateBulkInviteMutationResult = NonNullable<
	Awaited<ReturnType<typeof createBulkInvite>>
>;
export type CreateBulkInviteMutationBody =
	| BodyType<TypesPostableBulkInviteRequestDTO>
	| undefined;
export type CreateBulkInviteMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @deprecated
 * @summary Create bulk invite
 */
export const useCreateBulkInvite = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createBulkInvite>>,
		TError,
		{ data?: BodyType<TypesPostableBulkInviteRequestDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createBulkInvite>>,
	TError,
	{ data?: BodyType<TypesPostableBulkInviteRequestDTO> },
	TContext
> => {
	return useMutation(getCreateBulkInviteMutationOptions(options));
};
/**
 * This endpoint resets the password by token
 * @summary Reset password
 */
export const resetPassword = (
	typesPostableResetPasswordDTO?: BodyType<TypesPostableResetPasswordDTO>,
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
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof resetPassword>>,
		TError,
		{ data?: BodyType<TypesPostableResetPasswordDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof resetPassword>>,
	TError,
	{ data?: BodyType<TypesPostableResetPasswordDTO> },
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
		{ data?: BodyType<TypesPostableResetPasswordDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return resetPassword(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ResetPasswordMutationResult = NonNullable<
	Awaited<ReturnType<typeof resetPassword>>
>;
export type ResetPasswordMutationBody =
	| BodyType<TypesPostableResetPasswordDTO>
	| undefined;
export type ResetPasswordMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Reset password
 */
export const useResetPassword = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof resetPassword>>,
		TError,
		{ data?: BodyType<TypesPostableResetPasswordDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof resetPassword>>,
	TError,
	{ data?: BodyType<TypesPostableResetPasswordDTO> },
	TContext
> => {
	return useMutation(getResetPasswordMutationOptions(options));
};
/**
 * This endpoint lists all users
 * @deprecated
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
	TError = ErrorType<RenderErrorResponseDTO>,
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
 * @deprecated
 * @summary List users
 */

export function useListUsersDeprecated<
	TData = Awaited<ReturnType<typeof listUsersDeprecated>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @deprecated
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
 * @deprecated
 * @summary Delete user
 */
export const deleteUserDeprecated = (
	{ id }: DeleteUserDeprecatedPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/user/${id}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteUserDeprecatedMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteUserDeprecated>>,
		TError,
		{ pathParams: DeleteUserDeprecatedPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteUserDeprecated>>,
	TError,
	{ pathParams: DeleteUserDeprecatedPathParameters },
	TContext
> => {
	const mutationKey = ['deleteUserDeprecated'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteUserDeprecated>>,
		{ pathParams: DeleteUserDeprecatedPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteUserDeprecated(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteUserDeprecatedMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteUserDeprecated>>
>;

export type DeleteUserDeprecatedMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @deprecated
 * @summary Delete user
 */
export const useDeleteUserDeprecated = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteUserDeprecated>>,
		TError,
		{ pathParams: DeleteUserDeprecatedPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteUserDeprecated>>,
	TError,
	{ pathParams: DeleteUserDeprecatedPathParameters },
	TContext
> => {
	return useMutation(getDeleteUserDeprecatedMutationOptions(options));
};
/**
 * This endpoint returns the user by id
 * @deprecated
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
	TError = ErrorType<RenderErrorResponseDTO>,
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
 * @deprecated
 * @summary Get user
 */

export function useGetUserDeprecated<
	TData = Awaited<ReturnType<typeof getUserDeprecated>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @deprecated
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
 * @deprecated
 * @summary Update user
 */
export const updateUserDeprecated = (
	{ id }: UpdateUserDeprecatedPathParameters,
	typesDeprecatedUserDTO?: BodyType<TypesDeprecatedUserDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<UpdateUserDeprecated200>({
		url: `/api/v1/user/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: typesDeprecatedUserDTO,
		signal,
	});
};

export const getUpdateUserDeprecatedMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateUserDeprecated>>,
		TError,
		{
			pathParams: UpdateUserDeprecatedPathParameters;
			data?: BodyType<TypesDeprecatedUserDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateUserDeprecated>>,
	TError,
	{
		pathParams: UpdateUserDeprecatedPathParameters;
		data?: BodyType<TypesDeprecatedUserDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateUserDeprecated'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateUserDeprecated>>,
		{
			pathParams: UpdateUserDeprecatedPathParameters;
			data?: BodyType<TypesDeprecatedUserDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateUserDeprecated(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateUserDeprecatedMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateUserDeprecated>>
>;
export type UpdateUserDeprecatedMutationBody =
	| BodyType<TypesDeprecatedUserDTO>
	| undefined;
export type UpdateUserDeprecatedMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @deprecated
 * @summary Update user
 */
export const useUpdateUserDeprecated = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateUserDeprecated>>,
		TError,
		{
			pathParams: UpdateUserDeprecatedPathParameters;
			data?: BodyType<TypesDeprecatedUserDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateUserDeprecated>>,
	TError,
	{
		pathParams: UpdateUserDeprecatedPathParameters;
		data?: BodyType<TypesDeprecatedUserDTO>;
	},
	TContext
> => {
	return useMutation(getUpdateUserDeprecatedMutationOptions(options));
};
/**
 * This endpoint returns the user I belong to
 * @deprecated
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
	TError = ErrorType<RenderErrorResponseDTO>,
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
 * @deprecated
 * @summary Get my user
 */

export function useGetMyUserDeprecated<
	TData = Awaited<ReturnType<typeof getMyUserDeprecated>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @deprecated
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
	typesPostableForgotPasswordDTO?: BodyType<TypesPostableForgotPasswordDTO>,
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
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof forgotPassword>>,
		TError,
		{ data?: BodyType<TypesPostableForgotPasswordDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof forgotPassword>>,
	TError,
	{ data?: BodyType<TypesPostableForgotPasswordDTO> },
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
		{ data?: BodyType<TypesPostableForgotPasswordDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return forgotPassword(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ForgotPasswordMutationResult = NonNullable<
	Awaited<ReturnType<typeof forgotPassword>>
>;
export type ForgotPasswordMutationBody =
	| BodyType<TypesPostableForgotPasswordDTO>
	| undefined;
export type ForgotPasswordMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Forgot password
 */
export const useForgotPassword = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof forgotPassword>>,
		TError,
		{ data?: BodyType<TypesPostableForgotPasswordDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof forgotPassword>>,
	TError,
	{ data?: BodyType<TypesPostableForgotPasswordDTO> },
	TContext
> => {
	return useMutation(getForgotPasswordMutationOptions(options));
};
/**
 * This endpoint verifies whether a reset password token exists and is not expired
 * @summary Verify a reset password token
 */
export const verifyResetPasswordToken = (
	typesPostableVerifyResetPasswordTokenDTO?: BodyType<TypesPostableVerifyResetPasswordTokenDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/reset_password_tokens/verify`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: typesPostableVerifyResetPasswordTokenDTO,
		signal,
	});
};

export const getVerifyResetPasswordTokenMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof verifyResetPasswordToken>>,
		TError,
		{ data?: BodyType<TypesPostableVerifyResetPasswordTokenDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof verifyResetPasswordToken>>,
	TError,
	{ data?: BodyType<TypesPostableVerifyResetPasswordTokenDTO> },
	TContext
> => {
	const mutationKey = ['verifyResetPasswordToken'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof verifyResetPasswordToken>>,
		{ data?: BodyType<TypesPostableVerifyResetPasswordTokenDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return verifyResetPasswordToken(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type VerifyResetPasswordTokenMutationResult = NonNullable<
	Awaited<ReturnType<typeof verifyResetPasswordToken>>
>;
export type VerifyResetPasswordTokenMutationBody =
	| BodyType<TypesPostableVerifyResetPasswordTokenDTO>
	| undefined;
export type VerifyResetPasswordTokenMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Verify a reset password token
 */
export const useVerifyResetPasswordToken = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof verifyResetPasswordToken>>,
		TError,
		{ data?: BodyType<TypesPostableVerifyResetPasswordTokenDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof verifyResetPasswordToken>>,
	TError,
	{ data?: BodyType<TypesPostableVerifyResetPasswordTokenDTO> },
	TContext
> => {
	return useMutation(getVerifyResetPasswordTokenMutationOptions(options));
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
	TError = ErrorType<RenderErrorResponseDTO>,
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
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return { ...query, queryKey: queryOptions.queryKey };
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
 * This endpoint assigns a role to a user
 * @summary Create user role
 */
export const createUserRole = (
	authtypesPostableUserRoleDTO?: BodyType<AuthtypesPostableUserRoleDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateUserRole201>({
		url: `/api/v2/user_roles`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: authtypesPostableUserRoleDTO,
		signal,
	});
};

export const getCreateUserRoleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createUserRole>>,
		TError,
		{ data?: BodyType<AuthtypesPostableUserRoleDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createUserRole>>,
	TError,
	{ data?: BodyType<AuthtypesPostableUserRoleDTO> },
	TContext
> => {
	const mutationKey = ['createUserRole'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createUserRole>>,
		{ data?: BodyType<AuthtypesPostableUserRoleDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createUserRole(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateUserRoleMutationResult = NonNullable<
	Awaited<ReturnType<typeof createUserRole>>
>;
export type CreateUserRoleMutationBody =
	| BodyType<AuthtypesPostableUserRoleDTO>
	| undefined;
export type CreateUserRoleMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create user role
 */
export const useCreateUserRole = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createUserRole>>,
		TError,
		{ data?: BodyType<AuthtypesPostableUserRoleDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createUserRole>>,
	TError,
	{ data?: BodyType<AuthtypesPostableUserRoleDTO> },
	TContext
> => {
	return useMutation(getCreateUserRoleMutationOptions(options));
};
/**
 * This endpoint revokes a role from a user
 * @summary Delete user role
 */
export const deleteUserRole = (
	{ id }: DeleteUserRolePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/user_roles/${id}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteUserRoleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteUserRole>>,
		TError,
		{ pathParams: DeleteUserRolePathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteUserRole>>,
	TError,
	{ pathParams: DeleteUserRolePathParameters },
	TContext
> => {
	const mutationKey = ['deleteUserRole'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteUserRole>>,
		{ pathParams: DeleteUserRolePathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteUserRole(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteUserRoleMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteUserRole>>
>;

export type DeleteUserRoleMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete user role
 */
export const useDeleteUserRole = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteUserRole>>,
		TError,
		{ pathParams: DeleteUserRolePathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteUserRole>>,
	TError,
	{ pathParams: DeleteUserRolePathParameters },
	TContext
> => {
	return useMutation(getDeleteUserRoleMutationOptions(options));
};
/**
 * This endpoint gets an existing user role
 * @summary Get user role
 */
export const getUserRole = (
	{ id }: GetUserRolePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetUserRole200>({
		url: `/api/v2/user_roles/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetUserRoleQueryKey = ({ id }: GetUserRolePathParameters) => {
	return [`/api/v2/user_roles/${id}`] as const;
};

export const getGetUserRoleQueryOptions = <
	TData = Awaited<ReturnType<typeof getUserRole>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetUserRolePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getUserRole>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetUserRoleQueryKey({ id });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getUserRole>>> = ({
		signal,
	}) => getUserRole({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getUserRole>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetUserRoleQueryResult = NonNullable<
	Awaited<ReturnType<typeof getUserRole>>
>;
export type GetUserRoleQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get user role
 */

export function useGetUserRole<
	TData = Awaited<ReturnType<typeof getUserRole>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetUserRolePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getUserRole>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetUserRoleQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get user role
 */
export const invalidateGetUserRole = async (
	queryClient: QueryClient,
	{ id }: GetUserRolePathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetUserRoleQueryKey({ id }) },
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
	TError = ErrorType<RenderErrorResponseDTO>,
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
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListUsersQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
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
 * This endpoint creates a user for the organization
 * @summary Create user
 */
export const createUser = (
	authtypesPostableUserDTO?: BodyType<AuthtypesPostableUserDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateUser201>({
		url: `/api/v2/users`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: authtypesPostableUserDTO,
		signal,
	});
};

export const getCreateUserMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createUser>>,
		TError,
		{ data?: BodyType<AuthtypesPostableUserDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createUser>>,
	TError,
	{ data?: BodyType<AuthtypesPostableUserDTO> },
	TContext
> => {
	const mutationKey = ['createUser'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createUser>>,
		{ data?: BodyType<AuthtypesPostableUserDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createUser(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateUserMutationResult = NonNullable<
	Awaited<ReturnType<typeof createUser>>
>;
export type CreateUserMutationBody =
	| BodyType<AuthtypesPostableUserDTO>
	| undefined;
export type CreateUserMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create user
 */
export const useCreateUser = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createUser>>,
		TError,
		{ data?: BodyType<AuthtypesPostableUserDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createUser>>,
	TError,
	{ data?: BodyType<AuthtypesPostableUserDTO> },
	TContext
> => {
	return useMutation(getCreateUserMutationOptions(options));
};
/**
 * This endpoint deletes the user by id
 * @summary Delete user
 */
export const deleteUser = (
	{ id }: DeleteUserPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/users/${id}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteUserMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
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
	TContext = unknown,
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
	return useMutation(getDeleteUserMutationOptions(options));
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
	TError = ErrorType<RenderErrorResponseDTO>,
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
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return { ...query, queryKey: queryOptions.queryKey };
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
export const updateUser = (
	{ id }: UpdateUserPathParameters,
	typesUpdatableUserDTO?: BodyType<TypesUpdatableUserDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/users/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: typesUpdatableUserDTO,
		signal,
	});
};

export const getUpdateUserMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateUser>>,
		TError,
		{
			pathParams: UpdateUserPathParameters;
			data?: BodyType<TypesUpdatableUserDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateUser>>,
	TError,
	{
		pathParams: UpdateUserPathParameters;
		data?: BodyType<TypesUpdatableUserDTO>;
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
			data?: BodyType<TypesUpdatableUserDTO>;
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
export type UpdateUserMutationBody =
	| BodyType<TypesUpdatableUserDTO>
	| undefined;
export type UpdateUserMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update user v2
 */
export const useUpdateUser = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateUser>>,
		TError,
		{
			pathParams: UpdateUserPathParameters;
			data?: BodyType<TypesUpdatableUserDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateUser>>,
	TError,
	{
		pathParams: UpdateUserPathParameters;
		data?: BodyType<TypesUpdatableUserDTO>;
	},
	TContext
> => {
	return useMutation(getUpdateUserMutationOptions(options));
};
/**
 * This endpoint returns the existing reset password token for a user.
 * @summary Get reset password token for a user
 */
export const getResetPasswordToken = (
	{ id }: GetResetPasswordTokenPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetResetPasswordToken200>({
		url: `/api/v2/users/${id}/reset_password_tokens`,
		method: 'GET',
		signal,
	});
};

export const getGetResetPasswordTokenQueryKey = ({
	id,
}: GetResetPasswordTokenPathParameters) => {
	return [`/api/v2/users/${id}/reset_password_tokens`] as const;
};

export const getGetResetPasswordTokenQueryOptions = <
	TData = Awaited<ReturnType<typeof getResetPasswordToken>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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
 * @summary Get reset password token for a user
 */

export function useGetResetPasswordToken<
	TData = Awaited<ReturnType<typeof getResetPasswordToken>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get reset password token for a user
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
 * This endpoint creates or regenerates a reset password token for a user. If a valid token exists, it is returned. If expired, a new one is created.
 * @summary Create or regenerate reset password token for a user
 */
export const createResetPasswordToken = (
	{ id }: CreateResetPasswordTokenPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateResetPasswordToken201>({
		url: `/api/v2/users/${id}/reset_password_tokens`,
		method: 'PUT',
		signal,
	});
};

export const getCreateResetPasswordTokenMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createResetPasswordToken>>,
		TError,
		{ pathParams: CreateResetPasswordTokenPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createResetPasswordToken>>,
	TError,
	{ pathParams: CreateResetPasswordTokenPathParameters },
	TContext
> => {
	const mutationKey = ['createResetPasswordToken'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createResetPasswordToken>>,
		{ pathParams: CreateResetPasswordTokenPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return createResetPasswordToken(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateResetPasswordTokenMutationResult = NonNullable<
	Awaited<ReturnType<typeof createResetPasswordToken>>
>;

export type CreateResetPasswordTokenMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create or regenerate reset password token for a user
 */
export const useCreateResetPasswordToken = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createResetPasswordToken>>,
		TError,
		{ pathParams: CreateResetPasswordTokenPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createResetPasswordToken>>,
	TError,
	{ pathParams: CreateResetPasswordTokenPathParameters },
	TContext
> => {
	return useMutation(getCreateResetPasswordTokenMutationOptions(options));
};
/**
 * This endpoint returns the user roles by user id
 * @summary Get user roles
 */
export const getRolesByUserID = (
	{ id }: GetRolesByUserIDPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetRolesByUserID200>({
		url: `/api/v2/users/${id}/roles`,
		method: 'GET',
		signal,
	});
};

export const getGetRolesByUserIDQueryKey = ({
	id,
}: GetRolesByUserIDPathParameters) => {
	return [`/api/v2/users/${id}/roles`] as const;
};

export const getGetRolesByUserIDQueryOptions = <
	TData = Awaited<ReturnType<typeof getRolesByUserID>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRolesByUserIDPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRolesByUserID>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetRolesByUserIDQueryKey({ id });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getRolesByUserID>>> = ({
		signal,
	}) => getRolesByUserID({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getRolesByUserID>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetRolesByUserIDQueryResult = NonNullable<
	Awaited<ReturnType<typeof getRolesByUserID>>
>;
export type GetRolesByUserIDQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get user roles
 */

export function useGetRolesByUserID<
	TData = Awaited<ReturnType<typeof getRolesByUserID>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRolesByUserIDPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRolesByUserID>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetRolesByUserIDQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get user roles
 */
export const invalidateGetRolesByUserID = async (
	queryClient: QueryClient,
	{ id }: GetRolesByUserIDPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetRolesByUserIDQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint assigns the role to the user roles by user id
 * @deprecated
 * @summary Set user roles
 */
export const setRoleByUserID = (
	{ id }: SetRoleByUserIDPathParameters,
	typesPostableRoleDTO?: BodyType<TypesPostableRoleDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/users/${id}/roles`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: typesPostableRoleDTO,
		signal,
	});
};

export const getSetRoleByUserIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof setRoleByUserID>>,
		TError,
		{
			pathParams: SetRoleByUserIDPathParameters;
			data?: BodyType<TypesPostableRoleDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof setRoleByUserID>>,
	TError,
	{
		pathParams: SetRoleByUserIDPathParameters;
		data?: BodyType<TypesPostableRoleDTO>;
	},
	TContext
> => {
	const mutationKey = ['setRoleByUserID'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof setRoleByUserID>>,
		{
			pathParams: SetRoleByUserIDPathParameters;
			data?: BodyType<TypesPostableRoleDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return setRoleByUserID(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type SetRoleByUserIDMutationResult = NonNullable<
	Awaited<ReturnType<typeof setRoleByUserID>>
>;
export type SetRoleByUserIDMutationBody =
	| BodyType<TypesPostableRoleDTO>
	| undefined;
export type SetRoleByUserIDMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @deprecated
 * @summary Set user roles
 */
export const useSetRoleByUserID = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof setRoleByUserID>>,
		TError,
		{
			pathParams: SetRoleByUserIDPathParameters;
			data?: BodyType<TypesPostableRoleDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof setRoleByUserID>>,
	TError,
	{
		pathParams: SetRoleByUserIDPathParameters;
		data?: BodyType<TypesPostableRoleDTO>;
	},
	TContext
> => {
	return useMutation(getSetRoleByUserIDMutationOptions(options));
};
/**
 * This endpoint removes a role from the user by user id and role id
 * @deprecated
 * @summary Remove a role from user
 */
export const removeUserRoleByUserIDAndRoleID = (
	{ id, roleId }: RemoveUserRoleByUserIDAndRoleIDPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/users/${id}/roles/${roleId}`,
		method: 'DELETE',
		signal,
	});
};

export const getRemoveUserRoleByUserIDAndRoleIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof removeUserRoleByUserIDAndRoleID>>,
		TError,
		{ pathParams: RemoveUserRoleByUserIDAndRoleIDPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof removeUserRoleByUserIDAndRoleID>>,
	TError,
	{ pathParams: RemoveUserRoleByUserIDAndRoleIDPathParameters },
	TContext
> => {
	const mutationKey = ['removeUserRoleByUserIDAndRoleID'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof removeUserRoleByUserIDAndRoleID>>,
		{ pathParams: RemoveUserRoleByUserIDAndRoleIDPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return removeUserRoleByUserIDAndRoleID(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type RemoveUserRoleByUserIDAndRoleIDMutationResult = NonNullable<
	Awaited<ReturnType<typeof removeUserRoleByUserIDAndRoleID>>
>;

export type RemoveUserRoleByUserIDAndRoleIDMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @deprecated
 * @summary Remove a role from user
 */
export const useRemoveUserRoleByUserIDAndRoleID = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof removeUserRoleByUserIDAndRoleID>>,
		TError,
		{ pathParams: RemoveUserRoleByUserIDAndRoleIDPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof removeUserRoleByUserIDAndRoleID>>,
	TError,
	{ pathParams: RemoveUserRoleByUserIDAndRoleIDPathParameters },
	TContext
> => {
	return useMutation(getRemoveUserRoleByUserIDAndRoleIDMutationOptions(options));
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
	TError = ErrorType<RenderErrorResponseDTO>,
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
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof getMyUser>>, TError, TData>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetMyUserQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
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
	typesUpdatableUserDTO?: BodyType<TypesUpdatableUserDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/users/me`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: typesUpdatableUserDTO,
		signal,
	});
};

export const getUpdateMyUserV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMyUserV2>>,
		TError,
		{ data?: BodyType<TypesUpdatableUserDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateMyUserV2>>,
	TError,
	{ data?: BodyType<TypesUpdatableUserDTO> },
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
		{ data?: BodyType<TypesUpdatableUserDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return updateMyUserV2(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateMyUserV2MutationResult = NonNullable<
	Awaited<ReturnType<typeof updateMyUserV2>>
>;
export type UpdateMyUserV2MutationBody =
	| BodyType<TypesUpdatableUserDTO>
	| undefined;
export type UpdateMyUserV2MutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update my user v2
 */
export const useUpdateMyUserV2 = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMyUserV2>>,
		TError,
		{ data?: BodyType<TypesUpdatableUserDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateMyUserV2>>,
	TError,
	{ data?: BodyType<TypesUpdatableUserDTO> },
	TContext
> => {
	return useMutation(getUpdateMyUserV2MutationOptions(options));
};
/**
 * This endpoint updates the password of the user I belong to
 * @summary Updates my password
 */
export const updateMyPassword = (
	typesChangePasswordRequestDTO?: BodyType<TypesChangePasswordRequestDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/users/me/factor_password`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: typesChangePasswordRequestDTO,
		signal,
	});
};

export const getUpdateMyPasswordMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMyPassword>>,
		TError,
		{ data?: BodyType<TypesChangePasswordRequestDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateMyPassword>>,
	TError,
	{ data?: BodyType<TypesChangePasswordRequestDTO> },
	TContext
> => {
	const mutationKey = ['updateMyPassword'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateMyPassword>>,
		{ data?: BodyType<TypesChangePasswordRequestDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return updateMyPassword(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateMyPasswordMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateMyPassword>>
>;
export type UpdateMyPasswordMutationBody =
	| BodyType<TypesChangePasswordRequestDTO>
	| undefined;
export type UpdateMyPasswordMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Updates my password
 */
export const useUpdateMyPassword = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMyPassword>>,
		TError,
		{ data?: BodyType<TypesChangePasswordRequestDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateMyPassword>>,
	TError,
	{ data?: BodyType<TypesChangePasswordRequestDTO> },
	TContext
> => {
	return useMutation(getUpdateMyPasswordMutationOptions(options));
};
