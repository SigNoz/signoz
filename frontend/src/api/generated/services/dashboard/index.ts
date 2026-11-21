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

import type { CloneDashboardV2201 } from '../sigNoz.schemas/cloneDashboardV2201';

import type { CloneDashboardV2PathParameters } from '../sigNoz.schemas/cloneDashboardV2PathParameters';

import type { CreateDashboardV2201 } from '../sigNoz.schemas/createDashboardV2201';

import type { CreateDashboardView201 } from '../sigNoz.schemas/createDashboardView201';

import type { CreatePublicDashboard201 } from '../sigNoz.schemas/createPublicDashboard201';

import type { CreatePublicDashboardPathParameters } from '../sigNoz.schemas/createPublicDashboardPathParameters';

import type { DashboardtypesPatchableDashboardV2DTO } from '../sigNoz.schemas/dashboardtypesPatchableDashboardV2DTO';

import type { DashboardtypesPostableDashboardV2DTO } from '../sigNoz.schemas/dashboardtypesPostableDashboardV2DTO';

import type { DashboardtypesPostableDashboardViewDTO } from '../sigNoz.schemas/dashboardtypesPostableDashboardViewDTO';

import type { DashboardtypesPostablePublicDashboardDTO } from '../sigNoz.schemas/dashboardtypesPostablePublicDashboardDTO';

import type { DashboardtypesUpdatableDashboardV2DTO } from '../sigNoz.schemas/dashboardtypesUpdatableDashboardV2DTO';

import type { DashboardtypesUpdatablePublicDashboardDTO } from '../sigNoz.schemas/dashboardtypesUpdatablePublicDashboardDTO';

import type { DeleteDashboardV2PathParameters } from '../sigNoz.schemas/deleteDashboardV2PathParameters';

import type { DeleteDashboardViewPathParameters } from '../sigNoz.schemas/deleteDashboardViewPathParameters';

import type { DeletePublicDashboardPathParameters } from '../sigNoz.schemas/deletePublicDashboardPathParameters';

import type { GetDashboardV2200 } from '../sigNoz.schemas/getDashboardV2200';

import type { GetDashboardV2PathParameters } from '../sigNoz.schemas/getDashboardV2PathParameters';

import type { GetPublicDashboard200 } from '../sigNoz.schemas/getPublicDashboard200';

import type { GetPublicDashboardDataV2200 } from '../sigNoz.schemas/getPublicDashboardDataV2200';

import type { GetPublicDashboardDataV2PathParameters } from '../sigNoz.schemas/getPublicDashboardDataV2PathParameters';

import type { GetPublicDashboardPanelQueryRangeV2200 } from '../sigNoz.schemas/getPublicDashboardPanelQueryRangeV2200';

import type { GetPublicDashboardPanelQueryRangeV2Params } from '../sigNoz.schemas/getPublicDashboardPanelQueryRangeV2Params';

import type { GetPublicDashboardPanelQueryRangeV2PathParameters } from '../sigNoz.schemas/getPublicDashboardPanelQueryRangeV2PathParameters';

import type { GetPublicDashboardPathParameters } from '../sigNoz.schemas/getPublicDashboardPathParameters';

import type { GetSystemDashboard200 } from '../sigNoz.schemas/getSystemDashboard200';

import type { GetSystemDashboardPathParameters } from '../sigNoz.schemas/getSystemDashboardPathParameters';

import type { ListDashboardViews200 } from '../sigNoz.schemas/listDashboardViews200';

import type { ListDashboardsForUserV2200 } from '../sigNoz.schemas/listDashboardsForUserV2200';

import type { ListDashboardsForUserV2Params } from '../sigNoz.schemas/listDashboardsForUserV2Params';

import type { ListDashboardsV2200 } from '../sigNoz.schemas/listDashboardsV2200';

import type { ListDashboardsV2Params } from '../sigNoz.schemas/listDashboardsV2Params';

import type { LockDashboardV2PathParameters } from '../sigNoz.schemas/lockDashboardV2PathParameters';

import type { MigrateDashboardV2200 } from '../sigNoz.schemas/migrateDashboardV2200';

import type { MigrateDashboardV2PathParameters } from '../sigNoz.schemas/migrateDashboardV2PathParameters';

import type { PatchDashboardV2200 } from '../sigNoz.schemas/patchDashboardV2200';

