/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import { useQuery } from 'react-query';
import type {
	InvalidateOptions,
	QueryClient,
	QueryFunction,
	QueryKey,
	UseQueryOptions,
	UseQueryResult,
} from 'react-query';

import type {
	GetOrgContext200,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType } from '../../../generatedAPIInstance';

/**
 * This endpoint returns raw org-level observability signals used to render contextual empty states
 * @summary Get org context for empty states
 */
export const getOrgContext = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetOrgContext200>({
		url: `/api/v1/empty_state/org_context`,
		method: 'GET',
		signal,
	});
};

export const getGetOrgContextQueryKey = () => {
	return [`/api/v1/empty_state/org_context`] as const;
};

export const getGetOrgContextQueryOptions = <
	TData = Awaited<ReturnType<typeof getOrgContext>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getOrgContext>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetOrgContextQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getOrgContext>>> = ({
		signal,
	}) => getOrgContext(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getOrgContext>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetOrgContextQueryResult = NonNullable<
	Awaited<ReturnType<typeof getOrgContext>>
>;
export type GetOrgContextQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get org context for empty states
 */

export function useGetOrgContext<
	TData = Awaited<ReturnType<typeof getOrgContext>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof getOrgContext>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetOrgContextQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get org context for empty states
 */
export const invalidateGetOrgContext = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetOrgContextQueryKey() },
		options,
	);

	return queryClient;
};
