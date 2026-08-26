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
	GetActiveLicense200,
	LicensetypesPostableLicenseDTO,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * This endpoint validates the license key with upstream and activates the license for the organization.
 * @summary Activate a license.
 */
export const activateLicense = (
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
 * This endpoint refreshes the active license of the organization from upstream.
 * @summary Refresh the active license.
 */
export const refreshLicense = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v3/licenses`,
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
		void,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof refreshLicense>>,
	TError,
	void,
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
		void
	> = () => {
		return refreshLicense();
	};

	return { mutationFn, ...mutationOptions };
};

export type RefreshLicenseMutationResult = NonNullable<
	Awaited<ReturnType<typeof refreshLicense>>
>;

export type RefreshLicenseMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Refresh the active license.
 */
export const useRefreshLicense = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof refreshLicense>>,
		TError,
		void,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof refreshLicense>>,
	TError,
	void,
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
		url: `/api/v3/licenses/active`,
		method: 'GET',
		signal,
	});
};

export const getGetActiveLicenseQueryKey = () => {
	return [`/api/v3/licenses/active`] as const;
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
