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

import type { GetOrgPreference200 } from '../sigNoz.schemas/getOrgPreference200';

import type { GetOrgPreferencePathParameters } from '../sigNoz.schemas/getOrgPreferencePathParameters';

import type { GetUserPreference200 } from '../sigNoz.schemas/getUserPreference200';

import type { GetUserPreferencePathParameters } from '../sigNoz.schemas/getUserPreferencePathParameters';

import type { ListOrgPreferences200 } from '../sigNoz.schemas/listOrgPreferences200';

import type { ListUserPreferences200 } from '../sigNoz.schemas/listUserPreferences200';

import type { PreferencetypesUpdatablePreferenceDTO } from '../sigNoz.schemas/preferencetypesUpdatablePreferenceDTO';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

import type { UpdateOrgPreferencePathParameters } from '../sigNoz.schemas/updateOrgPreferencePathParameters';

import type { UpdateUserPreferencePathParameters } from '../sigNoz.schemas/updateUserPreferencePathParameters';

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
	return [`/api/v1/org/preferences`] as const;
};

export const getListOrgPreferencesQueryOptions = <
	TData = Awaited<ReturnType<typeof listOrgPreferences>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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
export type ListOrgPreferencesQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List org preferences
 */

export function useListOrgPreferences<
	TData = Awaited<ReturnType<typeof listOrgPreferences>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListOrgPreferences} query
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
	return [`/api/v1/org/preferences/${name}`] as const;
};

export const getGetOrgPreferenceQueryOptions = <
	TData = Awaited<ReturnType<typeof getOrgPreference>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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
		enabled: name !== null && name !== undefined,
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
export type GetOrgPreferenceQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get org preference
 */

export function useGetOrgPreference<
	TData = Awaited<ReturnType<typeof getOrgPreference>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetOrgPreference} query
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
	preferencetypesUpdatablePreferenceDTO?: BodyType<PreferencetypesUpdatablePreferenceDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/org/preferences/${name}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: preferencetypesUpdatablePreferenceDTO,
		signal,
	});
};

export const getUpdateOrgPreferenceMutationKey = () =>
	['updateOrgPreference'] as const;

export const getUpdateOrgPreferenceMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateOrgPreference>>,
		TError,
		UpdateOrgPreferenceMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateOrgPreference>>,
	TError,
	UpdateOrgPreferenceMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateOrgPreferenceMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateOrgPreference>>,
		UpdateOrgPreferenceMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateOrgPreference(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateOrgPreferenceMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateOrgPreference>>
>;
export type UpdateOrgPreferenceMutationBody =
	| BodyType<PreferencetypesUpdatablePreferenceDTO>
	| undefined;
export type UpdateOrgPreferenceMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type UpdateOrgPreferenceMutationVariables = {
	pathParams: UpdateOrgPreferencePathParameters;
	data?: BodyType<PreferencetypesUpdatablePreferenceDTO>;
};

/**
 * @summary Update org preference
 */
export const useUpdateOrgPreference = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateOrgPreference>>,
		TError,
		UpdateOrgPreferenceMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateOrgPreference>>,
	TError,
	UpdateOrgPreferenceMutationVariables,
	TContext
> => {
	return useMutation(getUpdateOrgPreferenceMutationOptions(options));
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
	return [`/api/v1/user/preferences`] as const;
};

export const getListUserPreferencesQueryOptions = <
	TData = Awaited<ReturnType<typeof listUserPreferences>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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
export type ListUserPreferencesQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List user preferences
 */

export function useListUserPreferences<
	TData = Awaited<ReturnType<typeof listUserPreferences>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListUserPreferences} query
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
	return [`/api/v1/user/preferences/${name}`] as const;
};

export const getGetUserPreferenceQueryOptions = <
	TData = Awaited<ReturnType<typeof getUserPreference>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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
		enabled: name !== null && name !== undefined,
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
export type GetUserPreferenceQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get user preference
 */

export function useGetUserPreference<
	TData = Awaited<ReturnType<typeof getUserPreference>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetUserPreference} query
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
	preferencetypesUpdatablePreferenceDTO?: BodyType<PreferencetypesUpdatablePreferenceDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/user/preferences/${name}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: preferencetypesUpdatablePreferenceDTO,
		signal,
	});
};

export const getUpdateUserPreferenceMutationKey = () =>
	['updateUserPreference'] as const;

export const getUpdateUserPreferenceMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateUserPreference>>,
		TError,
		UpdateUserPreferenceMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateUserPreference>>,
	TError,
	UpdateUserPreferenceMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateUserPreferenceMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateUserPreference>>,
		UpdateUserPreferenceMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateUserPreference(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateUserPreferenceMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateUserPreference>>
>;
export type UpdateUserPreferenceMutationBody =
	| BodyType<PreferencetypesUpdatablePreferenceDTO>
	| undefined;
export type UpdateUserPreferenceMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type UpdateUserPreferenceMutationVariables = {
	pathParams: UpdateUserPreferencePathParameters;
	data?: BodyType<PreferencetypesUpdatablePreferenceDTO>;
};

/**
 * @summary Update user preference
 */
export const useUpdateUserPreference = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateUserPreference>>,
		TError,
		UpdateUserPreferenceMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateUserPreference>>,
	TError,
	UpdateUserPreferenceMutationVariables,
	TContext
> => {
	return useMutation(getUpdateUserPreferenceMutationOptions(options));
};
