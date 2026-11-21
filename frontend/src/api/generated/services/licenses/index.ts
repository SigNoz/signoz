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

import type { ActivateLicense201 } from '../sigNoz.schemas/activateLicense201';

import type { DeleteLicensePathParameters } from '../sigNoz.schemas/deleteLicensePathParameters';

import type { GetActiveLicense200 } from '../sigNoz.schemas/getActiveLicense200';

import type { GetLicense200 } from '../sigNoz.schemas/getLicense200';

import type { GetLicensePathParameters } from '../sigNoz.schemas/getLicensePathParameters';

import type { LicensetypesPostableLicenseDTO } from '../sigNoz.schemas/licensetypesPostableLicenseDTO';

import type { ListLicenses200 } from '../sigNoz.schemas/listLicenses200';

import type { RefreshLicensePathParameters } from '../sigNoz.schemas/refreshLicensePathParameters';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

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
 * This endpoint validates the license key with the upstream server and activates the license for the organization.
 * @deprecated
 * @summary Activate a license.
 */
export const activateLicenseDeprecated = (
	licensetypesPostableLicenseDTO?: BodyType<LicensetypesPostableLicenseDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v3/licenses`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: licensetypesPostableLicenseDTO,
		signal,
	});
};

export const getActivateLicenseDeprecatedMutationKey = () =>
	['activateLicenseDeprecated'] as const;

export const getActivateLicenseDeprecatedMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof activateLicenseDeprecated>>,
		TError,
		ActivateLicenseDeprecatedMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof activateLicenseDeprecated>>,
	TError,
	ActivateLicenseDeprecatedMutationVariables,
	TContext
> => {
	const mutationKey = getActivateLicenseDeprecatedMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof activateLicenseDeprecated>>,
		ActivateLicenseDeprecatedMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return activateLicenseDeprecated(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ActivateLicenseDeprecatedMutationResult = NonNullable<
	Awaited<ReturnType<typeof activateLicenseDeprecated>>
>;
export type ActivateLicenseDeprecatedMutationBody =
	| BodyType<LicensetypesPostableLicenseDTO>
	| undefined;
export type ActivateLicenseDeprecatedMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type ActivateLicenseDeprecatedMutationVariables = {
	data?: BodyType<LicensetypesPostableLicenseDTO>;
};

/**
 * @deprecated
 * @summary Activate a license.
 */
export const useActivateLicenseDeprecated = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof activateLicenseDeprecated>>,
		TError,
		ActivateLicenseDeprecatedMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof activateLicenseDeprecated>>,
	TError,
	ActivateLicenseDeprecatedMutationVariables,
	TContext
> => {
	return useMutation(getActivateLicenseDeprecatedMutationOptions(options));
};
/**
 * This endpoint refreshes the active license of the organization from the upstream server.
 * @deprecated
 * @summary Refresh a license.
 */
export const refreshLicenseDeprecated = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v3/licenses`,
		method: 'PUT',
		signal,
	});
};

export const getRefreshLicenseDeprecatedMutationKey = () =>
	['refreshLicenseDeprecated'] as const;

export const getRefreshLicenseDeprecatedMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof refreshLicenseDeprecated>>,
		TError,
		void,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof refreshLicenseDeprecated>>,
	TError,
	void,
	TContext
> => {
	const mutationKey = getRefreshLicenseDeprecatedMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof refreshLicenseDeprecated>>,
		void
	> = () => {
		return refreshLicenseDeprecated();
	};

	return { mutationFn, ...mutationOptions };
};

export type RefreshLicenseDeprecatedMutationResult = NonNullable<
	Awaited<ReturnType<typeof refreshLicenseDeprecated>>
>;

export type RefreshLicenseDeprecatedMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @deprecated
 * @summary Refresh a license.
 */
export const useRefreshLicenseDeprecated = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof refreshLicenseDeprecated>>,
		TError,
		void,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof refreshLicenseDeprecated>>,
	TError,
	void,
	TContext
> => {
	return useMutation(getRefreshLicenseDeprecatedMutationOptions(options));
};
/**
 * This endpoint lists all the licenses of the organization.
 * @summary List licenses.
 */
export const listLicenses = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListLicenses200>({
		url: `/api/v4/licenses`,
		method: 'GET',
		signal,
	});
};

export const getListLicensesQueryKey = () => {
	return [`/api/v4/licenses`] as const;
};

export const getListLicensesQueryOptions = <
	TData = Awaited<ReturnType<typeof listLicenses>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listLicenses>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListLicensesQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof listLicenses>>> = ({
		signal,
	}) => listLicenses(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listLicenses>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListLicensesQueryResult = NonNullable<
	Awaited<ReturnType<typeof listLicenses>>
>;
export type ListLicensesQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List licenses.
 */

export function useListLicenses<
	TData = Awaited<ReturnType<typeof listLicenses>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listLicenses>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListLicensesQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListLicenses} query
 */
export const invalidateListLicenses = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListLicensesQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint validates the license key with the upstream server and activates the license for the organization.
 * @summary Activate a license.
 */
export const activateLicense = (
	licensetypesPostableLicenseDTO?: BodyType<LicensetypesPostableLicenseDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ActivateLicense201>({
		url: `/api/v4/licenses`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: licensetypesPostableLicenseDTO,
		signal,
	});
};

export const getActivateLicenseMutationKey = () => ['activateLicense'] as const;

export const getActivateLicenseMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof activateLicense>>,
		TError,
		ActivateLicenseMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof activateLicense>>,
	TError,
	ActivateLicenseMutationVariables,
	TContext