import type { PatchDashboardV2PathParameters } from '../sigNoz.schemas/patchDashboardV2PathParameters';

import type { PinDashboardV2PathParameters } from '../sigNoz.schemas/pinDashboardV2PathParameters';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

import type { UnlockDashboardV2PathParameters } from '../sigNoz.schemas/unlockDashboardV2PathParameters';

import type { UnpinDashboardV2PathParameters } from '../sigNoz.schemas/unpinDashboardV2PathParameters';

import type { UpdateDashboardV2200 } from '../sigNoz.schemas/updateDashboardV2200';

import type { UpdateDashboardV2PathParameters } from '../sigNoz.schemas/updateDashboardV2PathParameters';

import type { UpdateDashboardView200 } from '../sigNoz.schemas/updateDashboardView200';

import type { UpdateDashboardViewPathParameters } from '../sigNoz.schemas/updateDashboardViewPathParameters';

import type { UpdatePublicDashboardPathParameters } from '../sigNoz.schemas/updatePublicDashboardPathParameters';

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

export const getDeletePublicDashboardMutationKey = () =>
	['deletePublicDashboard'] as const;

export const getDeletePublicDashboardMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deletePublicDashboard>>,
		TError,
		DeletePublicDashboardMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deletePublicDashboard>>,
	TError,
	DeletePublicDashboardMutationVariables,
	TContext
> => {
	const mutationKey = getDeletePublicDashboardMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deletePublicDashboard>>,
		DeletePublicDashboardMutationVariables
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
export type DeletePublicDashboardMutationVariables = {
	pathParams: DeletePublicDashboardPathParameters;
};

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
		DeletePublicDashboardMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deletePublicDashboard>>,
	TError,
	DeletePublicDashboardMutationVariables,
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
		enabled: id !== null && id !== undefined,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetPublicDashboard} query
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

export const getCreatePublicDashboardMutationKey = () =>
	['createPublicDashboard'] as const;

export const getCreatePublicDashboardMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createPublicDashboard>>,
		TError,
		CreatePublicDashboardMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createPublicDashboard>>,
	TError,
	CreatePublicDashboardMutationVariables,
	TContext
