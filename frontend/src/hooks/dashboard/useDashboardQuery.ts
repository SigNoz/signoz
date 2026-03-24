import { useQuery, UseQueryResult } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import getDashboard from 'api/v1/dashboards/id/get';
import {
	DASHBOARD_CACHE_TIME,
	DASHBOARD_CACHE_TIME_ON_REFRESH_ENABLED,
} from 'constants/queryCacheTime';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { AppState } from 'store/reducers';
import { SuccessResponseV2 } from 'types/api';
import { Dashboard } from 'types/api/dashboard/getAll';
import APIError from 'types/api/error';
import { GlobalReducer } from 'types/reducer/globalTime';

/**
 * Fetches a dashboard by ID. Handles auth gating, cache time based on
 * auto-refresh setting, and surfaces API errors via the error modal.
 */
export function useDashboardQuery(
	dashboardId: string,
): UseQueryResult<SuccessResponseV2<Dashboard>> {
	const { isLoggedIn } = useAppContext();
	const { showErrorModal } = useErrorModal();
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	return useQuery(
		[
			REACT_QUERY_KEY.DASHBOARD_BY_ID,
			dashboardId,
			globalTime.isAutoRefreshDisabled,
		],
		{
			enabled: !!dashboardId && isLoggedIn,
			queryFn: () => getDashboard({ id: dashboardId }),
			refetchOnWindowFocus: false,
			cacheTime: globalTime.isAutoRefreshDisabled
				? DASHBOARD_CACHE_TIME
				: DASHBOARD_CACHE_TIME_ON_REFRESH_ENABLED,
			onError: (error) => {
				showErrorModal(error as APIError);
			},
		},
	);
}
