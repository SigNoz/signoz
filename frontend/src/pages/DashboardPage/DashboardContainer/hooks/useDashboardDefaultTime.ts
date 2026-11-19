import { useEffect, useRef, useState } from 'react';
// eslint-disable-next-line no-restricted-imports -- TODO: migrate global time dispatch off redux
import { useDispatch } from 'react-redux';
import { QueryParams } from 'constants/query';
import { getDefaultOption } from 'container/TopNav/DateTimeSelectionV2/constants';
import type { Time } from 'container/TopNav/DateTimeSelectionV2/types';
import { useAppLocation } from 'lib/router/useAppLocation';
import { useAppNavigate } from 'lib/router/useAppNavigate';
import { UpdateTimeInterval } from 'store/actions';
import { getUnstableCurrentSearchParams } from 'utils/getUnstableCurrentSearchParams';
import { hasPersistedTimeForRoute } from 'utils/metricsTimeStorageUtils';

import { toPickerRelativeTime } from '../utils/dashboardDuration';

/**
 * Prepares the dashboard URL before its time selector and panels mount, and
 * moves a viewer still on the previous default to a changed one.
 */
export function useDashboardDefaultTime(
	dashboardId: string,
	duration: string | undefined,
): boolean {
	const { pathname } = useAppLocation();
	const navigate = useAppNavigate();
	const dispatch = useDispatch();
	const previousDuration = useRef(duration);
	const [initialized, setInitialized] = useState<{
		dashboardId: string;
		pathname: string;
		followsDefault: boolean;
	}>();
	const isInitialized =
		initialized?.dashboardId === dashboardId && initialized.pathname === pathname;
	const followsDefault = isInitialized && initialized.followsDefault;

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
		const relativeTime = toPickerRelativeTime(duration);
		const opensOnDefault = !hasUrlTime && !hasPersistedTimeForRoute(pathname);

		if (opensOnDefault && relativeTime) {
			params.set(QueryParams.relativeTime, relativeTime);
			navigate(`${pathname}?${params.toString()}`, { replace: true });
		}
		// Keep the first run: StrictMode reruns this after it has already written the URL.
		setInitialized((current) =>
			current?.dashboardId === dashboardId && current.pathname === pathname
				? current
				: { dashboardId, pathname, followsDefault: opensOnDefault },
		);
	}, [dashboardId, duration, pathname, isInitialized, navigate]);

	useEffect(() => {
		const previous = previousDuration.current;
		previousDuration.current = duration;
		if (!followsDefault || previous === duration) {
			return;
		}
		const params = getUnstableCurrentSearchParams();
		const routeDefault = getDefaultOption(pathname);
		const isOnPreviousDefault =
			params.get(QueryParams.relativeTime) ===
				(toPickerRelativeTime(previous) ?? routeDefault) &&
			!params.has(QueryParams.startTime) &&
			!params.has(QueryParams.endTime) &&
			!hasPersistedTimeForRoute(pathname);
		if (!isOnPreviousDefault) {
			return;
		}
		const next = toPickerRelativeTime(duration) ?? routeDefault;
		params.set(QueryParams.relativeTime, next);
		navigate(`${pathname}?${params.toString()}`, { replace: true });
		dispatch(UpdateTimeInterval(next as Time));
	}, [duration, followsDefault, pathname, navigate, dispatch]);

	return isInitialized;
}
