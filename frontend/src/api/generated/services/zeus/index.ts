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
	GetHosts200,
	RenderErrorResponseDTO,
	ZeustypesPostableHostDTO,
	ZeustypesPostableProfileDTO,
} from '../sigNoz.schemas';

type AwaitedInput<T> = PromiseLike<T> | T;

type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

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
	return ['getHosts'] as const;
};

export const getGetHostsQueryOptions = <
	TData = Awaited<ReturnType<typeof getHosts>>,
	TError = RenderErrorResponseDTO
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
export type GetHostsQueryError = RenderErrorResponseDTO;

/**
 * @summary Get host info from Zeus.
 */

export function useGetHosts<
	TData = Awaited<ReturnType<typeof getHosts>>,
	TError = RenderErrorResponseDTO
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof getHosts>>, TError, TData>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetHostsQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get host info from Zeus.
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
export const putHost = (zeustypesPostableHostDTO: ZeustypesPostableHostDTO) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/zeus/hosts`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: zeustypesPostableHostDTO,
	});
};

export const getPutHostMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof putHost>>,
		TError,
		{ data: ZeustypesPostableHostDTO },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof putHost>>,
	TError,
	{ data: ZeustypesPostableHostDTO },
	TContext
> => {
	const mutationKey = ['putHost'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof putHost>>,
		{ data: ZeustypesPostableHostDTO }
	> = (props) => {
		const { data } = props ?? {};

		return putHost(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type PutHostMutationResult = NonNullable<
	Awaited<ReturnType<typeof putHost>>
>;
export type PutHostMutationBody = ZeustypesPostableHostDTO;
export type PutHostMutationError = RenderErrorResponseDTO;

/**
 * @summary Put host in Zeus for a deployment.
 */
export const usePutHost = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof putHost>>,
		TError,
		{ data: ZeustypesPostableHostDTO },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof putHost>>,
	TError,
	{ data: ZeustypesPostableHostDTO },
	TContext
> => {
	const mutationOptions = getPutHostMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint saves the profile of a deployment to zeus.
 * @summary Put profile in Zeus for a deployment.
 */
export const putProfile = (
	zeustypesPostableProfileDTO: ZeustypesPostableProfileDTO,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/zeus/profiles`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: zeustypesPostableProfileDTO,
	});
};

export const getPutProfileMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof putProfile>>,
		TError,
		{ data: ZeustypesPostableProfileDTO },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof putProfile>>,
	TError,
	{ data: ZeustypesPostableProfileDTO },
	TContext
> => {
	const mutationKey = ['putProfile'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof putProfile>>,
		{ data: ZeustypesPostableProfileDTO }
	> = (props) => {
		const { data } = props ?? {};

		return putProfile(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type PutProfileMutationResult = NonNullable<
	Awaited<ReturnType<typeof putProfile>>
>;
export type PutProfileMutationBody = ZeustypesPostableProfileDTO;
export type PutProfileMutationError = RenderErrorResponseDTO;

/**
 * @summary Put profile in Zeus for a deployment.
 */
export const usePutProfile = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof putProfile>>,
		TError,
		{ data: ZeustypesPostableProfileDTO },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof putProfile>>,
	TError,
	{ data: ZeustypesPostableProfileDTO },
	TContext
> => {
	const mutationOptions = getPutProfileMutationOptions(options);

	return useMutation(mutationOptions);
};
