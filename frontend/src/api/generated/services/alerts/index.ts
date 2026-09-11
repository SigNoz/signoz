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

import type { GetAlerts200, RenderErrorResponseDTO } from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType } from '../../../generatedAPIInstance';

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
	TError = ErrorType<RenderErrorResponseDTO>,
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
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof getAlerts>>, TError, TData>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetAlertsQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
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
