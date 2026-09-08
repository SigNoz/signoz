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
	GetSubscription200,
	RenderErrorResponseDTO,
	SubscriptiontypesPostableSubscriptionDTO,
	UpdateSubscription200,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * This endpoint gets the organization's subscription along with its usage and billing details.
 * @summary Get the subscription.
 */
export const getSubscription = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetSubscription200>({
		url: `/api/v1/subscriptions`,
		method: 'GET',
		signal,
	});
};

export const getGetSubscriptionQueryKey = () => {
	return [`/api/v1/subscriptions`] as const;
};

export const getGetSubscriptionQueryOptions = <
	TData = Awaited<ReturnType<typeof getSubscription>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getSubscription>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetSubscriptionQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getSubscription>>> = ({
		signal,
	}) => getSubscription(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getSubscription>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetSubscriptionQueryResult = NonNullable<
	Awaited<ReturnType<typeof getSubscription>>
>;
export type GetSubscriptionQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get the subscription.
 */

export function useGetSubscription<
	TData = Awaited<ReturnType<typeof getSubscription>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getSubscription>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetSubscriptionQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get the subscription.
 */
export const invalidateGetSubscription = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetSubscriptionQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates a subscription for the organization.
 * @summary Create a subscription.
 */
export const createSubscription = (
	subscriptiontypesPostableSubscriptionDTO?: BodyType<SubscriptiontypesPostableSubscriptionDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateSubscription201>({
		url: `/api/v1/subscriptions`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: subscriptiontypesPostableSubscriptionDTO,
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
		{ data?: BodyType<SubscriptiontypesPostableSubscriptionDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createSubscription>>,
	TError,
	{ data?: BodyType<SubscriptiontypesPostableSubscriptionDTO> },
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
		{ data?: BodyType<SubscriptiontypesPostableSubscriptionDTO> }
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
	| BodyType<SubscriptiontypesPostableSubscriptionDTO>
	| undefined;
export type CreateSubscriptionMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create a subscription.
 */
export const useCreateSubscription = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createSubscription>>,
		TError,
		{ data?: BodyType<SubscriptiontypesPostableSubscriptionDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createSubscription>>,
	TError,
	{ data?: BodyType<SubscriptiontypesPostableSubscriptionDTO> },
	TContext
> => {
	return useMutation(getCreateSubscriptionMutationOptions(options));
};
/**
 * This endpoint updates the organization's subscription.
 * @summary Update the subscription.
 */
export const updateSubscription = (
	subscriptiontypesPostableSubscriptionDTO?: BodyType<SubscriptiontypesPostableSubscriptionDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<UpdateSubscription200>({
		url: `/api/v1/subscriptions`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: subscriptiontypesPostableSubscriptionDTO,
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
		{ data?: BodyType<SubscriptiontypesPostableSubscriptionDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateSubscription>>,
	TError,
	{ data?: BodyType<SubscriptiontypesPostableSubscriptionDTO> },
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
		{ data?: BodyType<SubscriptiontypesPostableSubscriptionDTO> }
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
	| BodyType<SubscriptiontypesPostableSubscriptionDTO>
	| undefined;
export type UpdateSubscriptionMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update the subscription.
 */
export const useUpdateSubscription = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateSubscription>>,
		TError,
		{ data?: BodyType<SubscriptiontypesPostableSubscriptionDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateSubscription>>,
	TError,
	{ data?: BodyType<SubscriptiontypesPostableSubscriptionDTO> },
	TContext
> => {
	return useMutation(getUpdateSubscriptionMutationOptions(options));
};
