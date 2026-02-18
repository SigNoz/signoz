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
	GetDeploymentsFromZeus200,
	RenderErrorResponseDTO,
	ZeustypesPostableHostDTO,
	ZeustypesPostableProfileDTO,
} from '../sigNoz.schemas';

type AwaitedInput<T> = PromiseLike<T> | T;

type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

/**
 * This endpoint gets the deployment info from zeus.
 * @summary Get deployments from Zeus.
 */
export const getDeploymentsFromZeus = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetDeploymentsFromZeus200>({
		url: `/api/v2/zeus/deployments`,
		method: 'GET',
		signal,
	});
};

export const getGetDeploymentsFromZeusQueryKey = () => {
	return ['getDeploymentsFromZeus'] as const;
};

export const getGetDeploymentsFromZeusQueryOptions = <
	TData = Awaited<ReturnType<typeof getDeploymentsFromZeus>>,
	TError = RenderErrorResponseDTO
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getDeploymentsFromZeus>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetDeploymentsFromZeusQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getDeploymentsFromZeus>>
	> = ({ signal }) => getDeploymentsFromZeus(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getDeploymentsFromZeus>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetDeploymentsFromZeusQueryResult = NonNullable<
	Awaited<ReturnType<typeof getDeploymentsFromZeus>>
>;
export type GetDeploymentsFromZeusQueryError = RenderErrorResponseDTO;

/**
 * @summary Get deployments from Zeus.
 */

export function useGetDeploymentsFromZeus<
	TData = Awaited<ReturnType<typeof getDeploymentsFromZeus>>,
	TError = RenderErrorResponseDTO
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getDeploymentsFromZeus>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetDeploymentsFromZeusQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get deployments from Zeus.
 */
export const invalidateGetDeploymentsFromZeus = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetDeploymentsFromZeusQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint saves the host of a deployment to zeus.
 * @summary Put host in Zeus for a deployment.
 */
export const putHostInZeus = (
	zeustypesPostableHostDTO: ZeustypesPostableHostDTO,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/zeus/hosts`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: zeustypesPostableHostDTO,
	});
};

export const getPutHostInZeusMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof putHostInZeus>>,
		TError,
		{ data: ZeustypesPostableHostDTO },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof putHostInZeus>>,
	TError,
	{ data: ZeustypesPostableHostDTO },
	TContext
> => {
	const mutationKey = ['putHostInZeus'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof putHostInZeus>>,
		{ data: ZeustypesPostableHostDTO }
	> = (props) => {
		const { data } = props ?? {};

		return putHostInZeus(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type PutHostInZeusMutationResult = NonNullable<
	Awaited<ReturnType<typeof putHostInZeus>>
>;
export type PutHostInZeusMutationBody = ZeustypesPostableHostDTO;
export type PutHostInZeusMutationError = RenderErrorResponseDTO;

/**
 * @summary Put host in Zeus for a deployment.
 */
export const usePutHostInZeus = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof putHostInZeus>>,
		TError,
		{ data: ZeustypesPostableHostDTO },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof putHostInZeus>>,
	TError,
	{ data: ZeustypesPostableHostDTO },
	TContext
> => {
	const mutationOptions = getPutHostInZeusMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint saves the profile of a deployment to zeus.
 * @summary Put profile in Zeus for a deployment.
 */
export const putProfileInZeus = (
	zeustypesPostableProfileDTO: ZeustypesPostableProfileDTO,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/zeus/profiles`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: zeustypesPostableProfileDTO,
	});
};

export const getPutProfileInZeusMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof putProfileInZeus>>,
		TError,
		{ data: ZeustypesPostableProfileDTO },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof putProfileInZeus>>,
	TError,
	{ data: ZeustypesPostableProfileDTO },
	TContext
> => {
	const mutationKey = ['putProfileInZeus'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof putProfileInZeus>>,
		{ data: ZeustypesPostableProfileDTO }
	> = (props) => {
		const { data } = props ?? {};

		return putProfileInZeus(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type PutProfileInZeusMutationResult = NonNullable<
	Awaited<ReturnType<typeof putProfileInZeus>>
>;
export type PutProfileInZeusMutationBody = ZeustypesPostableProfileDTO;
export type PutProfileInZeusMutationError = RenderErrorResponseDTO;

/**
 * @summary Put profile in Zeus for a deployment.
 */
export const usePutProfileInZeus = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof putProfileInZeus>>,
		TError,
		{ data: ZeustypesPostableProfileDTO },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof putProfileInZeus>>,
	TError,
	{ data: ZeustypesPostableProfileDTO },
	TContext
> => {
	const mutationOptions = getPutProfileInZeusMutationOptions(options);

	return useMutation(mutationOptions);
};
