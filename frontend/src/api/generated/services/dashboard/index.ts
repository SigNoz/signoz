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
	CreatePublicDashboard201,
	CreatePublicDashboardPathParameters,
	DashboardtypesPostablePublicDashboardDTO,
	DashboardtypesUpdatablePublicDashboardDTO,
	DeletePublicDashboardPathParameters,
	GetPublicDashboard200,
	GetPublicDashboardData200,
	GetPublicDashboardDataPathParameters,
	GetPublicDashboardPathParameters,
	GetPublicDashboardWidgetQueryRange200,
	GetPublicDashboardWidgetQueryRangePathParameters,
	RenderErrorResponseDTO,
	UpdatePublicDashboardPathParameters,
} from '../sigNoz.schemas';

type AwaitedInput<T> = PromiseLike<T> | T;

type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

/**
 * This endpoints deletes the public sharing config and disables the public sharing of a dashboard
 * @summary Delete public dashboard
 */
export const deletePublicDashboard = ({
	id,
}: DeletePublicDashboardPathParameters) => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/dashboards/${id}/public`,
		method: 'DELETE',
	});
};

export const getDeletePublicDashboardMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deletePublicDashboard>>,
		TError,
		{ pathParams: DeletePublicDashboardPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deletePublicDashboard>>,
	TError,
	{ pathParams: DeletePublicDashboardPathParameters },
	TContext
> => {
	const mutationKey = ['deletePublicDashboard'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deletePublicDashboard>>,
		{ pathParams: DeletePublicDashboardPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deletePublicDashboard(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeletePublicDashboardMutationResult = NonNullable<
	Awaited<ReturnType<typeof deletePublicDashboard>>
>;

export type DeletePublicDashboardMutationError = RenderErrorResponseDTO;

/**
 * @summary Delete public dashboard
 */
export const useDeletePublicDashboard = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deletePublicDashboard>>,
		TError,
		{ pathParams: DeletePublicDashboardPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deletePublicDashboard>>,
	TError,
	{ pathParams: DeletePublicDashboardPathParameters },
	TContext
> => {
	const mutationOptions = getDeletePublicDashboardMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoints returns public sharing config for a dashboard
 * @summary Get public dashboard
 */
export const getPublicDashboard = (
	{ id }: GetPublicDashboardPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetPublicDashboard200>({
		url: `/api/v1/dashboards/${id}/public`,
		method: 'GET',
		signal,
	});
};

export const getGetPublicDashboardQueryKey = ({
	id,
}: GetPublicDashboardPathParameters) => {
	return ['getPublicDashboard'] as const;
};

export const getGetPublicDashboardQueryOptions = <
	TData = Awaited<ReturnType<typeof getPublicDashboard>>,
	TError = RenderErrorResponseDTO
>(
	{ id }: GetPublicDashboardPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getPublicDashboard>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetPublicDashboardQueryKey({ id });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getPublicDashboard>>
	> = ({ signal }) => getPublicDashboard({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getPublicDashboard>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetPublicDashboardQueryResult = NonNullable<
	Awaited<ReturnType<typeof getPublicDashboard>>
>;
export type GetPublicDashboardQueryError = RenderErrorResponseDTO;

/**
 * @summary Get public dashboard
 */

export function useGetPublicDashboard<
	TData = Awaited<ReturnType<typeof getPublicDashboard>>,
	TError = RenderErrorResponseDTO
>(
	{ id }: GetPublicDashboardPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getPublicDashboard>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetPublicDashboardQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get public dashboard
 */
export const invalidateGetPublicDashboard = async (
	queryClient: QueryClient,
	{ id }: GetPublicDashboardPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetPublicDashboardQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoints creates public sharing config and enables public sharing of the dashboard
 * @summary Create public dashboard
 */
export const createPublicDashboard = (
	{ id }: CreatePublicDashboardPathParameters,
	dashboardtypesPostablePublicDashboardDTO: DashboardtypesPostablePublicDashboardDTO,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreatePublicDashboard201>({
		url: `/api/v1/dashboards/${id}/public`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: dashboardtypesPostablePublicDashboardDTO,
		signal,
	});
};

export const getCreatePublicDashboardMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createPublicDashboard>>,
		TError,
		{
			pathParams: CreatePublicDashboardPathParameters;
			data: DashboardtypesPostablePublicDashboardDTO;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createPublicDashboard>>,
	TError,
	{
		pathParams: CreatePublicDashboardPathParameters;
		data: DashboardtypesPostablePublicDashboardDTO;
	},
	TContext
> => {
	const mutationKey = ['createPublicDashboard'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createPublicDashboard>>,
		{
			pathParams: CreatePublicDashboardPathParameters;
			data: DashboardtypesPostablePublicDashboardDTO;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return createPublicDashboard(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreatePublicDashboardMutationResult = NonNullable<
	Awaited<ReturnType<typeof createPublicDashboard>>
>;
export type CreatePublicDashboardMutationBody = DashboardtypesPostablePublicDashboardDTO;
export type CreatePublicDashboardMutationError = RenderErrorResponseDTO;

/**
 * @summary Create public dashboard
 */
export const useCreatePublicDashboard = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createPublicDashboard>>,
		TError,
		{
			pathParams: CreatePublicDashboardPathParameters;
			data: DashboardtypesPostablePublicDashboardDTO;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createPublicDashboard>>,
	TError,
	{
		pathParams: CreatePublicDashboardPathParameters;
		data: DashboardtypesPostablePublicDashboardDTO;
	},
	TContext
> => {
	const mutationOptions = getCreatePublicDashboardMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoints updates the public sharing config for a dashboard
 * @summary Update public dashboard
 */
export const updatePublicDashboard = (
	{ id }: UpdatePublicDashboardPathParameters,
	dashboardtypesUpdatablePublicDashboardDTO: DashboardtypesUpdatablePublicDashboardDTO,
) => {
	return GeneratedAPIInstance<string>({
		url: `/api/v1/dashboards/${id}/public`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: dashboardtypesUpdatablePublicDashboardDTO,
	});
};

export const getUpdatePublicDashboardMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updatePublicDashboard>>,
		TError,
		{
			pathParams: UpdatePublicDashboardPathParameters;
			data: DashboardtypesUpdatablePublicDashboardDTO;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updatePublicDashboard>>,
	TError,
	{
		pathParams: UpdatePublicDashboardPathParameters;
		data: DashboardtypesUpdatablePublicDashboardDTO;
	},
	TContext
> => {
	const mutationKey = ['updatePublicDashboard'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updatePublicDashboard>>,
		{
			pathParams: UpdatePublicDashboardPathParameters;
			data: DashboardtypesUpdatablePublicDashboardDTO;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updatePublicDashboard(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdatePublicDashboardMutationResult = NonNullable<
	Awaited<ReturnType<typeof updatePublicDashboard>>
>;
export type UpdatePublicDashboardMutationBody = DashboardtypesUpdatablePublicDashboardDTO;
export type UpdatePublicDashboardMutationError = RenderErrorResponseDTO;

/**
 * @summary Update public dashboard
 */
export const useUpdatePublicDashboard = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updatePublicDashboard>>,
		TError,
		{
			pathParams: UpdatePublicDashboardPathParameters;
			data: DashboardtypesUpdatablePublicDashboardDTO;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updatePublicDashboard>>,
	TError,
	{
		pathParams: UpdatePublicDashboardPathParameters;
		data: DashboardtypesUpdatablePublicDashboardDTO;
	},
	TContext
> => {
	const mutationOptions = getUpdatePublicDashboardMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoints returns the sanitized dashboard data for public access
 * @summary Get public dashboard data
 */
export const getPublicDashboardData = (
	{ id }: GetPublicDashboardDataPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetPublicDashboardData200>({
		url: `/api/v1/public/dashboards/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetPublicDashboardDataQueryKey = ({
	id,
}: GetPublicDashboardDataPathParameters) => {
	return ['getPublicDashboardData'] as const;
};

