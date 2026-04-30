/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'yarn generate:api'
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
	DashboardtypesStorableDashboardDataDTO,
	GetSystemDashboard200,
	GetSystemDashboardPathParameters,
	RenderErrorResponseDTO,
	ResetSystemDashboard200,
	ResetSystemDashboardPathParameters,
	UpdateSystemDashboard200,
	UpdateSystemDashboardPathParameters,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * This endpoint returns the system dashboard for the callers org keyed by source (e.g. ai-o11y-overview).
 * @summary Get system dashboard
 */
export const getSystemDashboard = (
	{ source }: GetSystemDashboardPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetSystemDashboard200>({
		url: `/api/v1/system/${source}`,
		method: 'GET',
		signal,
	});
};

export const getGetSystemDashboardQueryKey = ({
	source,
}: GetSystemDashboardPathParameters) => {
	return [`/api/v1/system/${source}`] as const;
};

export const getGetSystemDashboardQueryOptions = <
	TData = Awaited<ReturnType<typeof getSystemDashboard>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ source }: GetSystemDashboardPathParameters,
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
		queryOptions?.queryKey ?? getGetSystemDashboardQueryKey({ source });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getSystemDashboard>>
	> = ({ signal }) => getSystemDashboard({ source }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!source,
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
	{ source }: GetSystemDashboardPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getSystemDashboard>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetSystemDashboardQueryOptions({ source }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get system dashboard
 */
export const invalidateGetSystemDashboard = async (
	queryClient: QueryClient,
	{ source }: GetSystemDashboardPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetSystemDashboardQueryKey({ source }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint replaces the system dashboard for the callers org with the provided payload.
 * @summary Update system dashboard
 */
export const updateSystemDashboard = (
	{ source }: UpdateSystemDashboardPathParameters,
	dashboardtypesStorableDashboardDataDTO: BodyType<DashboardtypesStorableDashboardDataDTO>,
) => {
	return GeneratedAPIInstance<UpdateSystemDashboard200>({
		url: `/api/v1/system/${source}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: dashboardtypesStorableDashboardDataDTO,
	});
};

export const getUpdateSystemDashboardMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateSystemDashboard>>,
		TError,
		{
			pathParams: UpdateSystemDashboardPathParameters;
			data: BodyType<DashboardtypesStorableDashboardDataDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateSystemDashboard>>,
	TError,
	{
		pathParams: UpdateSystemDashboardPathParameters;
		data: BodyType<DashboardtypesStorableDashboardDataDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateSystemDashboard'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateSystemDashboard>>,
		{
			pathParams: UpdateSystemDashboardPathParameters;
			data: BodyType<DashboardtypesStorableDashboardDataDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateSystemDashboard(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateSystemDashboardMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateSystemDashboard>>
>;
export type UpdateSystemDashboardMutationBody =
	BodyType<DashboardtypesStorableDashboardDataDTO>;
export type UpdateSystemDashboardMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update system dashboard
 */
export const useUpdateSystemDashboard = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateSystemDashboard>>,
		TError,
		{
			pathParams: UpdateSystemDashboardPathParameters;
			data: BodyType<DashboardtypesStorableDashboardDataDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateSystemDashboard>>,
	TError,
	{
		pathParams: UpdateSystemDashboardPathParameters;
		data: BodyType<DashboardtypesStorableDashboardDataDTO>;
	},
	TContext
> => {
	const mutationOptions = getUpdateSystemDashboardMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This resets edited/updated system dashboard to default system dashboard.
 * @summary Reset system dashboard to defaults
 */
export const resetSystemDashboard = (
	{ source }: ResetSystemDashboardPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ResetSystemDashboard200>({
		url: `/api/v1/system/${source}/reset`,
		method: 'POST',
		signal,
	});
};

export const getResetSystemDashboardMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof resetSystemDashboard>>,
		TError,
		{ pathParams: ResetSystemDashboardPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof resetSystemDashboard>>,
	TError,
	{ pathParams: ResetSystemDashboardPathParameters },
	TContext
> => {
	const mutationKey = ['resetSystemDashboard'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof resetSystemDashboard>>,
		{ pathParams: ResetSystemDashboardPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return resetSystemDashboard(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type ResetSystemDashboardMutationResult = NonNullable<
	Awaited<ReturnType<typeof resetSystemDashboard>>
>;

export type ResetSystemDashboardMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Reset system dashboard to defaults
 */
export const useResetSystemDashboard = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof resetSystemDashboard>>,
		TError,
		{ pathParams: ResetSystemDashboardPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof resetSystemDashboard>>,
	TError,
	{ pathParams: ResetSystemDashboardPathParameters },
	TContext
> => {
	const mutationOptions = getResetSystemDashboardMutationOptions(options);

	return useMutation(mutationOptions);
};
