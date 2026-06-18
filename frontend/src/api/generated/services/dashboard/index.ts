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
	CloneDashboardV2201,
	CloneDashboardV2PathParameters,
	CreateDashboardV2201,
	CreateDashboardView201,
	CreatePublicDashboard201,
	CreatePublicDashboardPathParameters,
	DashboardtypesPatchableDashboardV2DTO,
	DashboardtypesPostableDashboardV2DTO,
	DashboardtypesPostableDashboardViewDTO,
	DashboardtypesPostablePublicDashboardDTO,
	DashboardtypesUpdatableDashboardV2DTO,
	DashboardtypesUpdatablePublicDashboardDTO,
	DeleteDashboardV2PathParameters,
	DeleteDashboardViewPathParameters,
	DeletePublicDashboardPathParameters,
	GetDashboardV2200,
	GetDashboardV2PathParameters,
	GetPublicDashboard200,
	GetPublicDashboardData200,
	GetPublicDashboardDataPathParameters,
	GetPublicDashboardDataV2200,
	GetPublicDashboardDataV2PathParameters,
	GetPublicDashboardPanelQueryRangeV2200,
	GetPublicDashboardPanelQueryRangeV2PathParameters,
	GetPublicDashboardPathParameters,
	GetPublicDashboardWidgetQueryRange200,
	GetPublicDashboardWidgetQueryRangePathParameters,
	ListDashboardViews200,
	ListDashboardsForUserV2200,
	ListDashboardsForUserV2Params,
	ListDashboardsV2200,
	ListDashboardsV2Params,
	LockDashboardV2PathParameters,
	PatchDashboardV2200,
	PatchDashboardV2PathParameters,
	PinDashboardV2PathParameters,
	RenderErrorResponseDTO,
	UnlockDashboardV2PathParameters,
	UnpinDashboardV2PathParameters,
	UpdateDashboardV2200,
	UpdateDashboardV2PathParameters,
	UpdateDashboardView200,
	UpdateDashboardViewPathParameters,
	UpdatePublicDashboardPathParameters,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * This endpoint deletes the public sharing config and disables the public sharing of a dashboard
 * @summary Delete public dashboard
 */
export const deletePublicDashboard = (
	{ id }: DeletePublicDashboardPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/dashboards/${id}/public`,
		method: 'DELETE',
		signal,
	});
};

export const getDeletePublicDashboardMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
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

export type DeletePublicDashboardMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete public dashboard
 */
export const useDeletePublicDashboard = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
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
	return useMutation(getDeletePublicDashboardMutationOptions(options));
};
/**
 * This endpoint returns public sharing config for a dashboard
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
	return [`/api/v1/dashboards/${id}/public`] as const;
};

export const getGetPublicDashboardQueryOptions = <
	TData = Awaited<ReturnType<typeof getPublicDashboard>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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
export type GetPublicDashboardQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get public dashboard
 */

export function useGetPublicDashboard<
	TData = Awaited<ReturnType<typeof getPublicDashboard>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return { ...query, queryKey: queryOptions.queryKey };
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
 * This endpoint creates public sharing config and enables public sharing of the dashboard
 * @summary Create public dashboard
 */
export const createPublicDashboard = (
	{ id }: CreatePublicDashboardPathParameters,
	dashboardtypesPostablePublicDashboardDTO?: BodyType<DashboardtypesPostablePublicDashboardDTO>,
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
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createPublicDashboard>>,
		TError,
		{
			pathParams: CreatePublicDashboardPathParameters;
			data?: BodyType<DashboardtypesPostablePublicDashboardDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createPublicDashboard>>,
	TError,
	{
		pathParams: CreatePublicDashboardPathParameters;
		data?: BodyType<DashboardtypesPostablePublicDashboardDTO>;
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
			data?: BodyType<DashboardtypesPostablePublicDashboardDTO>;
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
export type CreatePublicDashboardMutationBody =
	| BodyType<DashboardtypesPostablePublicDashboardDTO>
	| undefined;
export type CreatePublicDashboardMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create public dashboard
 */
export const useCreatePublicDashboard = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createPublicDashboard>>,
		TError,
		{
			pathParams: CreatePublicDashboardPathParameters;
			data?: BodyType<DashboardtypesPostablePublicDashboardDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createPublicDashboard>>,
	TError,
	{
		pathParams: CreatePublicDashboardPathParameters;
		data?: BodyType<DashboardtypesPostablePublicDashboardDTO>;
	},
	TContext
> => {
	return useMutation(getCreatePublicDashboardMutationOptions(options));
};
/**
 * This endpoint updates the public sharing config for a dashboard
 * @summary Update public dashboard
 */
export const updatePublicDashboard = (
	{ id }: UpdatePublicDashboardPathParameters,
	dashboardtypesUpdatablePublicDashboardDTO?: BodyType<DashboardtypesUpdatablePublicDashboardDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/dashboards/${id}/public`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: dashboardtypesUpdatablePublicDashboardDTO,
		signal,
	});
};

export const getUpdatePublicDashboardMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updatePublicDashboard>>,
		TError,
		{
			pathParams: UpdatePublicDashboardPathParameters;
			data?: BodyType<DashboardtypesUpdatablePublicDashboardDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updatePublicDashboard>>,
	TError,
	{
		pathParams: UpdatePublicDashboardPathParameters;
		data?: BodyType<DashboardtypesUpdatablePublicDashboardDTO>;
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
			data?: BodyType<DashboardtypesUpdatablePublicDashboardDTO>;
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
export type UpdatePublicDashboardMutationBody =
	| BodyType<DashboardtypesUpdatablePublicDashboardDTO>
	| undefined;
export type UpdatePublicDashboardMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update public dashboard
 */
export const useUpdatePublicDashboard = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updatePublicDashboard>>,
		TError,
		{
			pathParams: UpdatePublicDashboardPathParameters;
			data?: BodyType<DashboardtypesUpdatablePublicDashboardDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updatePublicDashboard>>,
	TError,
	{
		pathParams: UpdatePublicDashboardPathParameters;
		data?: BodyType<DashboardtypesUpdatablePublicDashboardDTO>;
	},
	TContext
> => {
	return useMutation(getUpdatePublicDashboardMutationOptions(options));
};
/**
 * This endpoint returns the sanitized dashboard data for public access
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
	return [`/api/v1/public/dashboards/${id}`] as const;
};

export const getGetPublicDashboardDataQueryOptions = <
	TData = Awaited<ReturnType<typeof getPublicDashboardData>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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
export type GetPublicDashboardDataQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get public dashboard data
 */

export function useGetPublicDashboardData<
	TData = Awaited<ReturnType<typeof getPublicDashboardData>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return { ...query, queryKey: queryOptions.queryKey };
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
	return [`/api/v1/public/dashboards/${id}/widgets/${idx}/query_range`] as const;
};

export const getGetPublicDashboardWidgetQueryRangeQueryOptions = <
	TData = Awaited<ReturnType<typeof getPublicDashboardWidgetQueryRange>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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
export type GetPublicDashboardWidgetQueryRangeQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get query range result
 */

export function useGetPublicDashboardWidgetQueryRange<
	TData = Awaited<ReturnType<typeof getPublicDashboardWidgetQueryRange>>,
	TError = ErrorType<RenderErrorResponseDTO>,
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

	return { ...query, queryKey: queryOptions.queryKey };
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

/**
 * Returns every saved view in the calling user's org. Saved views are shared org-wide.
 * @summary List dashboard saved views
 */
export const listDashboardViews = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListDashboardViews200>({
		url: `/api/v2/dashboard_views`,
		method: 'GET',
		signal,
	});
};

export const getListDashboardViewsQueryKey = () => {
	return [`/api/v2/dashboard_views`] as const;
};

export const getListDashboardViewsQueryOptions = <
	TData = Awaited<ReturnType<typeof listDashboardViews>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listDashboardViews>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListDashboardViewsQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listDashboardViews>>
	> = ({ signal }) => listDashboardViews(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listDashboardViews>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListDashboardViewsQueryResult = NonNullable<
	Awaited<ReturnType<typeof listDashboardViews>>
>;
export type ListDashboardViewsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List dashboard saved views
 */

export function useListDashboardViews<
	TData = Awaited<ReturnType<typeof listDashboardViews>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listDashboardViews>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListDashboardViewsQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary List dashboard saved views
 */
export const invalidateListDashboardViews = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListDashboardViewsQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * Persists the calling user's dashboard listing state (query, sort, order) as a named, reusable view shared across the org.
 * @summary Create dashboard saved view
 */
export const createDashboardView = (
	dashboardtypesPostableDashboardViewDTO?: BodyType<DashboardtypesPostableDashboardViewDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateDashboardView201>({
		url: `/api/v2/dashboard_views`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: dashboardtypesPostableDashboardViewDTO,
		signal,
	});
};

export const getCreateDashboardViewMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createDashboardView>>,
		TError,
		{ data?: BodyType<DashboardtypesPostableDashboardViewDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createDashboardView>>,
	TError,
	{ data?: BodyType<DashboardtypesPostableDashboardViewDTO> },
	TContext
> => {
	const mutationKey = ['createDashboardView'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createDashboardView>>,
		{ data?: BodyType<DashboardtypesPostableDashboardViewDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createDashboardView(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateDashboardViewMutationResult = NonNullable<
	Awaited<ReturnType<typeof createDashboardView>>
>;
export type CreateDashboardViewMutationBody =
	| BodyType<DashboardtypesPostableDashboardViewDTO>
	| undefined;
export type CreateDashboardViewMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create dashboard saved view
 */
export const useCreateDashboardView = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createDashboardView>>,
		TError,
		{ data?: BodyType<DashboardtypesPostableDashboardViewDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createDashboardView>>,
	TError,
	{ data?: BodyType<DashboardtypesPostableDashboardViewDTO> },
	TContext
> => {
	return useMutation(getCreateDashboardViewMutationOptions(options));
};
/**
 * Removes a saved view. Saved views are shared org-wide. Deleting a non-existent view returns 404.
 * @summary Delete dashboard saved view
 */
export const deleteDashboardView = (
	{ id }: DeleteDashboardViewPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/dashboard_views/${id}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteDashboardViewMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteDashboardView>>,
		TError,
		{ pathParams: DeleteDashboardViewPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteDashboardView>>,
	TError,
	{ pathParams: DeleteDashboardViewPathParameters },
	TContext
> => {
	const mutationKey = ['deleteDashboardView'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteDashboardView>>,
		{ pathParams: DeleteDashboardViewPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteDashboardView(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteDashboardViewMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteDashboardView>>
>;

export type DeleteDashboardViewMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete dashboard saved view
 */
export const useDeleteDashboardView = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteDashboardView>>,
		TError,
		{ pathParams: DeleteDashboardViewPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteDashboardView>>,
	TError,
	{ pathParams: DeleteDashboardViewPathParameters },
	TContext
> => {
	return useMutation(getDeleteDashboardViewMutationOptions(options));
};
/**
 * Replaces a saved view's name and data. Saved views are shared org-wide.
 * @summary Update dashboard saved view
 */
export const updateDashboardView = (
	{ id }: UpdateDashboardViewPathParameters,
	dashboardtypesPostableDashboardViewDTO?: BodyType<DashboardtypesPostableDashboardViewDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<UpdateDashboardView200>({
		url: `/api/v2/dashboard_views/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: dashboardtypesPostableDashboardViewDTO,
		signal,
	});
};

export const getUpdateDashboardViewMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateDashboardView>>,
		TError,
		{
			pathParams: UpdateDashboardViewPathParameters;
			data?: BodyType<DashboardtypesPostableDashboardViewDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateDashboardView>>,
	TError,
	{
		pathParams: UpdateDashboardViewPathParameters;
		data?: BodyType<DashboardtypesPostableDashboardViewDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateDashboardView'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateDashboardView>>,
		{
			pathParams: UpdateDashboardViewPathParameters;
			data?: BodyType<DashboardtypesPostableDashboardViewDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateDashboardView(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateDashboardViewMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateDashboardView>>
>;
export type UpdateDashboardViewMutationBody =
	| BodyType<DashboardtypesPostableDashboardViewDTO>
	| undefined;
export type UpdateDashboardViewMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update dashboard saved view
 */
export const useUpdateDashboardView = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateDashboardView>>,
		TError,
		{
			pathParams: UpdateDashboardViewPathParameters;
			data?: BodyType<DashboardtypesPostableDashboardViewDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateDashboardView>>,
	TError,
	{
		pathParams: UpdateDashboardViewPathParameters;
		data?: BodyType<DashboardtypesPostableDashboardViewDTO>;
	},
	TContext
> => {
	return useMutation(getUpdateDashboardViewMutationOptions(options));
};
/**
 * Returns a page of v2-shape dashboards for the org. This is the pure, user-independent list — it carries no pin state. Use ListDashboardsForUserV2 for the personalized, pin-aware list. Supports a filter DSL (`query`), sort (`updated_at`/`created_at`/`name`), order (`asc`/`desc`), and offset-based pagination (`limit`/`offset`).
 * @summary List dashboards (v2)
 */
export const listDashboardsV2 = (
	params?: ListDashboardsV2Params,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListDashboardsV2200>({
		url: `/api/v2/dashboards`,
		method: 'GET',
		params,
		signal,
	});
};

export const getListDashboardsV2QueryKey = (
	params?: ListDashboardsV2Params,
) => {
	return [`/api/v2/dashboards`, ...(params ? [params] : [])] as const;
};

export const getListDashboardsV2QueryOptions = <
	TData = Awaited<ReturnType<typeof listDashboardsV2>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: ListDashboardsV2Params,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listDashboardsV2>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListDashboardsV2QueryKey(params);

	const queryFn: QueryFunction<Awaited<ReturnType<typeof listDashboardsV2>>> = ({
		signal,
	}) => listDashboardsV2(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listDashboardsV2>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListDashboardsV2QueryResult = NonNullable<
	Awaited<ReturnType<typeof listDashboardsV2>>
>;
export type ListDashboardsV2QueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List dashboards (v2)
 */

export function useListDashboardsV2<
	TData = Awaited<ReturnType<typeof listDashboardsV2>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: ListDashboardsV2Params,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listDashboardsV2>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListDashboardsV2QueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary List dashboards (v2)
 */
export const invalidateListDashboardsV2 = async (
	queryClient: QueryClient,
	params?: ListDashboardsV2Params,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListDashboardsV2QueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates a dashboard in the v2 format that follows Perses spec.
 * @summary Create dashboard (v2)
 */
export const createDashboardV2 = (
	dashboardtypesPostableDashboardV2DTO?: BodyType<DashboardtypesPostableDashboardV2DTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateDashboardV2201>({
		url: `/api/v2/dashboards`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: dashboardtypesPostableDashboardV2DTO,
		signal,
	});
};

export const getCreateDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createDashboardV2>>,
		TError,
		{ data?: BodyType<DashboardtypesPostableDashboardV2DTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createDashboardV2>>,
	TError,
	{ data?: BodyType<DashboardtypesPostableDashboardV2DTO> },
	TContext
> => {
	const mutationKey = ['createDashboardV2'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createDashboardV2>>,
		{ data?: BodyType<DashboardtypesPostableDashboardV2DTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createDashboardV2(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateDashboardV2MutationResult = NonNullable<
	Awaited<ReturnType<typeof createDashboardV2>>
>;
export type CreateDashboardV2MutationBody =
	| BodyType<DashboardtypesPostableDashboardV2DTO>
	| undefined;
export type CreateDashboardV2MutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create dashboard (v2)
 */
export const useCreateDashboardV2 = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createDashboardV2>>,
		TError,
		{ data?: BodyType<DashboardtypesPostableDashboardV2DTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createDashboardV2>>,
	TError,
	{ data?: BodyType<DashboardtypesPostableDashboardV2DTO> },
	TContext
> => {
	return useMutation(getCreateDashboardV2MutationOptions(options));
};
/**
 * This endpoint deletes a v2-shape dashboard along with its tag relations. Locked dashboards are rejected.
 * @summary Delete dashboard (v2)
 */
export const deleteDashboardV2 = (
	{ id }: DeleteDashboardV2PathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/dashboards/${id}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteDashboardV2>>,
		TError,
		{ pathParams: DeleteDashboardV2PathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteDashboardV2>>,
	TError,
	{ pathParams: DeleteDashboardV2PathParameters },
	TContext
> => {
	const mutationKey = ['deleteDashboardV2'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteDashboardV2>>,
		{ pathParams: DeleteDashboardV2PathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteDashboardV2(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteDashboardV2MutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteDashboardV2>>
>;

export type DeleteDashboardV2MutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete dashboard (v2)
 */
export const useDeleteDashboardV2 = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteDashboardV2>>,
		TError,
		{ pathParams: DeleteDashboardV2PathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteDashboardV2>>,
	TError,
	{ pathParams: DeleteDashboardV2PathParameters },
	TContext
> => {
	return useMutation(getDeleteDashboardV2MutationOptions(options));
};
/**
 * This endpoint returns a v2-shape dashboard.
 * @summary Get dashboard (v2)
 */
export const getDashboardV2 = (
	{ id }: GetDashboardV2PathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetDashboardV2200>({
		url: `/api/v2/dashboards/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetDashboardV2QueryKey = ({
	id,
}: GetDashboardV2PathParameters) => {
	return [`/api/v2/dashboards/${id}`] as const;
};

export const getGetDashboardV2QueryOptions = <
	TData = Awaited<ReturnType<typeof getDashboardV2>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetDashboardV2PathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getDashboardV2>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetDashboardV2QueryKey({ id });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getDashboardV2>>> = ({
		signal,
	}) => getDashboardV2({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getDashboardV2>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetDashboardV2QueryResult = NonNullable<
	Awaited<ReturnType<typeof getDashboardV2>>
>;
export type GetDashboardV2QueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get dashboard (v2)
 */

export function useGetDashboardV2<
	TData = Awaited<ReturnType<typeof getDashboardV2>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetDashboardV2PathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getDashboardV2>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetDashboardV2QueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get dashboard (v2)
 */
export const invalidateGetDashboardV2 = async (
	queryClient: QueryClient,
	{ id }: GetDashboardV2PathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetDashboardV2QueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint applies an RFC 6902 JSON Patch to a v2-shape dashboard. The patch is applied against the postable view of the dashboard (metadata, data, tags), so individual panels, queries, variables, layouts, or tags can be updated without re-sending the rest of the dashboard. Apply is lenient: `remove` on a missing path is a no-op (idempotent) and `add` creates any missing parent objects, rather than failing as strict RFC 6902 would. The resulting dashboard is still validated. Locked dashboards are rejected.
 * @summary Patch dashboard (v2)
 */
export const patchDashboardV2 = (
	{ id }: PatchDashboardV2PathParameters,
	dashboardtypesPatchableDashboardV2DTONull?: BodyType<DashboardtypesPatchableDashboardV2DTO | null> | null,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<PatchDashboardV2200>({
		url: `/api/v2/dashboards/${id}`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		data: dashboardtypesPatchableDashboardV2DTONull,
		signal,
	});
};

export const getPatchDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof patchDashboardV2>>,
		TError,
		{
			pathParams: PatchDashboardV2PathParameters;
			data?: BodyType<DashboardtypesPatchableDashboardV2DTO | null>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof patchDashboardV2>>,
	TError,
	{
		pathParams: PatchDashboardV2PathParameters;
		data?: BodyType<DashboardtypesPatchableDashboardV2DTO | null>;
	},
	TContext
> => {
	const mutationKey = ['patchDashboardV2'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof patchDashboardV2>>,
		{
			pathParams: PatchDashboardV2PathParameters;
			data?: BodyType<DashboardtypesPatchableDashboardV2DTO | null>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return patchDashboardV2(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type PatchDashboardV2MutationResult = NonNullable<
	Awaited<ReturnType<typeof patchDashboardV2>>
>;
export type PatchDashboardV2MutationBody =
	| BodyType<DashboardtypesPatchableDashboardV2DTO | null>
	| undefined;
export type PatchDashboardV2MutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Patch dashboard (v2)
 */
export const usePatchDashboardV2 = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof patchDashboardV2>>,
		TError,
		{
			pathParams: PatchDashboardV2PathParameters;
			data?: BodyType<DashboardtypesPatchableDashboardV2DTO | null>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof patchDashboardV2>>,
	TError,
	{
		pathParams: PatchDashboardV2PathParameters;
		data?: BodyType<DashboardtypesPatchableDashboardV2DTO | null>;
	},
	TContext
> => {
	return useMutation(getPatchDashboardV2MutationOptions(options));
};
/**
 * This endpoint updates a v2-shape dashboard's metadata, data, and tag set. Locked dashboards are rejected.
 * @summary Update dashboard (v2)
 */
export const updateDashboardV2 = (
	{ id }: UpdateDashboardV2PathParameters,
	dashboardtypesUpdatableDashboardV2DTO?: BodyType<DashboardtypesUpdatableDashboardV2DTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<UpdateDashboardV2200>({
		url: `/api/v2/dashboards/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: dashboardtypesUpdatableDashboardV2DTO,
		signal,
	});
};

export const getUpdateDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateDashboardV2>>,
		TError,
		{
			pathParams: UpdateDashboardV2PathParameters;
			data?: BodyType<DashboardtypesUpdatableDashboardV2DTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateDashboardV2>>,
	TError,
	{
		pathParams: UpdateDashboardV2PathParameters;
		data?: BodyType<DashboardtypesUpdatableDashboardV2DTO>;
	},
	TContext
> => {
	const mutationKey = ['updateDashboardV2'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateDashboardV2>>,
		{
			pathParams: UpdateDashboardV2PathParameters;
			data?: BodyType<DashboardtypesUpdatableDashboardV2DTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateDashboardV2(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateDashboardV2MutationResult = NonNullable<
	Awaited<ReturnType<typeof updateDashboardV2>>
>;
export type UpdateDashboardV2MutationBody =
	| BodyType<DashboardtypesUpdatableDashboardV2DTO>
	| undefined;
export type UpdateDashboardV2MutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update dashboard (v2)
 */
export const useUpdateDashboardV2 = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateDashboardV2>>,
		TError,
		{
			pathParams: UpdateDashboardV2PathParameters;
			data?: BodyType<DashboardtypesUpdatableDashboardV2DTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateDashboardV2>>,
	TError,
	{
		pathParams: UpdateDashboardV2PathParameters;
		data?: BodyType<DashboardtypesUpdatableDashboardV2DTO>;
	},
	TContext
> => {
	return useMutation(getUpdateDashboardV2MutationOptions(options));
};
/**
 * This endpoint clones an existing v2-shape dashboard. User and integration dashboards can be cloned; system dashboards are rejected. The clone keeps the source's display name, panels, and tags, but gets a freshly generated unique internal name and is always created as an unlocked user dashboard owned by the caller.
 * @summary Clone dashboard (v2)
 */
export const cloneDashboardV2 = (
	{ id }: CloneDashboardV2PathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CloneDashboardV2201>({
		url: `/api/v2/dashboards/${id}/clone`,
		method: 'POST',
		signal,
	});
};

export const getCloneDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof cloneDashboardV2>>,
		TError,
		{ pathParams: CloneDashboardV2PathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof cloneDashboardV2>>,
	TError,
	{ pathParams: CloneDashboardV2PathParameters },
	TContext
> => {
	const mutationKey = ['cloneDashboardV2'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof cloneDashboardV2>>,
		{ pathParams: CloneDashboardV2PathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return cloneDashboardV2(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type CloneDashboardV2MutationResult = NonNullable<
	Awaited<ReturnType<typeof cloneDashboardV2>>
>;

export type CloneDashboardV2MutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Clone dashboard (v2)
 */
export const useCloneDashboardV2 = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof cloneDashboardV2>>,
		TError,
		{ pathParams: CloneDashboardV2PathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof cloneDashboardV2>>,
	TError,
	{ pathParams: CloneDashboardV2PathParameters },
	TContext
> => {
	return useMutation(getCloneDashboardV2MutationOptions(options));
};
/**
 * This endpoint unlocks a v2-shape dashboard. Only the dashboard's creator or an org admin may lock or unlock.
 * @summary Unlock dashboard (v2)
 */
export const unlockDashboardV2 = (
	{ id }: UnlockDashboardV2PathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/dashboards/${id}/lock`,
		method: 'DELETE',
		signal,
	});
};

export const getUnlockDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof unlockDashboardV2>>,
		TError,
		{ pathParams: UnlockDashboardV2PathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof unlockDashboardV2>>,
	TError,
	{ pathParams: UnlockDashboardV2PathParameters },
	TContext
> => {
	const mutationKey = ['unlockDashboardV2'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof unlockDashboardV2>>,
		{ pathParams: UnlockDashboardV2PathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return unlockDashboardV2(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type UnlockDashboardV2MutationResult = NonNullable<
	Awaited<ReturnType<typeof unlockDashboardV2>>
>;

export type UnlockDashboardV2MutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Unlock dashboard (v2)
 */
export const useUnlockDashboardV2 = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof unlockDashboardV2>>,
		TError,
		{ pathParams: UnlockDashboardV2PathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof unlockDashboardV2>>,
	TError,
	{ pathParams: UnlockDashboardV2PathParameters },
	TContext
> => {
	return useMutation(getUnlockDashboardV2MutationOptions(options));
};
/**
 * This endpoint locks a v2-shape dashboard. Only the dashboard's creator or an org admin may lock or unlock.
 * @summary Lock dashboard (v2)
 */
export const lockDashboardV2 = (
	{ id }: LockDashboardV2PathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/dashboards/${id}/lock`,
		method: 'PUT',
		signal,
	});
};

export const getLockDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof lockDashboardV2>>,
		TError,
		{ pathParams: LockDashboardV2PathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof lockDashboardV2>>,
	TError,
	{ pathParams: LockDashboardV2PathParameters },
	TContext
> => {
	const mutationKey = ['lockDashboardV2'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof lockDashboardV2>>,
		{ pathParams: LockDashboardV2PathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return lockDashboardV2(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type LockDashboardV2MutationResult = NonNullable<
	Awaited<ReturnType<typeof lockDashboardV2>>
>;

export type LockDashboardV2MutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Lock dashboard (v2)
 */
export const useLockDashboardV2 = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof lockDashboardV2>>,
		TError,
		{ pathParams: LockDashboardV2PathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof lockDashboardV2>>,
	TError,
	{ pathParams: LockDashboardV2PathParameters },
	TContext
> => {
	return useMutation(getLockDashboardV2MutationOptions(options));
};
/**
 * This endpoint returns the sanitized v2-shape dashboard data for public access. Each panel query is reduced to a safe field subset, so filters and raw query strings are not exposed.
 * @summary Get public dashboard data (v2)
 */
export const getPublicDashboardDataV2 = (
	{ id }: GetPublicDashboardDataV2PathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetPublicDashboardDataV2200>({
		url: `/api/v2/public/dashboards/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetPublicDashboardDataV2QueryKey = ({
	id,
}: GetPublicDashboardDataV2PathParameters) => {
	return [`/api/v2/public/dashboards/${id}`] as const;
};

export const getGetPublicDashboardDataV2QueryOptions = <
	TData = Awaited<ReturnType<typeof getPublicDashboardDataV2>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetPublicDashboardDataV2PathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getPublicDashboardDataV2>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetPublicDashboardDataV2QueryKey({ id });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getPublicDashboardDataV2>>
	> = ({ signal }) => getPublicDashboardDataV2({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getPublicDashboardDataV2>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetPublicDashboardDataV2QueryResult = NonNullable<
	Awaited<ReturnType<typeof getPublicDashboardDataV2>>
>;
export type GetPublicDashboardDataV2QueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get public dashboard data (v2)
 */

export function useGetPublicDashboardDataV2<
	TData = Awaited<ReturnType<typeof getPublicDashboardDataV2>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetPublicDashboardDataV2PathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getPublicDashboardDataV2>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetPublicDashboardDataV2QueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get public dashboard data (v2)
 */
export const invalidateGetPublicDashboardDataV2 = async (
	queryClient: QueryClient,
	{ id }: GetPublicDashboardDataV2PathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetPublicDashboardDataV2QueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint returns query range results for a panel of a v2-shape public dashboard. The panel is addressed by its key in spec.panels.
 * @summary Get query range result (v2)
 */
export const getPublicDashboardPanelQueryRangeV2 = (
	{ id, key }: GetPublicDashboardPanelQueryRangeV2PathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetPublicDashboardPanelQueryRangeV2200>({
		url: `/api/v2/public/dashboards/${id}/panels/${key}/query_range`,
		method: 'GET',
		signal,
	});
};

export const getGetPublicDashboardPanelQueryRangeV2QueryKey = ({
	id,
	key,
}: GetPublicDashboardPanelQueryRangeV2PathParameters) => {
	return [`/api/v2/public/dashboards/${id}/panels/${key}/query_range`] as const;
};

export const getGetPublicDashboardPanelQueryRangeV2QueryOptions = <
	TData = Awaited<ReturnType<typeof getPublicDashboardPanelQueryRangeV2>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id, key }: GetPublicDashboardPanelQueryRangeV2PathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getPublicDashboardPanelQueryRangeV2>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getGetPublicDashboardPanelQueryRangeV2QueryKey({ id, key });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getPublicDashboardPanelQueryRangeV2>>
	> = ({ signal }) => getPublicDashboardPanelQueryRangeV2({ id, key }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!(id && key),
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getPublicDashboardPanelQueryRangeV2>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetPublicDashboardPanelQueryRangeV2QueryResult = NonNullable<
	Awaited<ReturnType<typeof getPublicDashboardPanelQueryRangeV2>>
>;
export type GetPublicDashboardPanelQueryRangeV2QueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get query range result (v2)
 */

export function useGetPublicDashboardPanelQueryRangeV2<
	TData = Awaited<ReturnType<typeof getPublicDashboardPanelQueryRangeV2>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id, key }: GetPublicDashboardPanelQueryRangeV2PathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getPublicDashboardPanelQueryRangeV2>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetPublicDashboardPanelQueryRangeV2QueryOptions(
		{ id, key },
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get query range result (v2)
 */
export const invalidateGetPublicDashboardPanelQueryRangeV2 = async (
	queryClient: QueryClient,
	{ id, key }: GetPublicDashboardPanelQueryRangeV2PathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetPublicDashboardPanelQueryRangeV2QueryKey({ id, key }) },
		options,
	);

	return queryClient;
};

/**
 * Same as ListDashboardsV2 but personalized for the calling user: each dashboard carries the caller's `pinned` state, and pinned dashboards float to the top of the requested ordering. Supports the same filter DSL, sort, order, and pagination.
 * @summary List dashboards for the current user (v2)
 */
export const listDashboardsForUserV2 = (
	params?: ListDashboardsForUserV2Params,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListDashboardsForUserV2200>({
		url: `/api/v2/users/me/dashboards`,
		method: 'GET',
		params,
		signal,
	});
};

export const getListDashboardsForUserV2QueryKey = (
	params?: ListDashboardsForUserV2Params,
) => {
	return [`/api/v2/users/me/dashboards`, ...(params ? [params] : [])] as const;
};

export const getListDashboardsForUserV2QueryOptions = <
	TData = Awaited<ReturnType<typeof listDashboardsForUserV2>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: ListDashboardsForUserV2Params,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listDashboardsForUserV2>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getListDashboardsForUserV2QueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listDashboardsForUserV2>>
	> = ({ signal }) => listDashboardsForUserV2(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listDashboardsForUserV2>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListDashboardsForUserV2QueryResult = NonNullable<
	Awaited<ReturnType<typeof listDashboardsForUserV2>>
>;
export type ListDashboardsForUserV2QueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List dashboards for the current user (v2)
 */

export function useListDashboardsForUserV2<
	TData = Awaited<ReturnType<typeof listDashboardsForUserV2>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: ListDashboardsForUserV2Params,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listDashboardsForUserV2>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListDashboardsForUserV2QueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary List dashboards for the current user (v2)
 */
export const invalidateListDashboardsForUserV2 = async (
	queryClient: QueryClient,
	params?: ListDashboardsForUserV2Params,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListDashboardsForUserV2QueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * Removes the pin for the calling user. Idempotent — unpinning a dashboard that wasn't pinned still returns 204.
 * @summary Unpin a dashboard for the current user (v2)
 */
export const unpinDashboardV2 = (
	{ id }: UnpinDashboardV2PathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/users/me/dashboards/${id}/pins`,
		method: 'DELETE',
		signal,
	});
};

export const getUnpinDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof unpinDashboardV2>>,
		TError,
		{ pathParams: UnpinDashboardV2PathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof unpinDashboardV2>>,
	TError,
	{ pathParams: UnpinDashboardV2PathParameters },
	TContext
> => {
	const mutationKey = ['unpinDashboardV2'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof unpinDashboardV2>>,
		{ pathParams: UnpinDashboardV2PathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return unpinDashboardV2(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type UnpinDashboardV2MutationResult = NonNullable<
	Awaited<ReturnType<typeof unpinDashboardV2>>
>;

export type UnpinDashboardV2MutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Unpin a dashboard for the current user (v2)
 */
export const useUnpinDashboardV2 = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof unpinDashboardV2>>,
		TError,
		{ pathParams: UnpinDashboardV2PathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof unpinDashboardV2>>,
	TError,
	{ pathParams: UnpinDashboardV2PathParameters },
	TContext
> => {
	return useMutation(getUnpinDashboardV2MutationOptions(options));
};
/**
 * Pins the dashboard for the calling user. A user can pin at most 10 dashboards; pinning when at the limit returns 409. Re-pinning an already-pinned dashboard is a no-op success.
 * @summary Pin a dashboard for the current user (v2)
 */
export const pinDashboardV2 = (
	{ id }: PinDashboardV2PathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/users/me/dashboards/${id}/pins`,
		method: 'PUT',
		signal,
	});
};

export const getPinDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof pinDashboardV2>>,
		TError,
		{ pathParams: PinDashboardV2PathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof pinDashboardV2>>,
	TError,
	{ pathParams: PinDashboardV2PathParameters },
	TContext
> => {
	const mutationKey = ['pinDashboardV2'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof pinDashboardV2>>,
		{ pathParams: PinDashboardV2PathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return pinDashboardV2(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type PinDashboardV2MutationResult = NonNullable<
	Awaited<ReturnType<typeof pinDashboardV2>>
>;

export type PinDashboardV2MutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Pin a dashboard for the current user (v2)
 */
export const usePinDashboardV2 = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof pinDashboardV2>>,
		TError,
		{ pathParams: PinDashboardV2PathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof pinDashboardV2>>,
	TError,
	{ pathParams: PinDashboardV2PathParameters },
	TContext
> => {
	return useMutation(getPinDashboardV2MutationOptions(options));
};
