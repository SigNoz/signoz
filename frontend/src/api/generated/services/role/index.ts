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
	CreateRole201,
	DeleteRolePathParameters,
	GetRole200,
	GetRolePathParameters,
	ListRoles200,
	PatchRolePathParameters,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

type AwaitedInput<T> = PromiseLike<T> | T;

type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

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
	return ['listRoles'] as const;
};

export const getListRolesQueryOptions = <
	TData = Awaited<ReturnType<typeof listRoles>>,
	TError = RenderErrorResponseDTO
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
export type ListRolesQueryError = RenderErrorResponseDTO;

/**
 * @summary List roles
 */

export function useListRoles<
	TData = Awaited<ReturnType<typeof listRoles>>,
	TError = RenderErrorResponseDTO
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof listRoles>>, TError, TData>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListRolesQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
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
export const createRole = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<CreateRole201>({
		url: `/api/v1/roles`,
		method: 'POST',
		signal,
	});
};

export const getCreateRoleMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createRole>>,
		TError,
		void,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createRole>>,
	TError,
	void,
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
		void
	> = () => {
		return createRole();
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateRoleMutationResult = NonNullable<
	Awaited<ReturnType<typeof createRole>>
>;

export type CreateRoleMutationError = RenderErrorResponseDTO;

/**
 * @summary Create role
 */
export const useCreateRole = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createRole>>,
		TError,
		void,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createRole>>,
	TError,
	void,
	TContext
> => {
	const mutationOptions = getCreateRoleMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint deletes a role
 * @summary Delete role
 */
export const deleteRole = ({ id }: DeleteRolePathParameters) => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/roles/${id}`,
		method: 'DELETE',
	});
};

export const getDeleteRoleMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
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

export type DeleteRoleMutationError = RenderErrorResponseDTO;

/**
 * @summary Delete role
 */
export const useDeleteRole = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
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
	const mutationOptions = getDeleteRoleMutationOptions(options);

	return useMutation(mutationOptions);
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
	return ['getRole'] as const;
};

export const getGetRoleQueryOptions = <
	TData = Awaited<ReturnType<typeof getRole>>,
	TError = RenderErrorResponseDTO
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
export type GetRoleQueryError = RenderErrorResponseDTO;

/**
 * @summary Get role
 */

export function useGetRole<
	TData = Awaited<ReturnType<typeof getRole>>,
	TError = RenderErrorResponseDTO
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

	query.queryKey = queryOptions.queryKey;

	return query;
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
 * This endpoint patches a role
 * @summary Patch role
 */
export const patchRole = ({ id }: PatchRolePathParameters) => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/roles/${id}`,
		method: 'PATCH',
	});
};

export const getPatchRoleMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof patchRole>>,
		TError,
		{ pathParams: PatchRolePathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof patchRole>>,
	TError,
	{ pathParams: PatchRolePathParameters },
	TContext
> => {
	const mutationKey = ['patchRole'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof patchRole>>,
		{ pathParams: PatchRolePathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return patchRole(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type PatchRoleMutationResult = NonNullable<
	Awaited<ReturnType<typeof patchRole>>
>;

export type PatchRoleMutationError = RenderErrorResponseDTO;

/**
 * @summary Patch role
 */
export const usePatchRole = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof patchRole>>,
		TError,
		{ pathParams: PatchRolePathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof patchRole>>,
	TError,
	{ pathParams: PatchRolePathParameters },
	TContext
> => {
	const mutationOptions = getPatchRoleMutationOptions(options);

	return useMutation(mutationOptions);
};
