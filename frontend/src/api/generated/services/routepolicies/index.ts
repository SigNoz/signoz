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
	AlertmanagertypesPostableRoutePolicyDTO,
	CreateRoutePolicy201,
	DeleteRoutePolicyByIDPathParameters,
	GetAllRoutePolicies200,
	GetRoutePolicyByID200,
	GetRoutePolicyByIDPathParameters,
	RenderErrorResponseDTO,
	UpdateRoutePolicy200,
	UpdateRoutePolicyPathParameters,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

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

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List route policies
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
	alertmanagertypesPostableRoutePolicyDTO: BodyType<AlertmanagertypesPostableRoutePolicyDTO>,
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

export const getCreateRoutePolicyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createRoutePolicy>>,
		TError,
		{ data: BodyType<AlertmanagertypesPostableRoutePolicyDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createRoutePolicy>>,
	TError,
	{ data: BodyType<AlertmanagertypesPostableRoutePolicyDTO> },
	TContext
> => {
	const mutationKey = ['createRoutePolicy'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createRoutePolicy>>,
		{ data: BodyType<AlertmanagertypesPostableRoutePolicyDTO> }
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
	BodyType<AlertmanagertypesPostableRoutePolicyDTO>;
export type CreateRoutePolicyMutationError = ErrorType<RenderErrorResponseDTO>;

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
		{ data: BodyType<AlertmanagertypesPostableRoutePolicyDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createRoutePolicy>>,
	TError,
	{ data: BodyType<AlertmanagertypesPostableRoutePolicyDTO> },
	TContext
> => {
	const mutationOptions = getCreateRoutePolicyMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint deletes a route policy by ID
 * @summary Delete route policy
 */
export const deleteRoutePolicyByID = ({
	id,
}: DeleteRoutePolicyByIDPathParameters) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/route_policies/${id}`,
		method: 'DELETE',
	});
};

export const getDeleteRoutePolicyByIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteRoutePolicyByID>>,
		TError,
		{ pathParams: DeleteRoutePolicyByIDPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteRoutePolicyByID>>,
	TError,
	{ pathParams: DeleteRoutePolicyByIDPathParameters },
	TContext
> => {
	const mutationKey = ['deleteRoutePolicyByID'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteRoutePolicyByID>>,
		{ pathParams: DeleteRoutePolicyByIDPathParameters }
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
		{ pathParams: DeleteRoutePolicyByIDPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteRoutePolicyByID>>,
	TError,
	{ pathParams: DeleteRoutePolicyByIDPathParameters },
	TContext
> => {
	const mutationOptions = getDeleteRoutePolicyByIDMutationOptions(options);

	return useMutation(mutationOptions);
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
		enabled: !!id,
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

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get route policy by ID
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
	alertmanagertypesPostableRoutePolicyDTO: BodyType<AlertmanagertypesPostableRoutePolicyDTO>,
) => {
	return GeneratedAPIInstance<UpdateRoutePolicy200>({
		url: `/api/v1/route_policies/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: alertmanagertypesPostableRoutePolicyDTO,
	});
};

export const getUpdateRoutePolicyMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateRoutePolicy>>,
		TError,
		{
			pathParams: UpdateRoutePolicyPathParameters;
			data: BodyType<AlertmanagertypesPostableRoutePolicyDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateRoutePolicy>>,
	TError,
	{
		pathParams: UpdateRoutePolicyPathParameters;
		data: BodyType<AlertmanagertypesPostableRoutePolicyDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateRoutePolicy'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateRoutePolicy>>,
		{
			pathParams: UpdateRoutePolicyPathParameters;
			data: BodyType<AlertmanagertypesPostableRoutePolicyDTO>;
		}
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
	BodyType<AlertmanagertypesPostableRoutePolicyDTO>;
export type UpdateRoutePolicyMutationError = ErrorType<RenderErrorResponseDTO>;

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
		{
			pathParams: UpdateRoutePolicyPathParameters;
			data: BodyType<AlertmanagertypesPostableRoutePolicyDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateRoutePolicy>>,
	TError,
	{
		pathParams: UpdateRoutePolicyPathParameters;
		data: BodyType<AlertmanagertypesPostableRoutePolicyDTO>;
	},
	TContext
> => {
	const mutationOptions = getUpdateRoutePolicyMutationOptions(options);

	return useMutation(mutationOptions);
};
