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
	CreateSubscription201,
	GetHosts200,
	GetSubscriptionUsage200,
	RenderErrorResponseDTO,
	UpdateSubscription200,
	ZeustypesPostableHostDTO,
	ZeustypesPostableProfileDTO,
	ZeustypesPostableSubscriptionDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

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

	return { ...query, queryKey: queryOptions.queryKey };
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

export const getPutHostMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof putHost>>,
		TError,
		{ data?: BodyType<ZeustypesPostableHostDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof putHost>>,
	TError,
	{ data?: BodyType<ZeustypesPostableHostDTO> },
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
		{ data?: BodyType<ZeustypesPostableHostDTO> }
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
		{ data?: BodyType<ZeustypesPostableHostDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof putHost>>,
	TError,
	{ data?: BodyType<ZeustypesPostableHostDTO> },
	TContext
> => {
	return useMutation(getPutHostMutationOptions(options));
};
/**
 * This endpoint gets the metered usage and billing details of the deployment's subscription from zeus.
 * @summary Get subscription usage from Zeus.
 */
export const getSubscriptionUsage = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetSubscriptionUsage200>({
		url: `/api/v2/zeus/meters`,
		method: 'GET',
		signal,
	});
};

export const getGetSubscriptionUsageQueryKey = () => {
	return [`/api/v2/zeus/meters`] as const;
};

export const getGetSubscriptionUsageQueryOptions = <
	TData = Awaited<ReturnType<typeof getSubscriptionUsage>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getSubscriptionUsage>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetSubscriptionUsageQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getSubscriptionUsage>>
	> = ({ signal }) => getSubscriptionUsage(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getSubscriptionUsage>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetSubscriptionUsageQueryResult = NonNullable<
	Awaited<ReturnType<typeof getSubscriptionUsage>>
>;
export type GetSubscriptionUsageQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get subscription usage from Zeus.
 */

export function useGetSubscriptionUsage<
	TData = Awaited<ReturnType<typeof getSubscriptionUsage>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getSubscriptionUsage>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetSubscriptionUsageQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get subscription usage from Zeus.
 */
export const invalidateGetSubscriptionUsage = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetSubscriptionUsageQueryKey() },
		options,
	);

	return queryClient;
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

export const getPutProfileMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof putProfile>>,
		TError,
		{ data?: BodyType<ZeustypesPostableProfileDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof putProfile>>,
	TError,
	{ data?: BodyType<ZeustypesPostableProfileDTO> },
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
		{ data?: BodyType<ZeustypesPostableProfileDTO> }
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
		{ data?: BodyType<ZeustypesPostableProfileDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof putProfile>>,
	TError,
	{ data?: BodyType<ZeustypesPostableProfileDTO> },
	TContext
> => {
	return useMutation(getPutProfileMutationOptions(options));
};
/**
 * This endpoint creates a checkout session in Zeus for the deployment's subscription and returns the redirect URL.
 * @summary Create a checkout session for the subscription.
 */
export const createSubscription = (
	zeustypesPostableSubscriptionDTO?: BodyType<ZeustypesPostableSubscriptionDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateSubscription201>({
		url: `/api/v2/zeus/subscriptions`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: zeustypesPostableSubscriptionDTO,
		signal,
	});
};

export const getCreateSubscriptionMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createSubscription>>,
		TError,
		{ data?: BodyType<ZeustypesPostableSubscriptionDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createSubscription>>,
	TError,
	{ data?: BodyType<ZeustypesPostableSubscriptionDTO> },
	TContext
> => {
	const mutationKey = ['createSubscription'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createSubscription>>,
		{ data?: BodyType<ZeustypesPostableSubscriptionDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createSubscription(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateSubscriptionMutationResult = NonNullable<
	Awaited<ReturnType<typeof createSubscription>>
>;
export type CreateSubscriptionMutationBody =
	| BodyType<ZeustypesPostableSubscriptionDTO>
	| undefined;
export type CreateSubscriptionMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create a checkout session for the subscription.
 */
export const useCreateSubscription = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createSubscription>>,
		TError,
		{ data?: BodyType<ZeustypesPostableSubscriptionDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createSubscription>>,
	TError,
	{ data?: BodyType<ZeustypesPostableSubscriptionDTO> },
	TContext
> => {
	return useMutation(getCreateSubscriptionMutationOptions(options));
};
/**
 * This endpoint creates a billing portal session in Zeus for the deployment's subscription and returns the redirect URL.
 * @summary Create a billing portal session for the subscription.
 */
export const updateSubscription = (
	zeustypesPostableSubscriptionDTO?: BodyType<ZeustypesPostableSubscriptionDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<UpdateSubscription200>({
		url: `/api/v2/zeus/subscriptions`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: zeustypesPostableSubscriptionDTO,
		signal,
	});
};

export const getUpdateSubscriptionMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateSubscription>>,
		TError,
		{ data?: BodyType<ZeustypesPostableSubscriptionDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateSubscription>>,
	TError,
	{ data?: BodyType<ZeustypesPostableSubscriptionDTO> },
	TContext
> => {
	const mutationKey = ['updateSubscription'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateSubscription>>,
		{ data?: BodyType<ZeustypesPostableSubscriptionDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return updateSubscription(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateSubscriptionMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateSubscription>>
>;
export type UpdateSubscriptionMutationBody =
	| BodyType<ZeustypesPostableSubscriptionDTO>
	| undefined;
export type UpdateSubscriptionMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create a billing portal session for the subscription.
 */
export const useUpdateSubscription = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateSubscription>>,
		TError,
		{ data?: BodyType<ZeustypesPostableSubscriptionDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateSubscription>>,
	TError,
	{ data?: BodyType<ZeustypesPostableSubscriptionDTO> },
	TContext
> => {
	return useMutation(getUpdateSubscriptionMutationOptions(options));
};
