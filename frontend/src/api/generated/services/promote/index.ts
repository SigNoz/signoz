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
	ListPromotedPaths200,
	ListPromotedPathsPathParameters,
	PromotePathsPathParameters,
	PromotetypesPromotePathDTO,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * This endpoint lists the promoted paths of a JSON column. The promotion domain is identified by the telemetry_signal and context path variables, e.g. traces/attribute.
 * @summary List promoted paths
 */
export const listPromotedPaths = (
	{ telemetrySignal, context }: ListPromotedPathsPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListPromotedPaths200>({
		url: `/api/v1/promote_paths/${telemetrySignal}/${context}`,
		method: 'GET',
		signal,
	});
};

export const getListPromotedPathsQueryKey = ({
	telemetrySignal,
	context,
}: ListPromotedPathsPathParameters) => {
	return [`/api/v1/promote_paths/${telemetrySignal}/${context}`] as const;
};

export const getListPromotedPathsQueryOptions = <
	TData = Awaited<ReturnType<typeof listPromotedPaths>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ telemetrySignal, context }: ListPromotedPathsPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listPromotedPaths>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getListPromotedPathsQueryKey({ telemetrySignal, context });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listPromotedPaths>>
	> = ({ signal }) => listPromotedPaths({ telemetrySignal, context }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!(telemetrySignal && context),
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof listPromotedPaths>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListPromotedPathsQueryResult = NonNullable<
	Awaited<ReturnType<typeof listPromotedPaths>>
>;
export type ListPromotedPathsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List promoted paths
 */

export function useListPromotedPaths<
	TData = Awaited<ReturnType<typeof listPromotedPaths>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ telemetrySignal, context }: ListPromotedPathsPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listPromotedPaths>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListPromotedPathsQueryOptions(
		{ telemetrySignal, context },
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary List promoted paths
 */
export const invalidateListPromotedPaths = async (
	queryClient: QueryClient,
	{ telemetrySignal, context }: ListPromotedPathsPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListPromotedPathsQueryKey({ telemetrySignal, context }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint promotes paths of a JSON column to its promoted column. The promotion domain is identified by the telemetry_signal and context path variables, e.g. traces/attribute.
 * @summary Promote paths
 */
export const promotePaths = (
	{ telemetrySignal, context }: PromotePathsPathParameters,
	promotetypesPromotePathDTONull?: BodyType<
		PromotetypesPromotePathDTO[] | null
	> | null,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/promote_paths/${telemetrySignal}/${context}`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: promotetypesPromotePathDTONull,
		signal,
	});
};

export const getPromotePathsMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof promotePaths>>,
		TError,
		{
			pathParams: PromotePathsPathParameters;
			data?: BodyType<PromotetypesPromotePathDTO[] | null>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof promotePaths>>,
	TError,
	{
		pathParams: PromotePathsPathParameters;
		data?: BodyType<PromotetypesPromotePathDTO[] | null>;
	},
	TContext
> => {
	const mutationKey = ['promotePaths'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof promotePaths>>,
		{
			pathParams: PromotePathsPathParameters;
			data?: BodyType<PromotetypesPromotePathDTO[] | null>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return promotePaths(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type PromotePathsMutationResult = NonNullable<
	Awaited<ReturnType<typeof promotePaths>>
>;
export type PromotePathsMutationBody =
	| BodyType<PromotetypesPromotePathDTO[] | null>
	| undefined;
export type PromotePathsMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Promote paths
 */
export const usePromotePaths = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof promotePaths>>,
		TError,
		{
			pathParams: PromotePathsPathParameters;
			data?: BodyType<PromotetypesPromotePathDTO[] | null>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof promotePaths>>,
	TError,
	{
		pathParams: PromotePathsPathParameters;
		data?: BodyType<PromotetypesPromotePathDTO[] | null>;
	},
	TContext
> => {
	return useMutation(getPromotePathsMutationOptions(options));
};
