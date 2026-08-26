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
	GetSignalQuickFilters200,
	GetSignalQuickFiltersPathParameters,
	ListQuickFilters200,
	QuickfiltertypesUpdatableQuickFiltersDTO,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * Returns the org's quick filters for every signal, each filter as a telemetry field key.
 * @summary List quick filters
 */
export const listQuickFilters = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListQuickFilters200>({
		url: `/api/v2/orgs/me/filters`,
		method: 'GET',
		signal,
	});
};

export const getListQuickFiltersQueryKey = () => {
	return [`/api/v2/orgs/me/filters`] as const;
};

export const getListQuickFiltersQueryOptions = <
	TData = Awaited<ReturnType<typeof listQuickFilters>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listQuickFilters>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListQuickFiltersQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof listQuickFilters>>> = ({
		signal,
	}) => listQuickFilters(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listQuickFilters>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListQuickFiltersQueryResult = NonNullable<
	Awaited<ReturnType<typeof listQuickFilters>>
>;
export type ListQuickFiltersQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List quick filters
 */

export function useListQuickFilters<
	TData = Awaited<ReturnType<typeof listQuickFilters>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listQuickFilters>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListQuickFiltersQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary List quick filters
 */
export const invalidateListQuickFilters = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListQuickFiltersQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * Replaces the org's quick filters for the signal named in the body.
 * @summary Update quick filters
 */
export const updateQuickFilters = (
	quickfiltertypesUpdatableQuickFiltersDTO?: BodyType<QuickfiltertypesUpdatableQuickFiltersDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/orgs/me/filters`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: quickfiltertypesUpdatableQuickFiltersDTO,
		signal,
	});
};

export const getUpdateQuickFiltersMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateQuickFilters>>,
		TError,
		{ data?: BodyType<QuickfiltertypesUpdatableQuickFiltersDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateQuickFilters>>,
	TError,
	{ data?: BodyType<QuickfiltertypesUpdatableQuickFiltersDTO> },
	TContext
> => {
	const mutationKey = ['updateQuickFilters'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateQuickFilters>>,
		{ data?: BodyType<QuickfiltertypesUpdatableQuickFiltersDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return updateQuickFilters(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateQuickFiltersMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateQuickFilters>>
>;
export type UpdateQuickFiltersMutationBody =
	| BodyType<QuickfiltertypesUpdatableQuickFiltersDTO>
	| undefined;
export type UpdateQuickFiltersMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update quick filters
 */
export const useUpdateQuickFilters = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateQuickFilters>>,
		TError,
		{ data?: BodyType<QuickfiltertypesUpdatableQuickFiltersDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateQuickFilters>>,
	TError,
	{ data?: BodyType<QuickfiltertypesUpdatableQuickFiltersDTO> },
	TContext
> => {
	return useMutation(getUpdateQuickFiltersMutationOptions(options));
};
/**
 * Returns the org's quick filters for one signal, each filter as a telemetry field key.
 * @summary Get a signal's quick filters
 */
export const getSignalQuickFilters = (
	{ signalName }: GetSignalQuickFiltersPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetSignalQuickFilters200>({
		url: `/api/v2/orgs/me/filters/${signalName}`,
		method: 'GET',
		signal,
	});
};

export const getGetSignalQuickFiltersQueryKey = ({
	signalName,
}: GetSignalQuickFiltersPathParameters) => {
	return [`/api/v2/orgs/me/filters/${signalName}`] as const;
};

export const getGetSignalQuickFiltersQueryOptions = <
	TData = Awaited<ReturnType<typeof getSignalQuickFilters>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ signalName }: GetSignalQuickFiltersPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getSignalQuickFilters>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetSignalQuickFiltersQueryKey({ signalName });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getSignalQuickFilters>>
	> = ({ signal }) => getSignalQuickFilters({ signalName }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!signalName,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getSignalQuickFilters>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetSignalQuickFiltersQueryResult = NonNullable<
	Awaited<ReturnType<typeof getSignalQuickFilters>>
>;
export type GetSignalQuickFiltersQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get a signal's quick filters
 */

export function useGetSignalQuickFilters<
	TData = Awaited<ReturnType<typeof getSignalQuickFilters>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ signalName }: GetSignalQuickFiltersPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getSignalQuickFilters>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetSignalQuickFiltersQueryOptions(
		{ signalName },
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get a signal's quick filters
 */
export const invalidateGetSignalQuickFilters = async (
	queryClient: QueryClient,
	{ signalName }: GetSignalQuickFiltersPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetSignalQuickFiltersQueryKey({ signalName }) },
		options,
	);

	return queryClient;
};