export const getGetPublicDashboardDataQueryOptions = <
	TData = Awaited<ReturnType<typeof getPublicDashboardData>>,
	TError = RenderErrorResponseDTO
>(
	{ id }: GetPublicDashboardDataPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getPublicDashboardData>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetPublicDashboardDataQueryKey({ id });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getPublicDashboardData>>
	> = ({ signal }) => getPublicDashboardData({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getPublicDashboardData>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetPublicDashboardDataQueryResult = NonNullable<
	Awaited<ReturnType<typeof getPublicDashboardData>>
>;
export type GetPublicDashboardDataQueryError = RenderErrorResponseDTO;

/**
 * @summary Get public dashboard data
 */

export function useGetPublicDashboardData<
	TData = Awaited<ReturnType<typeof getPublicDashboardData>>,
	TError = RenderErrorResponseDTO
>(
	{ id }: GetPublicDashboardDataPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getPublicDashboardData>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetPublicDashboardDataQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get public dashboard data
 */
export const invalidateGetPublicDashboardData = async (
	queryClient: QueryClient,
	{ id }: GetPublicDashboardDataPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetPublicDashboardDataQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint return query range results for a widget of public dashboard
 * @summary Get query range result
 */
export const getPublicDashboardWidgetQueryRange = (
	{ id, idx }: GetPublicDashboardWidgetQueryRangePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetPublicDashboardWidgetQueryRange200>({
		url: `/api/v1/public/dashboards/${id}/widgets/${idx}/query_range`,
		method: 'GET',
		signal,
	});
};

export const getGetPublicDashboardWidgetQueryRangeQueryKey = ({
	id,
	idx,
}: GetPublicDashboardWidgetQueryRangePathParameters) => {
	return ['getPublicDashboardWidgetQueryRange'] as const;
};

export const getGetPublicDashboardWidgetQueryRangeQueryOptions = <
	TData = Awaited<ReturnType<typeof getPublicDashboardWidgetQueryRange>>,
	TError = RenderErrorResponseDTO
>(
	{ id, idx }: GetPublicDashboardWidgetQueryRangePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getPublicDashboardWidgetQueryRange>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getGetPublicDashboardWidgetQueryRangeQueryKey({ id, idx });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getPublicDashboardWidgetQueryRange>>
	> = ({ signal }) => getPublicDashboardWidgetQueryRange({ id, idx }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!(id && idx),
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getPublicDashboardWidgetQueryRange>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetPublicDashboardWidgetQueryRangeQueryResult = NonNullable<
	Awaited<ReturnType<typeof getPublicDashboardWidgetQueryRange>>
>;
export type GetPublicDashboardWidgetQueryRangeQueryError = RenderErrorResponseDTO;

/**
 * @summary Get query range result
 */

export function useGetPublicDashboardWidgetQueryRange<
	TData = Awaited<ReturnType<typeof getPublicDashboardWidgetQueryRange>>,
	TError = RenderErrorResponseDTO
>(
	{ id, idx }: GetPublicDashboardWidgetQueryRangePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getPublicDashboardWidgetQueryRange>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetPublicDashboardWidgetQueryRangeQueryOptions(
		{ id, idx },
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get query range result
 */
export const invalidateGetPublicDashboardWidgetQueryRange = async (
	queryClient: QueryClient,
	{ id, idx }: GetPublicDashboardWidgetQueryRangePathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetPublicDashboardWidgetQueryRangeQueryKey({ id, idx }) },
		options,
	);

	return queryClient;
};
