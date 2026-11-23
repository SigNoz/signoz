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

import type { AlertmanagertypesPostableRoutePolicyDTO } from '../sigNoz.schemas/alertmanagertypesPostableRoutePolicyDTO';

import type { CreateRoutePolicy201 } from '../sigNoz.schemas/createRoutePolicy201';

import type { DeleteRoutePolicyByIDPathParameters } from '../sigNoz.schemas/deleteRoutePolicyByIDPathParameters';

import type { GetAllRoutePolicies200 } from '../sigNoz.schemas/getAllRoutePolicies200';

import type { GetRoutePolicyByID200 } from '../sigNoz.schemas/getRoutePolicyByID200';

import type { GetRoutePolicyByIDPathParameters } from '../sigNoz.schemas/getRoutePolicyByIDPathParameters';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

import type { UpdateRoutePolicy200 } from '../sigNoz.schemas/updateRoutePolicy200';

import type { UpdateRoutePolicyPathParameters } from '../sigNoz.schemas/updateRoutePolicyPathParameters';

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
 * This endpoint lists all route policies for the organization
 * @summary List route policies
 */
export const getAllRoutePolicies = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetAllRoutePolicies200>({
		url: `/api/v1/route_policies`,
		method: 'GET',
		signal,
	});
};

export const getGetAllRoutePoliciesQueryKey = () => {
	return [`/api/v1/route_policies`] as const;
};

export const getGetAllRoutePoliciesQueryOptions = <
	TData = Awaited<ReturnType<typeof getAllRoutePolicies>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getAllRoutePolicies>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetAllRoutePoliciesQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getAllRoutePolicies>>
	> = ({ signal }) => getAllRoutePolicies(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getAllRoutePolicies>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetAllRoutePoliciesQueryResult = NonNullable<
	Awaited<ReturnType<typeof getAllRoutePolicies>>
>;
export type GetAllRoutePoliciesQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List route policies
 */

export function useGetAllRoutePolicies<
	TData = Awaited<ReturnType<typeof getAllRoutePolicies>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getAllRoutePolicies>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetAllRoutePoliciesQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetAllRoutePolicies} query
 */
export const invalidateGetAllRoutePolicies = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetAllRoutePoliciesQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates a route policy
 * @summary Create route policy
 */
export const createRoutePolicy = (
	alertmanagertypesPostableRoutePolicyDTO?: BodyType<AlertmanagertypesPostableRoutePolicyDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateRoutePolicy201>({
		url: `/api/v1/route_policies`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: alertmanagertypesPostableRoutePolicyDTO,
		signal,
	});
};

export const getCreateRoutePolicyMutationKey = () =>
	['createRoutePolicy'] as const;

export const getCreateRoutePolicyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createRoutePolicy>>,
		TError,
		CreateRoutePolicyMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createRoutePolicy>>,
	TError,
	CreateRoutePolicyMutationVariables,
	TContext
