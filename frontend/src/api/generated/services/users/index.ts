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

import type { AuthtypesPostableUserDTO } from '../sigNoz.schemas/authtypesPostableUserDTO';

import type { AuthtypesPostableUserRoleDTO } from '../sigNoz.schemas/authtypesPostableUserRoleDTO';

import type { CreateResetPasswordToken201 } from '../sigNoz.schemas/createResetPasswordToken201';

import type { CreateResetPasswordTokenPathParameters } from '../sigNoz.schemas/createResetPasswordTokenPathParameters';

import type { CreateUser201 } from '../sigNoz.schemas/createUser201';

import type { CreateUserRole201 } from '../sigNoz.schemas/createUserRole201';

import type { DeleteUserPathParameters } from '../sigNoz.schemas/deleteUserPathParameters';

import type { DeleteUserRolePathParameters } from '../sigNoz.schemas/deleteUserRolePathParameters';

import type { GetMyUser200 } from '../sigNoz.schemas/getMyUser200';

import type { GetResetPasswordToken200 } from '../sigNoz.schemas/getResetPasswordToken200';

import type { GetResetPasswordTokenPathParameters } from '../sigNoz.schemas/getResetPasswordTokenPathParameters';

import type { GetRolesByUserID200 } from '../sigNoz.schemas/getRolesByUserID200';

import type { GetRolesByUserIDPathParameters } from '../sigNoz.schemas/getRolesByUserIDPathParameters';

import type { GetUser200 } from '../sigNoz.schemas/getUser200';

import type { GetUserPathParameters } from '../sigNoz.schemas/getUserPathParameters';

import type { GetUserRole200 } from '../sigNoz.schemas/getUserRole200';

import type { GetUserRolePathParameters } from '../sigNoz.schemas/getUserRolePathParameters';

import type { GetUsersByRoleID200 } from '../sigNoz.schemas/getUsersByRoleID200';

import type { GetUsersByRoleIDPathParameters } from '../sigNoz.schemas/getUsersByRoleIDPathParameters';

import type { ListUsers200 } from '../sigNoz.schemas/listUsers200';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

import type { TypesChangePasswordRequestDTO } from '../sigNoz.schemas/typesChangePasswordRequestDTO';

import type { TypesPostableForgotPasswordDTO } from '../sigNoz.schemas/typesPostableForgotPasswordDTO';

import type { TypesPostableResetPasswordDTO } from '../sigNoz.schemas/typesPostableResetPasswordDTO';

import type { TypesPostableVerifyResetPasswordTokenDTO } from '../sigNoz.schemas/typesPostableVerifyResetPasswordTokenDTO';

import type { TypesUpdatableUserDTO } from '../sigNoz.schemas/typesUpdatableUserDTO';

import type { UpdateUserPathParameters } from '../sigNoz.schemas/updateUserPathParameters';

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
 * This endpoint is deprecated and always fails. Use GET /api/v2/users/me instead.
 * @deprecated
 * @summary Get my user
 */
