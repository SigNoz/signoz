import { useQuery, UseQueryResult } from 'react-query';
import getAll from 'api/v1/dashboards/getAll';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { SuccessResponseV2 } from 'types/api';
import { Dashboard } from 'types/api/dashboard/getAll';
import APIError from 'types/api/error';

interface UseGetAllDashboardOptions {
	/**
	 * When false, the hook still subscribes to the React Query cache (so
	 * `data` reflects values populated by other callers and re-renders
	 * reactively) but does not trigger its own fetch on mount. Defaults to
	 * `true` to preserve the always-fetch behavior of the original hook.
	 */
	enabled?: boolean;
	/**
	 * Forwarded to the underlying `useQuery`. Pass `Infinity` (or a long
	 * duration) when the caller only wants to fetch on cache miss and not
	 * trigger a background refetch when fresh data is already cached.
	 */
	staleTime?: number;
}

export const useGetAllDashboard = (
	options?: UseGetAllDashboardOptions,
): UseQueryResult<SuccessResponseV2<Dashboard[]>, APIError> => {
	const { showErrorModal } = useErrorModal();

	return useQuery<SuccessResponseV2<Dashboard[]>, APIError>({
		queryFn: getAll,
		onError: (error) => {
			showErrorModal(error);
		},
		queryKey: REACT_QUERY_KEY.GET_ALL_DASHBOARDS,
		enabled: options?.enabled ?? true,
		...(options?.staleTime !== undefined ? { staleTime: options.staleTime } : {}),
	});
};