> => {
	const mutationKey = getActivateLicenseMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof activateLicense>>,
		ActivateLicenseMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return activateLicense(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ActivateLicenseMutationResult = NonNullable<
	Awaited<ReturnType<typeof activateLicense>>
>;
export type ActivateLicenseMutationBody =
	| BodyType<LicensetypesPostableLicenseDTO>
	| undefined;
export type ActivateLicenseMutationError = ErrorType<RenderErrorResponseDTO>;
export type ActivateLicenseMutationVariables = {
	data?: BodyType<LicensetypesPostableLicenseDTO>;
};

/**
 * @summary Activate a license.
 */
export const useActivateLicense = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof activateLicense>>,
		TError,
		ActivateLicenseMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof activateLicense>>,
	TError,
	ActivateLicenseMutationVariables,
	TContext
> => {
	return useMutation(getActivateLicenseMutationOptions(options));
};
/**
 * This endpoint deletes the license by id. Licenses managed by SigNoz Cloud cannot be deleted.
 * @summary Delete a license.
 */
export const deleteLicense = (
	{ id }: DeleteLicensePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v4/licenses/${id}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteLicenseMutationKey = () => ['deleteLicense'] as const;

export const getDeleteLicenseMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteLicense>>,
		TError,
		DeleteLicenseMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteLicense>>,
	TError,
	DeleteLicenseMutationVariables,
	TContext
> => {
	const mutationKey = getDeleteLicenseMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteLicense>>,
		DeleteLicenseMutationVariables
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteLicense(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteLicenseMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteLicense>>
>;

export type DeleteLicenseMutationError = ErrorType<RenderErrorResponseDTO>;
export type DeleteLicenseMutationVariables = {
	pathParams: DeleteLicensePathParameters;
};

/**
 * @summary Delete a license.
 */
export const useDeleteLicense = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteLicense>>,
		TError,
		DeleteLicenseMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteLicense>>,
	TError,
	DeleteLicenseMutationVariables,
	TContext
> => {
	return useMutation(getDeleteLicenseMutationOptions(options));
};
/**
 * This endpoint gets the license by id.
 * @summary Get a license.
 */
export const getLicense = (
	{ id }: GetLicensePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetLicense200>({
		url: `/api/v4/licenses/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetLicenseQueryKey = ({ id }: GetLicensePathParameters) => {
	return [`/api/v4/licenses/${id}`] as const;
};

export const getGetLicenseQueryOptions = <
	TData = Awaited<ReturnType<typeof getLicense>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetLicensePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getLicense>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetLicenseQueryKey({ id });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getLicense>>> = ({
		signal,
	}) => getLicense({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: id !== null && id !== undefined,
		...queryOptions,
	} as UseQueryOptions<Awaited<ReturnType<typeof getLicense>>, TError, TData> & {
		queryKey: QueryKey;
	};
};

export type GetLicenseQueryResult = NonNullable<
	Awaited<ReturnType<typeof getLicense>>
>;
export type GetLicenseQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get a license.
 */

export function useGetLicense<
	TData = Awaited<ReturnType<typeof getLicense>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetLicensePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getLicense>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetLicenseQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetLicense} query
 */
export const invalidateGetLicense = async (
	queryClient: QueryClient,
	{ id }: GetLicensePathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetLicenseQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint refreshes the active license of the organization from the upstream server.
 * @summary Refresh a license.
 */
export const refreshLicense = (
	{ id }: RefreshLicensePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v4/licenses/${id}`,
		method: 'PUT',
		signal,
	});
};

export const getRefreshLicenseMutationKey = () => ['refreshLicense'] as const;

export const getRefreshLicenseMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof refreshLicense>>,
		TError,
		RefreshLicenseMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof refreshLicense>>,
	TError,
	RefreshLicenseMutationVariables,
	TContext
> => {
	const mutationKey = getRefreshLicenseMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof refreshLicense>>,
		RefreshLicenseMutationVariables
	> = (props) => {
		const { pathParams } = props ?? {};

		return refreshLicense(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type RefreshLicenseMutationResult = NonNullable<
	Awaited<ReturnType<typeof refreshLicense>>
>;

export type RefreshLicenseMutationError = ErrorType<RenderErrorResponseDTO>;
export type RefreshLicenseMutationVariables = {
	pathParams: RefreshLicensePathParameters;
};

/**
 * @summary Refresh a license.
 */
export const useRefreshLicense = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof refreshLicense>>,
		TError,
		RefreshLicenseMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof refreshLicense>>,
	TError,
	RefreshLicenseMutationVariables,
	TContext
> => {
	return useMutation(getRefreshLicenseMutationOptions(options));
};
/**
 * This endpoint gets the active license of the organization.
 * @summary Get the active license.
 */
export const getActiveLicense = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetActiveLicense200>({
		url: `/api/v4/licenses/active`,
		method: 'GET',
		signal,
	});
};

export const getGetActiveLicenseQueryKey = () => {
	return [`/api/v4/licenses/active`] as const;
};

export const getGetActiveLicenseQueryOptions = <
	TData = Awaited<ReturnType<typeof getActiveLicense>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getActiveLicense>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetActiveLicenseQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getActiveLicense>>> = ({
		signal,
	}) => getActiveLicense(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getActiveLicense>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetActiveLicenseQueryResult = NonNullable<
	Awaited<ReturnType<typeof getActiveLicense>>
>;
export type GetActiveLicenseQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get the active license.
 */

export function useGetActiveLicense<
	TData = Awaited<ReturnType<typeof getActiveLicense>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getActiveLicense>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetActiveLicenseQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetActiveLicense} query
 */
export const invalidateGetActiveLicense = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetActiveLicenseQueryKey() },
		options,
	);

	return queryClient;
};
