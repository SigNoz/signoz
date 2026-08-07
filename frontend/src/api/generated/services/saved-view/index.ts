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
	CreateSavedView200,
	DeleteSavedViewPathParameters,
	GetSavedView200,
	GetSavedViewPathParameters,
	ListSavedViews200,
	ListSavedViewsParams,
	RenderErrorResponseDTO,
	SavedviewtypesPostableSavedViewDTO,
	UpdateSavedViewPathParameters,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * Returns saved views for the calling user's org, optionally filtered by source page, name, and category.
 * @summary List saved views
 */
export const listSavedViews = (
	params?: ListSavedViewsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListSavedViews200>({
		url: `/api/v2/saved_views`,
		method: 'GET',
		params,
		signal,
	});
};

export const getListSavedViewsQueryKey = (params?: ListSavedViewsParams) => {
	return [`/api/v2/saved_views`, ...(params ? [params] : [])] as const;
};

export const getListSavedViewsQueryOptions = <
	TData = Awaited<ReturnType<typeof listSavedViews>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: ListSavedViewsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listSavedViews>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListSavedViewsQueryKey(params);

	const queryFn: QueryFunction<Awaited<ReturnType<typeof listSavedViews>>> = ({
		signal,
	}) => listSavedViews(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listSavedViews>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListSavedViewsQueryResult = NonNullable<
	Awaited<ReturnType<typeof listSavedViews>>
>;
export type ListSavedViewsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List saved views
 */

export function useListSavedViews<
	TData = Awaited<ReturnType<typeof listSavedViews>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: ListSavedViewsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listSavedViews>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListSavedViewsQueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary List saved views
 */
export const invalidateListSavedViews = async (
	queryClient: QueryClient,
	params?: ListSavedViewsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListSavedViewsQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * Persists a saved view for the explore page. Returns the id of the created view.
 * @summary Create saved view
 */
export const createSavedView = (
	savedviewtypesPostableSavedViewDTO?: BodyType<SavedviewtypesPostableSavedViewDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateSavedView200>({
		url: `/api/v2/saved_views`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: savedviewtypesPostableSavedViewDTO,
		signal,
	});
};

export const getCreateSavedViewMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createSavedView>>,
		TError,
		{ data?: BodyType<SavedviewtypesPostableSavedViewDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createSavedView>>,
	TError,
	{ data?: BodyType<SavedviewtypesPostableSavedViewDTO> },
	TContext
> => {
	const mutationKey = ['createSavedView'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createSavedView>>,
		{ data?: BodyType<SavedviewtypesPostableSavedViewDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createSavedView(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateSavedViewMutationResult = NonNullable<
	Awaited<ReturnType<typeof createSavedView>>
>;
export type CreateSavedViewMutationBody =
	| BodyType<SavedviewtypesPostableSavedViewDTO>
	| undefined;
export type CreateSavedViewMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create saved view
 */
export const useCreateSavedView = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createSavedView>>,
		TError,
		{ data?: BodyType<SavedviewtypesPostableSavedViewDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createSavedView>>,
	TError,
	{ data?: BodyType<SavedviewtypesPostableSavedViewDTO> },
	TContext
> => {
	return useMutation(getCreateSavedViewMutationOptions(options));
};
/**
 * Deletes a saved view by id.
 * @summary Delete saved view
 */
export const deleteSavedView = (
	{ viewId }: DeleteSavedViewPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/saved_views/${viewId}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteSavedViewMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteSavedView>>,
		TError,
		{ pathParams: DeleteSavedViewPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteSavedView>>,
	TError,
	{ pathParams: DeleteSavedViewPathParameters },
	TContext
> => {
	const mutationKey = ['deleteSavedView'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteSavedView>>,
		{ pathParams: DeleteSavedViewPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteSavedView(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteSavedViewMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteSavedView>>
>;

export type DeleteSavedViewMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete saved view
 */
export const useDeleteSavedView = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteSavedView>>,
		TError,
		{ pathParams: DeleteSavedViewPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteSavedView>>,
	TError,
	{ pathParams: DeleteSavedViewPathParameters },
	TContext
> => {
	return useMutation(getDeleteSavedViewMutationOptions(options));
};
/**
 * Returns a saved view by id.
 * @summary Get saved view
 */
export const getSavedView = (
	{ viewId }: GetSavedViewPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetSavedView200>({
		url: `/api/v2/saved_views/${viewId}`,
		method: 'GET',
		signal,
	});
};

export const getGetSavedViewQueryKey = ({
	viewId,
}: GetSavedViewPathParameters) => {
	return [`/api/v2/saved_views/${viewId}`] as const;
};

export const getGetSavedViewQueryOptions = <
	TData = Awaited<ReturnType<typeof getSavedView>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ viewId }: GetSavedViewPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getSavedView>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetSavedViewQueryKey({ viewId });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getSavedView>>> = ({
		signal,
	}) => getSavedView({ viewId }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!viewId,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getSavedView>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetSavedViewQueryResult = NonNullable<
	Awaited<ReturnType<typeof getSavedView>>
>;
export type GetSavedViewQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get saved view
 */

export function useGetSavedView<
	TData = Awaited<ReturnType<typeof getSavedView>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ viewId }: GetSavedViewPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getSavedView>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetSavedViewQueryOptions({ viewId }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get saved view
 */
export const invalidateGetSavedView = async (
	queryClient: QueryClient,
	{ viewId }: GetSavedViewPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetSavedViewQueryKey({ viewId }) },
		options,
	);

	return queryClient;
};

/**
 * Replaces a saved view's name, tags, and query.
 * @summary Update saved view
 */
export const updateSavedView = (
	{ viewId }: UpdateSavedViewPathParameters,
	savedviewtypesPostableSavedViewDTO?: BodyType<SavedviewtypesPostableSavedViewDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/saved_views/${viewId}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: savedviewtypesPostableSavedViewDTO,
		signal,
	});
};

export const getUpdateSavedViewMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateSavedView>>,
		TError,
		{
			pathParams: UpdateSavedViewPathParameters;
			data?: BodyType<SavedviewtypesPostableSavedViewDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateSavedView>>,
	TError,
	{
		pathParams: UpdateSavedViewPathParameters;
		data?: BodyType<SavedviewtypesPostableSavedViewDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateSavedView'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateSavedView>>,
		{
			pathParams: UpdateSavedViewPathParameters;
			data?: BodyType<SavedviewtypesPostableSavedViewDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateSavedView(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateSavedViewMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateSavedView>>
>;
export type UpdateSavedViewMutationBody =
	| BodyType<SavedviewtypesPostableSavedViewDTO>
	| undefined;
export type UpdateSavedViewMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update saved view
 */
export const useUpdateSavedView = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateSavedView>>,
		TError,
		{
			pathParams: UpdateSavedViewPathParameters;
			data?: BodyType<SavedviewtypesPostableSavedViewDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateSavedView>>,
	TError,
	{
		pathParams: UpdateSavedViewPathParameters;
		data?: BodyType<SavedviewtypesPostableSavedViewDTO>;
	},
	TContext
> => {
	return useMutation(getUpdateSavedViewMutationOptions(options));
};