> => {
	const mutationKey = getCreatePublicDashboardMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createPublicDashboard>>,
		CreatePublicDashboardMutationVariables
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
export type CreatePublicDashboardMutationVariables = {
	pathParams: CreatePublicDashboardPathParameters;
	data?: BodyType<DashboardtypesPostablePublicDashboardDTO>;
};

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
		CreatePublicDashboardMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createPublicDashboard>>,
	TError,
	CreatePublicDashboardMutationVariables,
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

export const getUpdatePublicDashboardMutationKey = () =>
	['updatePublicDashboard'] as const;

export const getUpdatePublicDashboardMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updatePublicDashboard>>,
		TError,
		UpdatePublicDashboardMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updatePublicDashboard>>,
	TError,
	UpdatePublicDashboardMutationVariables,
	TContext
> => {
	const mutationKey = getUpdatePublicDashboardMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updatePublicDashboard>>,
		UpdatePublicDashboardMutationVariables
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
export type UpdatePublicDashboardMutationVariables = {
	pathParams: UpdatePublicDashboardPathParameters;
	data?: BodyType<DashboardtypesUpdatablePublicDashboardDTO>;
};

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
		UpdatePublicDashboardMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updatePublicDashboard>>,
	TError,
	UpdatePublicDashboardMutationVariables,
	TContext
> => {
	return useMutation(getUpdatePublicDashboardMutationOptions(options));
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListDashboardViews} query
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

export const getCreateDashboardViewMutationKey = () =>
	['createDashboardView'] as const;

export const getCreateDashboardViewMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createDashboardView>>,
		TError,
		CreateDashboardViewMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createDashboardView>>,
	TError,
	CreateDashboardViewMutationVariables,
	TContext
> => {
	const mutationKey = getCreateDashboardViewMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createDashboardView>>,
		CreateDashboardViewMutationVariables
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
export type CreateDashboardViewMutationVariables = {
	data?: BodyType<DashboardtypesPostableDashboardViewDTO>;
};

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
		CreateDashboardViewMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createDashboardView>>,
	TError,
	CreateDashboardViewMutationVariables,
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

export const getDeleteDashboardViewMutationKey = () =>
	['deleteDashboardView'] as const;

export const getDeleteDashboardViewMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteDashboardView>>,
		TError,
		DeleteDashboardViewMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteDashboardView>>,
	TError,
	DeleteDashboardViewMutationVariables,
	TContext
> => {
	const mutationKey = getDeleteDashboardViewMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteDashboardView>>,
		DeleteDashboardViewMutationVariables
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
export type DeleteDashboardViewMutationVariables = {
	pathParams: DeleteDashboardViewPathParameters;
};

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
		DeleteDashboardViewMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteDashboardView>>,
	TError,
	DeleteDashboardViewMutationVariables,
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

export const getUpdateDashboardViewMutationKey = () =>
	['updateDashboardView'] as const;

export const getUpdateDashboardViewMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateDashboardView>>,
		TError,
		UpdateDashboardViewMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateDashboardView>>,
	TError,
	UpdateDashboardViewMutationVariables,
	TContext
> => {
	const mutationKey = getUpdateDashboardViewMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateDashboardView>>,
		UpdateDashboardViewMutationVariables
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
export type UpdateDashboardViewMutationVariables = {
	pathParams: UpdateDashboardViewPathParameters;
	data?: BodyType<DashboardtypesPostableDashboardViewDTO>;
};

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
		UpdateDashboardViewMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateDashboardView>>,
	TError,
	UpdateDashboardViewMutationVariables,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListDashboardsV2} query
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

export const getCreateDashboardV2MutationKey = () =>
	['createDashboardV2'] as const;

export const getCreateDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createDashboardV2>>,
		TError,
		CreateDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createDashboardV2>>,
	TError,
	CreateDashboardV2MutationVariables,
	TContext
> => {
	const mutationKey = getCreateDashboardV2MutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createDashboardV2>>,
		CreateDashboardV2MutationVariables
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
export type CreateDashboardV2MutationVariables = {
	data?: BodyType<DashboardtypesPostableDashboardV2DTO>;
};

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
		CreateDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createDashboardV2>>,
	TError,
	CreateDashboardV2MutationVariables,
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

export const getDeleteDashboardV2MutationKey = () =>
	['deleteDashboardV2'] as const;

export const getDeleteDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteDashboardV2>>,
		TError,
		DeleteDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteDashboardV2>>,
	TError,
	DeleteDashboardV2MutationVariables,
	TContext
> => {
	const mutationKey = getDeleteDashboardV2MutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteDashboardV2>>,
		DeleteDashboardV2MutationVariables
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
export type DeleteDashboardV2MutationVariables = {
	pathParams: DeleteDashboardV2PathParameters;
};

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
		DeleteDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteDashboardV2>>,
	TError,
	DeleteDashboardV2MutationVariables,
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
		enabled: id !== null && id !== undefined,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetDashboardV2} query
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

export const getPatchDashboardV2MutationKey = () =>
	['patchDashboardV2'] as const;

export const getPatchDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof patchDashboardV2>>,
		TError,
		PatchDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof patchDashboardV2>>,
	TError,
	PatchDashboardV2MutationVariables,
	TContext
> => {
	const mutationKey = getPatchDashboardV2MutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof patchDashboardV2>>,
		PatchDashboardV2MutationVariables
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
export type PatchDashboardV2MutationVariables = {
	pathParams: PatchDashboardV2PathParameters;
	data?: BodyType<DashboardtypesPatchableDashboardV2DTO | null>;
};

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
		PatchDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof patchDashboardV2>>,
	TError,
	PatchDashboardV2MutationVariables,
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

export const getUpdateDashboardV2MutationKey = () =>
	['updateDashboardV2'] as const;

export const getUpdateDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateDashboardV2>>,
		TError,
		UpdateDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateDashboardV2>>,
	TError,
	UpdateDashboardV2MutationVariables,
	TContext
> => {
	const mutationKey = getUpdateDashboardV2MutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateDashboardV2>>,
		UpdateDashboardV2MutationVariables
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
export type UpdateDashboardV2MutationVariables = {
	pathParams: UpdateDashboardV2PathParameters;
	data?: BodyType<DashboardtypesUpdatableDashboardV2DTO>;
};

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
		UpdateDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateDashboardV2>>,
	TError,
	UpdateDashboardV2MutationVariables,
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

export const getCloneDashboardV2MutationKey = () =>
	['cloneDashboardV2'] as const;

export const getCloneDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof cloneDashboardV2>>,
		TError,
		CloneDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof cloneDashboardV2>>,
	TError,
	CloneDashboardV2MutationVariables,
	TContext
> => {
	const mutationKey = getCloneDashboardV2MutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof cloneDashboardV2>>,
		CloneDashboardV2MutationVariables
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
export type CloneDashboardV2MutationVariables = {
	pathParams: CloneDashboardV2PathParameters;
};

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
		CloneDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof cloneDashboardV2>>,
	TError,
	CloneDashboardV2MutationVariables,
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

export const getUnlockDashboardV2MutationKey = () =>
	['unlockDashboardV2'] as const;

export const getUnlockDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof unlockDashboardV2>>,
		TError,
		UnlockDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof unlockDashboardV2>>,
	TError,
	UnlockDashboardV2MutationVariables,
	TContext
> => {
	const mutationKey = getUnlockDashboardV2MutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof unlockDashboardV2>>,
		UnlockDashboardV2MutationVariables
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
export type UnlockDashboardV2MutationVariables = {
	pathParams: UnlockDashboardV2PathParameters;
};

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
		UnlockDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof unlockDashboardV2>>,
	TError,
	UnlockDashboardV2MutationVariables,
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

export const getLockDashboardV2MutationKey = () => ['lockDashboardV2'] as const;

export const getLockDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof lockDashboardV2>>,
		TError,
		LockDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof lockDashboardV2>>,
	TError,
	LockDashboardV2MutationVariables,
	TContext
> => {
	const mutationKey = getLockDashboardV2MutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof lockDashboardV2>>,
		LockDashboardV2MutationVariables
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
export type LockDashboardV2MutationVariables = {
	pathParams: LockDashboardV2PathParameters;
};

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
		LockDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof lockDashboardV2>>,
	TError,
	LockDashboardV2MutationVariables,
	TContext
> => {
	return useMutation(getLockDashboardV2MutationOptions(options));
};
/**
 * This endpoint retries the v1→v2 (Perses) migration on a dashboard still stored in the v1 schema and returns the v2-shape result. It is idempotent: a dashboard already in the v2 schema is returned unchanged.
 * @summary Migrate dashboard to v2
 */
export const migrateDashboardV2 = (
	{ id }: MigrateDashboardV2PathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<MigrateDashboardV2200>({
		url: `/api/v2/dashboards/${id}/migrate`,
		method: 'POST',
		signal,
	});
};

export const getMigrateDashboardV2MutationKey = () =>
	['migrateDashboardV2'] as const;

export const getMigrateDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof migrateDashboardV2>>,
		TError,
		MigrateDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof migrateDashboardV2>>,
	TError,
	MigrateDashboardV2MutationVariables,
	TContext
> => {
	const mutationKey = getMigrateDashboardV2MutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof migrateDashboardV2>>,
		MigrateDashboardV2MutationVariables
	> = (props) => {
		const { pathParams } = props ?? {};

		return migrateDashboardV2(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type MigrateDashboardV2MutationResult = NonNullable<
	Awaited<ReturnType<typeof migrateDashboardV2>>
>;

export type MigrateDashboardV2MutationError = ErrorType<RenderErrorResponseDTO>;
export type MigrateDashboardV2MutationVariables = {
	pathParams: MigrateDashboardV2PathParameters;
};

/**
 * @summary Migrate dashboard to v2
 */
export const useMigrateDashboardV2 = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof migrateDashboardV2>>,
		TError,
		MigrateDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof migrateDashboardV2>>,
	TError,
	MigrateDashboardV2MutationVariables,
	TContext
> => {
	return useMutation(getMigrateDashboardV2MutationOptions(options));
};
/**
 * Returns a dashboard SigNoz ships and owns, addressed by its stable definition name (e.g. `ai-o11y-overview`) rather than its id. System dashboards are read-only and upgraded through releases. The dashboard's own `name` field carries a reserved prefix that the path segment must not include.
 * @summary Get system dashboard
 */
export const getSystemDashboard = (
	{ name }: GetSystemDashboardPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetSystemDashboard200>({
		url: `/api/v2/dashboards/system/${name}`,
		method: 'GET',
		signal,
	});
};

export const getGetSystemDashboardQueryKey = ({
	name,
}: GetSystemDashboardPathParameters) => {
	return [`/api/v2/dashboards/system/${name}`] as const;
};

export const getGetSystemDashboardQueryOptions = <
	TData = Awaited<ReturnType<typeof getSystemDashboard>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ name }: GetSystemDashboardPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getSystemDashboard>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetSystemDashboardQueryKey({ name });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getSystemDashboard>>
	> = ({ signal }) => getSystemDashboard({ name }, signal);

	return {
		queryKey,
		queryFn,
		enabled: name !== null && name !== undefined,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getSystemDashboard>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetSystemDashboardQueryResult = NonNullable<
	Awaited<ReturnType<typeof getSystemDashboard>>
>;
export type GetSystemDashboardQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get system dashboard
 */

export function useGetSystemDashboard<
	TData = Awaited<ReturnType<typeof getSystemDashboard>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ name }: GetSystemDashboardPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getSystemDashboard>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetSystemDashboardQueryOptions({ name }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetSystemDashboard} query
 */
export const invalidateGetSystemDashboard = async (
	queryClient: QueryClient,
	{ name }: GetSystemDashboardPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetSystemDashboardQueryKey({ name }) },
		options,
	);

	return queryClient;
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
		enabled: id !== null && id !== undefined,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetPublicDashboardDataV2} query
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
	params?: GetPublicDashboardPanelQueryRangeV2Params,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetPublicDashboardPanelQueryRangeV2200>({
		url: `/api/v2/public/dashboards/${id}/panels/${key}/query_range`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetPublicDashboardPanelQueryRangeV2QueryKey = (
	{ id, key }: GetPublicDashboardPanelQueryRangeV2PathParameters,
	params?: GetPublicDashboardPanelQueryRangeV2Params,
) => {
	return [
		`/api/v2/public/dashboards/${id}/panels/${key}/query_range`,
		...(params ? [params] : []),
	] as const;
};

export const getGetPublicDashboardPanelQueryRangeV2QueryOptions = <
	TData = Awaited<ReturnType<typeof getPublicDashboardPanelQueryRangeV2>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id, key }: GetPublicDashboardPanelQueryRangeV2PathParameters,
	params?: GetPublicDashboardPanelQueryRangeV2Params,
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
		getGetPublicDashboardPanelQueryRangeV2QueryKey({ id, key }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getPublicDashboardPanelQueryRangeV2>>
	> = ({ signal }) =>
		getPublicDashboardPanelQueryRangeV2({ id, key }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: id !== null && id !== undefined && key !== null && key !== undefined,
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
	params?: GetPublicDashboardPanelQueryRangeV2Params,
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
		params,
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetPublicDashboardPanelQueryRangeV2} query
 */
export const invalidateGetPublicDashboardPanelQueryRangeV2 = async (
	queryClient: QueryClient,
	{ id, key }: GetPublicDashboardPanelQueryRangeV2PathParameters,
	params?: GetPublicDashboardPanelQueryRangeV2Params,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{
			queryKey: getGetPublicDashboardPanelQueryRangeV2QueryKey(
				{ id, key },
				params,
			),
		},
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListDashboardsForUserV2} query
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

export const getUnpinDashboardV2MutationKey = () =>
	['unpinDashboardV2'] as const;

export const getUnpinDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof unpinDashboardV2>>,
		TError,
		UnpinDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof unpinDashboardV2>>,
	TError,
	UnpinDashboardV2MutationVariables,
	TContext
> => {
	const mutationKey = getUnpinDashboardV2MutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof unpinDashboardV2>>,
		UnpinDashboardV2MutationVariables
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
export type UnpinDashboardV2MutationVariables = {
	pathParams: UnpinDashboardV2PathParameters;
};

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
		UnpinDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof unpinDashboardV2>>,
	TError,
	UnpinDashboardV2MutationVariables,
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

export const getPinDashboardV2MutationKey = () => ['pinDashboardV2'] as const;

export const getPinDashboardV2MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof pinDashboardV2>>,
		TError,
		PinDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof pinDashboardV2>>,
	TError,
	PinDashboardV2MutationVariables,
	TContext
> => {
	const mutationKey = getPinDashboardV2MutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof pinDashboardV2>>,
		PinDashboardV2MutationVariables
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
export type PinDashboardV2MutationVariables = {
	pathParams: PinDashboardV2PathParameters;
};

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
		PinDashboardV2MutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof pinDashboardV2>>,
	TError,
	PinDashboardV2MutationVariables,
	TContext
> => {
	return useMutation(getPinDashboardV2MutationOptions(options));
};
