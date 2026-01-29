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
	GetOrgPreference200,
	GetOrgPreferencePathParameters,
	GetUserPreference200,
	GetUserPreferencePathParameters,
	ListOrgPreferences200,
	ListUserPreferences200,
	PreferencetypesUpdatablePreferenceDTO,
	RenderErrorResponseDTO,
	UpdateOrgPreferencePathParameters,
	UpdateUserPreferencePathParameters,
} from '../sigNoz.schemas';

type AwaitedInput<T> = PromiseLike<T> | T;

type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

/**
 * This endpoint lists all org preferences
 * @summary List org preferences
 */
export const listOrgPreferences = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListOrgPreferences200>({
		url: `/api/v1/org/preferences`,
		method: 'GET',
		signal,
	});
};

export const getListOrgPreferencesQueryKey = () => {
	return ['listOrgPreferences'] as const;
};

export const getListOrgPreferencesQueryOptions = <
	TData = Awaited<ReturnType<typeof listOrgPreferences>>,
	TError = RenderErrorResponseDTO
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listOrgPreferences>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListOrgPreferencesQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listOrgPreferences>>
	> = ({ signal }) => listOrgPreferences(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listOrgPreferences>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListOrgPreferencesQueryResult = NonNullable<
	Awaited<ReturnType<typeof listOrgPreferences>>
>;
export type ListOrgPreferencesQueryError = RenderErrorResponseDTO;

/**
 * @summary List org preferences
 */

export function useListOrgPreferences<
	TData = Awaited<ReturnType<typeof listOrgPreferences>>,
	TError = RenderErrorResponseDTO
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listOrgPreferences>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListOrgPreferencesQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List org preferences
 */
export const invalidateListOrgPreferences = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListOrgPreferencesQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint returns the org preference by name
 * @summary Get org preference
 */
export const getOrgPreference = (
	{ name }: GetOrgPreferencePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetOrgPreference200>({
		url: `/api/v1/org/preferences/${name}`,
		method: 'GET',
		signal,
	});
};

export const getGetOrgPreferenceQueryKey = ({
	name,
}: GetOrgPreferencePathParameters) => {
	return ['getOrgPreference'] as const;
};

export const getGetOrgPreferenceQueryOptions = <
	TData = Awaited<ReturnType<typeof getOrgPreference>>,
	TError = RenderErrorResponseDTO
>(
	{ name }: GetOrgPreferencePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getOrgPreference>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetOrgPreferenceQueryKey({ name });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getOrgPreference>>> = ({
		signal,
	}) => getOrgPreference({ name }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!name,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getOrgPreference>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetOrgPreferenceQueryResult = NonNullable<
	Awaited<ReturnType<typeof getOrgPreference>>
>;
export type GetOrgPreferenceQueryError = RenderErrorResponseDTO;

/**
 * @summary Get org preference
 */

export function useGetOrgPreference<
	TData = Awaited<ReturnType<typeof getOrgPreference>>,
	TError = RenderErrorResponseDTO
>(
	{ name }: GetOrgPreferencePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getOrgPreference>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetOrgPreferenceQueryOptions({ name }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get org preference
 */
export const invalidateGetOrgPreference = async (
	queryClient: QueryClient,
	{ name }: GetOrgPreferencePathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetOrgPreferenceQueryKey({ name }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint updates the org preference by name
 * @summary Update org preference
 */
export const updateOrgPreference = (
	{ name }: UpdateOrgPreferencePathParameters,
	preferencetypesUpdatablePreferenceDTO: PreferencetypesUpdatablePreferenceDTO,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/org/preferences/${name}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: preferencetypesUpdatablePreferenceDTO,
	});
};

export const getUpdateOrgPreferenceMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateOrgPreference>>,
		TError,
		{
			pathParams: UpdateOrgPreferencePathParameters;
			data: PreferencetypesUpdatablePreferenceDTO;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateOrgPreference>>,
	TError,
	{
		pathParams: UpdateOrgPreferencePathParameters;
		data: PreferencetypesUpdatablePreferenceDTO;
	},
	TContext
> => {
	const mutationKey = ['updateOrgPreference'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateOrgPreference>>,
		{
			pathParams: UpdateOrgPreferencePathParameters;
			data: PreferencetypesUpdatablePreferenceDTO;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateOrgPreference(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateOrgPreferenceMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateOrgPreference>>
>;
export type UpdateOrgPreferenceMutationBody = PreferencetypesUpdatablePreferenceDTO;
export type UpdateOrgPreferenceMutationError = RenderErrorResponseDTO;

/**
 * @summary Update org preference
 */
export const useUpdateOrgPreference = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateOrgPreference>>,
		TError,
		{
			pathParams: UpdateOrgPreferencePathParameters;
			data: PreferencetypesUpdatablePreferenceDTO;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateOrgPreference>>,
	TError,
	{
		pathParams: UpdateOrgPreferencePathParameters;
		data: PreferencetypesUpdatablePreferenceDTO;
	},
	TContext
> => {
	const mutationOptions = getUpdateOrgPreferenceMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint lists all user preferences
 * @summary List user preferences
 */
export const listUserPreferences = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListUserPreferences200>({
		url: `/api/v1/user/preferences`,
		method: 'GET',
		signal,
	});
};

export const getListUserPreferencesQueryKey = () => {
	return ['listUserPreferences'] as const;
};

export const getListUserPreferencesQueryOptions = <
	TData = Awaited<ReturnType<typeof listUserPreferences>>,
	TError = RenderErrorResponseDTO
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listUserPreferences>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListUserPreferencesQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listUserPreferences>>
	> = ({ signal }) => listUserPreferences(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listUserPreferences>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListUserPreferencesQueryResult = NonNullable<
	Awaited<ReturnType<typeof listUserPreferences>>
>;
export type ListUserPreferencesQueryError = RenderErrorResponseDTO;

/**
 * @summary List user preferences
 */

export function useListUserPreferences<
	TData = Awaited<ReturnType<typeof listUserPreferences>>,
	TError = RenderErrorResponseDTO
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listUserPreferences>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListUserPreferencesQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List user preferences
 */
export const invalidateListUserPreferences = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListUserPreferencesQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint returns the user preference by name
 * @summary Get user preference
 */
export const getUserPreference = (
	{ name }: GetUserPreferencePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetUserPreference200>({
		url: `/api/v1/user/preferences/${name}`,
		method: 'GET',
		signal,
	});
};

export const getGetUserPreferenceQueryKey = ({
	name,
}: GetUserPreferencePathParameters) => {
	return ['getUserPreference'] as const;
};

export const getGetUserPreferenceQueryOptions = <
	TData = Awaited<ReturnType<typeof getUserPreference>>,
	TError = RenderErrorResponseDTO
>(
	{ name }: GetUserPreferencePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getUserPreference>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetUserPreferenceQueryKey({ name });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getUserPreference>>
	> = ({ signal }) => getUserPreference({ name }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!name,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getUserPreference>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetUserPreferenceQueryResult = NonNullable<
	Awaited<ReturnType<typeof getUserPreference>>
>;
export type GetUserPreferenceQueryError = RenderErrorResponseDTO;

/**
 * @summary Get user preference
 */

export function useGetUserPreference<
	TData = Awaited<ReturnType<typeof getUserPreference>>,
	TError = RenderErrorResponseDTO
>(
	{ name }: GetUserPreferencePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getUserPreference>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetUserPreferenceQueryOptions({ name }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get user preference
 */
export const invalidateGetUserPreference = async (
	queryClient: QueryClient,
	{ name }: GetUserPreferencePathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetUserPreferenceQueryKey({ name }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint updates the user preference by name
 * @summary Update user preference
 */
export const updateUserPreference = (
	{ name }: UpdateUserPreferencePathParameters,
	preferencetypesUpdatablePreferenceDTO: PreferencetypesUpdatablePreferenceDTO,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/user/preferences/${name}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: preferencetypesUpdatablePreferenceDTO,
	});
};

export const getUpdateUserPreferenceMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateUserPreference>>,
		TError,
		{
			pathParams: UpdateUserPreferencePathParameters;
			data: PreferencetypesUpdatablePreferenceDTO;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateUserPreference>>,
	TError,
	{
		pathParams: UpdateUserPreferencePathParameters;
		data: PreferencetypesUpdatablePreferenceDTO;
	},
	TContext
> => {
	const mutationKey = ['updateUserPreference'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateUserPreference>>,
		{
			pathParams: UpdateUserPreferencePathParameters;
			data: PreferencetypesUpdatablePreferenceDTO;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateUserPreference(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateUserPreferenceMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateUserPreference>>
>;
export type UpdateUserPreferenceMutationBody = PreferencetypesUpdatablePreferenceDTO;
export type UpdateUserPreferenceMutationError = RenderErrorResponseDTO;

/**
 * @summary Update user preference
 */
export const useUpdateUserPreference = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateUserPreference>>,
		TError,
		{
			pathParams: UpdateUserPreferencePathParameters;
			data: PreferencetypesUpdatablePreferenceDTO;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateUserPreference>>,
	TError,
	{
		pathParams: UpdateUserPreferencePathParameters;
		data: PreferencetypesUpdatablePreferenceDTO;
	},
	TContext
> => {
	const mutationOptions = getUpdateUserPreferenceMutationOptions(options);

	return useMutation(mutationOptions);
};
