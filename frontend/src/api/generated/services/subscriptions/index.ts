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

import type { CreateSubscription201 } from '../sigNoz.schemas/createSubscription201';

import type { GetSubscription200 } from '../sigNoz.schemas/getSubscription200';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

import type { SubscriptiontypesPostableSubscriptionDTO } from '../sigNoz.schemas/subscriptiontypesPostableSubscriptionDTO';

import type { UpdateSubscription200 } from '../sigNoz.schemas/updateSubscription200';

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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetSubscription} query
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

export const getCreateSubscriptionMutationKey = () =>
	['createSubscription'] as const;

export const getCreateSubscriptionMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createSubscription>>,
		TError,
		CreateSubscriptionMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createSubscription>>,
	TError,
	CreateSubscriptionMutationVariables,
	TContext
> => {
	const mutationKey = getCreateSubscriptionMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createSubscription>>,
		CreateSubscriptionMutationVariables
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
export type CreateSubscriptionMutationVariables = {
	data?: BodyType<SubscriptiontypesPostableSubscriptionDTO>;
};

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
		CreateSubscriptionMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createSubscription>>,
	TError,
	CreateSubscriptionMutationVariables,
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

export const getUpdateSubscriptionMutationKey = () =>
	['updateSubscription'] as const;

export const getUpdateSubscriptionMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateSubscription>>,
		TError,
		UpdateSubscriptionMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateSubscription>>,
	TError,
	UpdateSubscriptionMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateSubscriptionMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateSubscription>>,
		UpdateSubscriptionMutationVariables
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
export type UpdateSubscriptionMutationVariables = {
	data?: BodyType<SubscriptiontypesPostableSubscriptionDTO>;
};

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
		UpdateSubscriptionMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateSubscription>>,
	TError,
	UpdateSubscriptionMutationVariables,
	TContext
> => {
	return useMutation(getUpdateSubscriptionMutationOptions(options));
};
