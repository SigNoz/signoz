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
	AuthtypesPostableRoleDTO,
	AuthtypesUpdatableRoleDTO,
	CreateRole201,
	DeleteRolePathParameters,
	GetRole200,
	GetRolePathParameters,
	ListRoles200,
	RenderErrorResponseDTO,
	UpdateRolePathParameters,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * This endpoint lists all roles
 * @summary List roles
 */
export const listRoles = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListRoles200>({
		url: `/api/v1/roles`,
		method: 'GET',
		signal,
	});
};

export const getListRolesQueryKey = () => {
	return [`/api/v1/roles`] as const;
};

export const getListRolesQueryOptions = <
	TData = Awaited<ReturnType<typeof listRoles>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof listRoles>>, TError, TData>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListRolesQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof listRoles>>> = ({
		signal,
	}) => listRoles(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listRoles>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListRolesQueryResult = NonNullable<
	Awaited<ReturnType<typeof listRoles>>
>;
export type ListRolesQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List roles
 */

export function useListRoles<
	TData = Awaited<ReturnType<typeof listRoles>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof listRoles>>, TError, TData>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListRolesQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary List roles
 */
export const invalidateListRoles = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListRolesQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates a role
 * @summary Create role
 */
export const createRole = (
	authtypesPostableRoleDTO?: BodyType<AuthtypesPostableRoleDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateRole201>({
		url: `/api/v1/roles`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: authtypesPostableRoleDTO,
		signal,
	});
};

export const getCreateRoleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createRole>>,
		TError,
		{ data?: BodyType<AuthtypesPostableRoleDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createRole>>,
	TError,
	{ data?: BodyType<AuthtypesPostableRoleDTO> },
	TContext
> => {
	const mutationKey = ['createRole'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createRole>>,
		{ data?: BodyType<AuthtypesPostableRoleDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createRole(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateRoleMutationResult = NonNullable<
	Awaited<ReturnType<typeof createRole>>
>;
export type CreateRoleMutationBody =
	| BodyType<AuthtypesPostableRoleDTO>
	| undefined;
export type CreateRoleMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create role
 */
export const useCreateRole = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createRole>>,
		TError,
		{ data?: BodyType<AuthtypesPostableRoleDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createRole>>,
	TError,
	{ data?: BodyType<AuthtypesPostableRoleDTO> },
	TContext
> => {
	return useMutation(getCreateRoleMutationOptions(options));
};
/**
 * This endpoint deletes a role
 * @summary Delete role
 */
export const deleteRole = (
	{ id }: DeleteRolePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/roles/${id}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteRoleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteRole>>,
		TError,
		{ pathParams: DeleteRolePathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteRole>>,
	TError,
	{ pathParams: DeleteRolePathParameters },
	TContext
> => {
	const mutationKey = ['deleteRole'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteRole>>,
		{ pathParams: DeleteRolePathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteRole(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteRoleMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteRole>>
>;

export type DeleteRoleMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete role
 */
export const useDeleteRole = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteRole>>,
		TError,
		{ pathParams: DeleteRolePathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteRole>>,
	TError,
	{ pathParams: DeleteRolePathParameters },
	TContext
> => {
	return useMutation(getDeleteRoleMutationOptions(options));
};
/**
 * This endpoint gets a role
 * @summary Get role
 */
export const getRole = (
	{ id }: GetRolePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetRole200>({
		url: `/api/v1/roles/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetRoleQueryKey = ({ id }: GetRolePathParameters) => {
	return [`/api/v1/roles/${id}`] as const;
};

export const getGetRoleQueryOptions = <
	TData = Awaited<ReturnType<typeof getRole>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRolePathParameters,
	options?: {
		query?: UseQueryOptions<Awaited<ReturnType<typeof getRole>>, TError, TData>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetRoleQueryKey({ id });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getRole>>> = ({
		signal,
	}) => getRole({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<Awaited<ReturnType<typeof getRole>>, TError, TData> & {
		queryKey: QueryKey;
	};
};

export type GetRoleQueryResult = NonNullable<
	Awaited<ReturnType<typeof getRole>>
>;
export type GetRoleQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get role
 */

export function useGetRole<
	TData = Awaited<ReturnType<typeof getRole>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRolePathParameters,
	options?: {
		query?: UseQueryOptions<Awaited<ReturnType<typeof getRole>>, TError, TData>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetRoleQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get role
 */
export const invalidateGetRole = async (
	queryClient: QueryClient,
	{ id }: GetRolePathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetRoleQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint updates a role
 * @summary Update role
 */
export const updateRole = (
	{ id }: UpdateRolePathParameters,
	authtypesUpdatableRoleDTO?: BodyType<AuthtypesUpdatableRoleDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/roles/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: authtypesUpdatableRoleDTO,
		signal,
	});
};

export const getUpdateRoleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateRole>>,
		TError,
		{
			pathParams: UpdateRolePathParameters;
			data?: BodyType<AuthtypesUpdatableRoleDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateRole>>,
	TError,
	{
		pathParams: UpdateRolePathParameters;
		data?: BodyType<AuthtypesUpdatableRoleDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateRole'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateRole>>,
		{
			pathParams: UpdateRolePathParameters;
			data?: BodyType<AuthtypesUpdatableRoleDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateRole(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateRoleMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateRole>>
>;
export type UpdateRoleMutationBody =
	| BodyType<AuthtypesUpdatableRoleDTO>
	| undefined;
export type UpdateRoleMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update role
 */
export const useUpdateRole = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateRole>>,
		TError,
		{
			pathParams: UpdateRolePathParameters;
			data?: BodyType<AuthtypesUpdatableRoleDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateRole>>,
	TError,
	{
		pathParams: UpdateRolePathParameters;
		data?: BodyType<AuthtypesUpdatableRoleDTO>;
	},
	TContext
> => {
	return useMutation(getUpdateRoleMutationOptions(options));
};
