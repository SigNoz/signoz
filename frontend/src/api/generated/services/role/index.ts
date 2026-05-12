/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'yarn generate:api'
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
	AuthtypesPatchableRoleDTO,
	AuthtypesPostableRoleDTO,
	CoretypesPatchableObjectsDTO,
	CreateRole201,
	DeleteRolePathParameters,
	GetObjects200,
	GetObjectsPathParameters,
	GetRole200,
	GetRolePathParameters,
	ListRoles200,
	PatchObjectsPathParameters,
	PatchRolePathParameters,
	RenderErrorResponseDTO,
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
export const createRole = (
	authtypesPostableRoleDTO: BodyType<AuthtypesPostableRoleDTO>,
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
		{ data: BodyType<AuthtypesPostableRoleDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createRole>>,
	TError,
	{ data: BodyType<AuthtypesPostableRoleDTO> },
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
		{ data: BodyType<AuthtypesPostableRoleDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createRole(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateRoleMutationResult = NonNullable<
	Awaited<ReturnType<typeof createRole>>
>;
export type CreateRoleMutationBody = BodyType<AuthtypesPostableRoleDTO>;
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
		{ data: BodyType<AuthtypesPostableRoleDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createRole>>,
	TError,
	{ data: BodyType<AuthtypesPostableRoleDTO> },
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
export const patchRole = (
	{ id }: PatchRolePathParameters,
	authtypesPatchableRoleDTO: BodyType<AuthtypesPatchableRoleDTO>,
) => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/roles/${id}`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		data: authtypesPatchableRoleDTO,
	});
};

export const getPatchRoleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof patchRole>>,
		TError,
		{
			pathParams: PatchRolePathParameters;
			data: BodyType<AuthtypesPatchableRoleDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof patchRole>>,
	TError,
	{
		pathParams: PatchRolePathParameters;
		data: BodyType<AuthtypesPatchableRoleDTO>;
	},
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
		{
			pathParams: PatchRolePathParameters;
			data: BodyType<AuthtypesPatchableRoleDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return patchRole(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type PatchRoleMutationResult = NonNullable<
	Awaited<ReturnType<typeof patchRole>>
>;
export type PatchRoleMutationBody = BodyType<AuthtypesPatchableRoleDTO>;
export type PatchRoleMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Patch role
 */
export const usePatchRole = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof patchRole>>,
		TError,
		{
			pathParams: PatchRolePathParameters;
			data: BodyType<AuthtypesPatchableRoleDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof patchRole>>,
	TError,
	{
		pathParams: PatchRolePathParameters;
		data: BodyType<AuthtypesPatchableRoleDTO>;
	},
	TContext
> => {
	const mutationOptions = getPatchRoleMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Gets all objects connected to the specified role via a given relation type
 * @summary Get objects for a role by relation
 */
export const getObjects = (
	{ id, relation }: GetObjectsPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetObjects200>({
		url: `/api/v1/roles/${id}/relations/${relation}/objects`,
		method: 'GET',
		signal,
	});
};

export const getGetObjectsQueryKey = ({
	id,
	relation,
}: GetObjectsPathParameters) => {
	return [`/api/v1/roles/${id}/relations/${relation}/objects`] as const;
};

export const getGetObjectsQueryOptions = <
	TData = Awaited<ReturnType<typeof getObjects>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id, relation }: GetObjectsPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getObjects>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetObjectsQueryKey({ id, relation });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getObjects>>> = ({
		signal,
	}) => getObjects({ id, relation }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!(id && relation),
		...queryOptions,
	} as UseQueryOptions<Awaited<ReturnType<typeof getObjects>>, TError, TData> & {
		queryKey: QueryKey;
	};
};

export type GetObjectsQueryResult = NonNullable<
	Awaited<ReturnType<typeof getObjects>>
>;
export type GetObjectsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get objects for a role by relation
 */

export function useGetObjects<
	TData = Awaited<ReturnType<typeof getObjects>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id, relation }: GetObjectsPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getObjects>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetObjectsQueryOptions({ id, relation }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get objects for a role by relation
 */
export const invalidateGetObjects = async (
	queryClient: QueryClient,
	{ id, relation }: GetObjectsPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetObjectsQueryKey({ id, relation }) },
		options,
	);

	return queryClient;
};

/**
 * Patches the objects connected to the specified role via a given relation type
 * @summary Patch objects for a role by relation
 */
export const patchObjects = (
	{ id, relation }: PatchObjectsPathParameters,
	coretypesPatchableObjectsDTO: BodyType<CoretypesPatchableObjectsDTO>,
) => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/roles/${id}/relations/${relation}/objects`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		data: coretypesPatchableObjectsDTO,
	});
};

export const getPatchObjectsMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof patchObjects>>,
		TError,
		{
			pathParams: PatchObjectsPathParameters;
			data: BodyType<CoretypesPatchableObjectsDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof patchObjects>>,
	TError,
	{
		pathParams: PatchObjectsPathParameters;
		data: BodyType<CoretypesPatchableObjectsDTO>;
	},
	TContext
> => {
	const mutationKey = ['patchObjects'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof patchObjects>>,
		{
			pathParams: PatchObjectsPathParameters;
			data: BodyType<CoretypesPatchableObjectsDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return patchObjects(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type PatchObjectsMutationResult = NonNullable<
	Awaited<ReturnType<typeof patchObjects>>
>;
export type PatchObjectsMutationBody = BodyType<CoretypesPatchableObjectsDTO>;
export type PatchObjectsMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Patch objects for a role by relation
 */
export const usePatchObjects = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof patchObjects>>,
		TError,
		{
			pathParams: PatchObjectsPathParameters;
			data: BodyType<CoretypesPatchableObjectsDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof patchObjects>>,
	TError,
	{
		pathParams: PatchObjectsPathParameters;
		data: BodyType<CoretypesPatchableObjectsDTO>;
	},
	TContext
> => {
	const mutationOptions = getPatchObjectsMutationOptions(options);

	return useMutation(mutationOptions);
};