export const getMyUserDeprecated = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<void>({
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @deprecated
 * @summary Invalidates the {@link useGetMyUserDeprecated} query
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

export const getForgotPasswordMutationKey = () => ['forgotPassword'] as const;

export const getForgotPasswordMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof forgotPassword>>,
		TError,
		ForgotPasswordMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof forgotPassword>>,
	TError,
	ForgotPasswordMutationVariables,
	TContext
> => {
	const mutationKey = getForgotPasswordMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof forgotPassword>>,
		ForgotPasswordMutationVariables
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
export type ForgotPasswordMutationVariables = {
	data?: BodyType<TypesPostableForgotPasswordDTO>;
};

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
		ForgotPasswordMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof forgotPassword>>,
	TError,
	ForgotPasswordMutationVariables,
	TContext
> => {
	return useMutation(getForgotPasswordMutationOptions(options));
};
/**
 * This endpoint resets the password using a single use reset password token
 * @summary Reset password
 */
export const resetPassword = (
	typesPostableResetPasswordDTO?: BodyType<TypesPostableResetPasswordDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/factor_password/reset`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: typesPostableResetPasswordDTO,
		signal,
	});
};

export const getResetPasswordMutationKey = () => ['resetPassword'] as const;

export const getResetPasswordMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof resetPassword>>,
		TError,
		ResetPasswordMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof resetPassword>>,
	TError,
	ResetPasswordMutationVariables,
	TContext
> => {
	const mutationKey = getResetPasswordMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof resetPassword>>,
		ResetPasswordMutationVariables
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
export type ResetPasswordMutationVariables = {
	data?: BodyType<TypesPostableResetPasswordDTO>;
};

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
		ResetPasswordMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof resetPassword>>,
	TError,
	ResetPasswordMutationVariables,
	TContext
> => {
	return useMutation(getResetPasswordMutationOptions(options));
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

export const getVerifyResetPasswordTokenMutationKey = () =>
	['verifyResetPasswordToken'] as const;

export const getVerifyResetPasswordTokenMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof verifyResetPasswordToken>>,
		TError,
		VerifyResetPasswordTokenMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof verifyResetPasswordToken>>,
	TError,
	VerifyResetPasswordTokenMutationVariables,
	TContext
> => {
	const mutationKey = getVerifyResetPasswordTokenMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof verifyResetPasswordToken>>,
		VerifyResetPasswordTokenMutationVariables
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
export type VerifyResetPasswordTokenMutationVariables = {
	data?: BodyType<TypesPostableVerifyResetPasswordTokenDTO>;
};

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
		VerifyResetPasswordTokenMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof verifyResetPasswordToken>>,
	TError,
	VerifyResetPasswordTokenMutationVariables,
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
		enabled: id !== null && id !== undefined,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetUsersByRoleID} query
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

export const getCreateUserRoleMutationKey = () => ['createUserRole'] as const;

export const getCreateUserRoleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createUserRole>>,
		TError,
		CreateUserRoleMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createUserRole>>,
	TError,
	CreateUserRoleMutationVariables,
	TContext
> => {
	const mutationKey = getCreateUserRoleMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createUserRole>>,
		CreateUserRoleMutationVariables
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
export type CreateUserRoleMutationVariables = {
	data?: BodyType<AuthtypesPostableUserRoleDTO>;
};

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
		CreateUserRoleMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createUserRole>>,
	TError,
	CreateUserRoleMutationVariables,
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

export const getDeleteUserRoleMutationKey = () => ['deleteUserRole'] as const;

export const getDeleteUserRoleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteUserRole>>,
		TError,
		DeleteUserRoleMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteUserRole>>,
	TError,
	DeleteUserRoleMutationVariables,
	TContext
> => {
	const mutationKey = getDeleteUserRoleMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteUserRole>>,
		DeleteUserRoleMutationVariables
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
export type DeleteUserRoleMutationVariables = {
	pathParams: DeleteUserRolePathParameters;
};

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
		DeleteUserRoleMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteUserRole>>,
	TError,
	DeleteUserRoleMutationVariables,
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
		enabled: id !== null && id !== undefined,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetUserRole} query
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListUsers} query
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

export const getCreateUserMutationKey = () => ['createUser'] as const;

export const getCreateUserMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createUser>>,
		TError,
		CreateUserMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createUser>>,
	TError,
	CreateUserMutationVariables,
	TContext
> => {
	const mutationKey = getCreateUserMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createUser>>,
		CreateUserMutationVariables
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
export type CreateUserMutationVariables = {
	data?: BodyType<AuthtypesPostableUserDTO>;
};

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
		CreateUserMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createUser>>,
	TError,
	CreateUserMutationVariables,
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

export const getDeleteUserMutationKey = () => ['deleteUser'] as const;

export const getDeleteUserMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteUser>>,
		TError,
		DeleteUserMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteUser>>,
	TError,
	DeleteUserMutationVariables,
	TContext
> => {
	const mutationKey = getDeleteUserMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteUser>>,
		DeleteUserMutationVariables
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
export type DeleteUserMutationVariables = {
	pathParams: DeleteUserPathParameters;
};

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
		DeleteUserMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteUser>>,
	TError,
	DeleteUserMutationVariables,
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
		enabled: id !== null && id !== undefined,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetUser} query
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

export const getUpdateUserMutationKey = () => ['updateUser'] as const;

export const getUpdateUserMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateUser>>,
		TError,
		UpdateUserMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateUser>>,
	TError,
	UpdateUserMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateUserMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateUser>>,
		UpdateUserMutationVariables
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
export type UpdateUserMutationVariables = {
	pathParams: UpdateUserPathParameters;
	data?: BodyType<TypesUpdatableUserDTO>;
};

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
		UpdateUserMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateUser>>,
	TError,
	UpdateUserMutationVariables,
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
		enabled: id !== null && id !== undefined,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetResetPasswordToken} query
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

export const getCreateResetPasswordTokenMutationKey = () =>
	['createResetPasswordToken'] as const;

export const getCreateResetPasswordTokenMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createResetPasswordToken>>,
		TError,
		CreateResetPasswordTokenMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createResetPasswordToken>>,
	TError,
	CreateResetPasswordTokenMutationVariables,
	TContext
> => {
	const mutationKey = getCreateResetPasswordTokenMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createResetPasswordToken>>,
		CreateResetPasswordTokenMutationVariables
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
export type CreateResetPasswordTokenMutationVariables = {
	pathParams: CreateResetPasswordTokenPathParameters;
};

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
		CreateResetPasswordTokenMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createResetPasswordToken>>,
	TError,
	CreateResetPasswordTokenMutationVariables,
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
		enabled: id !== null && id !== undefined,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetRolesByUserID} query
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetMyUser} query
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

export const getUpdateMyUserV2MutationKey = () => ['updateMyUserV2'] as const;

export const getUpdateMyUserV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMyUserV2>>,
		TError,
		UpdateMyUserV2MutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateMyUserV2>>,
	TError,
	UpdateMyUserV2MutationVariables,
	TContext
> => {
	const mutationKey = getUpdateMyUserV2MutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateMyUserV2>>,
		UpdateMyUserV2MutationVariables
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
export type UpdateMyUserV2MutationVariables = {
	data?: BodyType<TypesUpdatableUserDTO>;
};

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
		UpdateMyUserV2MutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateMyUserV2>>,
	TError,
	UpdateMyUserV2MutationVariables,
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

export const getUpdateMyPasswordMutationKey = () =>
	['updateMyPassword'] as const;

export const getUpdateMyPasswordMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateMyPassword>>,
		TError,
		UpdateMyPasswordMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateMyPassword>>,
	TError,
	UpdateMyPasswordMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateMyPasswordMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateMyPassword>>,
		UpdateMyPasswordMutationVariables
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
export type UpdateMyPasswordMutationVariables = {
	data?: BodyType<TypesChangePasswordRequestDTO>;
};

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
		UpdateMyPasswordMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateMyPassword>>,
	TError,
	UpdateMyPasswordMutationVariables,
	TContext
> => {
	return useMutation(getUpdateMyPasswordMutationOptions(options));
};
