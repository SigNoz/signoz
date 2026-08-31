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
	DeleteLicensePathParameters,
	GetActiveLicense200,
	GetLicense200,
	GetLicensePathParameters,
	LicensetypesPostableLicenseDTO,
	ListLicenses200,
	RefreshLicensePathParameters,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

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

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary List licenses.
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
	return GeneratedAPIInstance<void>({
		url: `/api/v4/licenses`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: licensetypesPostableLicenseDTO,
		signal,
	});
};

export const getActivateLicenseMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof activateLicense>>,
		TError,
		{ data?: BodyType<LicensetypesPostableLicenseDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof activateLicense>>,
	TError,
	{ data?: BodyType<LicensetypesPostableLicenseDTO> },
	TContext
> => {
	const mutationKey = ['activateLicense'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof activateLicense>>,
		{ data?: BodyType<LicensetypesPostableLicenseDTO> }
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
		{ data?: BodyType<LicensetypesPostableLicenseDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof activateLicense>>,
	TError,
	{ data?: BodyType<LicensetypesPostableLicenseDTO> },
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

export const getDeleteLicenseMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteLicense>>,
		TError,
		{ pathParams: DeleteLicensePathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteLicense>>,
	TError,
	{ pathParams: DeleteLicensePathParameters },
	TContext
> => {
	const mutationKey = ['deleteLicense'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteLicense>>,
		{ pathParams: DeleteLicensePathParameters }
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
		{ pathParams: DeleteLicensePathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteLicense>>,
	TError,
	{ pathParams: DeleteLicensePathParameters },
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
		enabled: !!id,
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

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get a license.
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

export const getRefreshLicenseMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof refreshLicense>>,
		TError,
		{ pathParams: RefreshLicensePathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof refreshLicense>>,
	TError,
	{ pathParams: RefreshLicensePathParameters },
	TContext
> => {
	const mutationKey = ['refreshLicense'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof refreshLicense>>,
		{ pathParams: RefreshLicensePathParameters }
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
		{ pathParams: RefreshLicensePathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof refreshLicense>>,
	TError,
	{ pathParams: RefreshLicensePathParameters },
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
		url: `/api/v4/orgs/me/license`,
		method: 'GET',
		signal,
	});
};

export const getGetActiveLicenseQueryKey = () => {
	return [`/api/v4/orgs/me/license`] as const;
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

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get the active license.
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
