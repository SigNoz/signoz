import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom-v5-compat';
import getLocalStorageKey from 'api/browser/localstorage/get';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { isValidDashboardDuration } from 'lib/getMinMax';
import { getUnstableCurrentSearchParams } from 'utils/getUnstableCurrentSearchParams';

/** Prepares the dashboard URL before its time selector and panels mount. */
export function useDashboardDefaultTime(
	dashboardId: string,
	duration: string | undefined,
): boolean {
	const { pathname } = useLocation();
	const { safeNavigate } = useSafeNavigate();
	const [initialized, setInitialized] = useState<{
		dashboardId: string;
		pathname: string;
	}>();
	const isInitialized =
		initialized?.dashboardId === dashboardId && initialized.pathname === pathname;

	useEffect(() => {
		if (isInitialized) {
			return;
		}
		const params = getUnstableCurrentSearchParams();
		const hasUrlTime = [
			QueryParams.relativeTime,
			QueryParams.startTime,
			QueryParams.endTime,
		].some((key) => params.has(key));
		const storedTimes = getLocalStorageKey(LOCALSTORAGE.METRICS_TIME_IN_DURATION);
		const routes: Record<string, unknown> = JSON.parse(storedTimes || '{}');

		if (
			!hasUrlTime &&
			!routes[pathname] &&
			duration &&
			isValidDashboardDuration(duration)
		) {
			params.set(QueryParams.relativeTime, duration);
			safeNavigate(`${pathname}?${params.toString()}`, { replace: true });
		}
		setInitialized({ dashboardId, pathname });
	}, [dashboardId, duration, pathname, isInitialized, safeNavigate]);

	return isInitialized;
}
