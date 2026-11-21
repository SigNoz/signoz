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

import type { GetHosts200 } from '../sigNoz.schemas/getHosts200';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

import type { ZeustypesPostableHostDTO } from '../sigNoz.schemas/zeustypesPostableHostDTO';

import type { ZeustypesPostableProfileDTO } from '../sigNoz.schemas/zeustypesPostableProfileDTO';

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
 * This endpoint gets the host info from zeus.
 * @summary Get host info from Zeus.
 */
export const getHosts = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetHosts200>({
		url: `/api/v2/zeus/hosts`,
		method: 'GET',
		signal,
	});
};

export const getGetHostsQueryKey = () => {
	return [`/api/v2/zeus/hosts`] as const;
};

export const getGetHostsQueryOptions = <
	TData = Awaited<ReturnType<typeof getHosts>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof getHosts>>, TError, TData>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetHostsQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getHosts>>> = ({
		signal,
	}) => getHosts(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getHosts>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetHostsQueryResult = NonNullable<
	Awaited<ReturnType<typeof getHosts>>
>;
export type GetHostsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get host info from Zeus.
 */

export function useGetHosts<
	TData = Awaited<ReturnType<typeof getHosts>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof getHosts>>, TError, TData>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetHostsQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetHosts} query
 */
export const invalidateGetHosts = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetHostsQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint saves the host of a deployment to zeus.
 * @summary Put host in Zeus for a deployment.
 */
export const putHost = (
	zeustypesPostableHostDTO?: BodyType<ZeustypesPostableHostDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/zeus/hosts`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: zeustypesPostableHostDTO,
		signal,
	});
};

export const getPutHostMutationKey = () => ['putHost'] as const;

export const getPutHostMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof putHost>>,
		TError,
		PutHostMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof putHost>>,
	TError,
	PutHostMutationVariables,
	TContext
> => {
	const mutationKey = getPutHostMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof putHost>>,
		PutHostMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return putHost(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type PutHostMutationResult = NonNullable<
	Awaited<ReturnType<typeof putHost>>
>;
export type PutHostMutationBody =
	| BodyType<ZeustypesPostableHostDTO>
	| undefined;
export type PutHostMutationError = ErrorType<RenderErrorResponseDTO>;
export type PutHostMutationVariables = {
	data?: BodyType<ZeustypesPostableHostDTO>;
};

/**
 * @summary Put host in Zeus for a deployment.
 */
export const usePutHost = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof putHost>>,
		TError,
		PutHostMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof putHost>>,
	TError,
	PutHostMutationVariables,
	TContext
> => {
	return useMutation(getPutHostMutationOptions(options));
};
/**
 * This endpoint saves the profile of a deployment to zeus.
 * @summary Put profile in Zeus for a deployment.
 */
export const putProfile = (
	zeustypesPostableProfileDTO?: BodyType<ZeustypesPostableProfileDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/zeus/profiles`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: zeustypesPostableProfileDTO,
		signal,
	});
};

export const getPutProfileMutationKey = () => ['putProfile'] as const;

export const getPutProfileMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof putProfile>>,
		TError,
		PutProfileMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof putProfile>>,
	TError,
	PutProfileMutationVariables,
	TContext
> => {
	const mutationKey = getPutProfileMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof putProfile>>,
		PutProfileMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return putProfile(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type PutProfileMutationResult = NonNullable<
	Awaited<ReturnType<typeof putProfile>>
>;
export type PutProfileMutationBody =
	| BodyType<ZeustypesPostableProfileDTO>
	| undefined;
export type PutProfileMutationError = ErrorType<RenderErrorResponseDTO>;
export type PutProfileMutationVariables = {
	data?: BodyType<ZeustypesPostableProfileDTO>;
};

/**
 * @summary Put profile in Zeus for a deployment.
 */
export const usePutProfile = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof putProfile>>,
		TError,
		PutProfileMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof putProfile>>,
	TError,
	PutProfileMutationVariables,
	TContext
> => {
	return useMutation(getPutProfileMutationOptions(options));
};
