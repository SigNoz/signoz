/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'yarn generate:api'
 * SigNoz
 */
import type {
	InvalidateOptions,
	QueryClient,
	QueryFunction,
	QueryKey,
	UseQueryOptions,
	UseQueryResult,
} from 'react-query';
import { useQuery } from 'react-query';

import type { ErrorType } from '../../../generatedAPIInstance';
import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { GetAlerts200, RenderErrorResponseDTO } from '../sigNoz.schemas';

/**
 * This endpoint returns alerts for the organization
 * @summary Get alerts
 */
export const getAlerts = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<GetAlerts200>({
		url: `/api/v1/alerts`,
		method: 'GET',
		signal,
	});
};

export const getGetAlertsQueryKey = () => {
	return [`/api/v1/alerts`] as const;
};

export const getGetAlertsQueryOptions = <
	TData = Awaited<ReturnType<typeof getAlerts>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof getAlerts>>, TError, TData>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetAlertsQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getAlerts>>> = ({
		signal,
	}) => getAlerts(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof getAlerts>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetAlertsQueryResult = NonNullable<
	Awaited<ReturnType<typeof getAlerts>>
>;
export type GetAlertsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get alerts
 */

export function useGetAlerts<
	TData = Awaited<ReturnType<typeof getAlerts>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof getAlerts>>, TError, TData>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetAlertsQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get alerts
 */
export const invalidateGetAlerts = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetAlertsQueryKey() },
		options,
	);

	return queryClient;
};