> => {
	const mutationKey = getCreateRoutePolicyMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createRoutePolicy>>,
		CreateRoutePolicyMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return createRoutePolicy(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateRoutePolicyMutationResult = NonNullable<
	Awaited<ReturnType<typeof createRoutePolicy>>
>;
export type CreateRoutePolicyMutationBody =
	| BodyType<AlertmanagertypesPostableRoutePolicyDTO>
	| undefined;
export type CreateRoutePolicyMutationError = ErrorType<RenderErrorResponseDTO>;
export type CreateRoutePolicyMutationVariables = {
	data?: BodyType<AlertmanagertypesPostableRoutePolicyDTO>;
};

/**
 * @summary Create route policy
 */
export const useCreateRoutePolicy = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createRoutePolicy>>,
		TError,
		CreateRoutePolicyMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createRoutePolicy>>,
	TError,
	CreateRoutePolicyMutationVariables,
	TContext
> => {
	return useMutation(getCreateRoutePolicyMutationOptions(options));
};
/**
 * This endpoint deletes a route policy by ID
 * @summary Delete route policy
 */
export const deleteRoutePolicyByID = (
	{ id }: DeleteRoutePolicyByIDPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/route_policies/${id}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteRoutePolicyByIDMutationKey = () =>
	['deleteRoutePolicyByID'] as const;

export const getDeleteRoutePolicyByIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteRoutePolicyByID>>,
		TError,
		DeleteRoutePolicyByIDMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteRoutePolicyByID>>,
	TError,
	DeleteRoutePolicyByIDMutationVariables,
	TContext
> => {
	const mutationKey = getDeleteRoutePolicyByIDMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteRoutePolicyByID>>,
		DeleteRoutePolicyByIDMutationVariables
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteRoutePolicyByID(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteRoutePolicyByIDMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteRoutePolicyByID>>
>;

export type DeleteRoutePolicyByIDMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type DeleteRoutePolicyByIDMutationVariables = {
	pathParams: DeleteRoutePolicyByIDPathParameters;
};

/**
 * @summary Delete route policy
 */
export const useDeleteRoutePolicyByID = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteRoutePolicyByID>>,
		TError,
		DeleteRoutePolicyByIDMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteRoutePolicyByID>>,
	TError,
	DeleteRoutePolicyByIDMutationVariables,
	TContext
> => {
	return useMutation(getDeleteRoutePolicyByIDMutationOptions(options));
};
/**
 * This endpoint returns a route policy by ID
 * @summary Get route policy by ID
 */
export const getRoutePolicyByID = (
	{ id }: GetRoutePolicyByIDPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetRoutePolicyByID200>({
		url: `/api/v1/route_policies/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetRoutePolicyByIDQueryKey = ({
	id,
}: GetRoutePolicyByIDPathParameters) => {
	return [`/api/v1/route_policies/${id}`] as const;
};

export const getGetRoutePolicyByIDQueryOptions = <
	TData = Awaited<ReturnType<typeof getRoutePolicyByID>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRoutePolicyByIDPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRoutePolicyByID>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetRoutePolicyByIDQueryKey({ id });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getRoutePolicyByID>>
	> = ({ signal }) => getRoutePolicyByID({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: id !== null && id !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getRoutePolicyByID>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetRoutePolicyByIDQueryResult = NonNullable<
	Awaited<ReturnType<typeof getRoutePolicyByID>>
>;
export type GetRoutePolicyByIDQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get route policy by ID
 */

export function useGetRoutePolicyByID<
	TData = Awaited<ReturnType<typeof getRoutePolicyByID>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRoutePolicyByIDPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRoutePolicyByID>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetRoutePolicyByIDQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetRoutePolicyByID} query
 */
export const invalidateGetRoutePolicyByID = async (
	queryClient: QueryClient,
	{ id }: GetRoutePolicyByIDPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetRoutePolicyByIDQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint updates a route policy by ID
 * @summary Update route policy
 */
export const updateRoutePolicy = (
	{ id }: UpdateRoutePolicyPathParameters,
	alertmanagertypesPostableRoutePolicyDTO?: BodyType<AlertmanagertypesPostableRoutePolicyDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<UpdateRoutePolicy200>({
		url: `/api/v1/route_policies/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: alertmanagertypesPostableRoutePolicyDTO,
		signal,
	});
};

export const getUpdateRoutePolicyMutationKey = () =>
	['updateRoutePolicy'] as const;

export const getUpdateRoutePolicyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateRoutePolicy>>,
		TError,
		UpdateRoutePolicyMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateRoutePolicy>>,
	TError,
	UpdateRoutePolicyMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateRoutePolicyMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateRoutePolicy>>,
		UpdateRoutePolicyMutationVariables
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateRoutePolicy(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateRoutePolicyMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateRoutePolicy>>
>;
export type UpdateRoutePolicyMutationBody =
	| BodyType<AlertmanagertypesPostableRoutePolicyDTO>
	| undefined;
export type UpdateRoutePolicyMutationError = ErrorType<RenderErrorResponseDTO>;
export type UpdateRoutePolicyMutationVariables = {
	pathParams: UpdateRoutePolicyPathParameters;
	data?: BodyType<AlertmanagertypesPostableRoutePolicyDTO>;
};

/**
 * @summary Update route policy
 */
export const useUpdateRoutePolicy = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateRoutePolicy>>,
		TError,
		UpdateRoutePolicyMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateRoutePolicy>>,
	TError,
	UpdateRoutePolicyMutationVariables,
	TContext
> => {
	return useMutation(getUpdateRoutePolicyMutationOptions(options));
};
