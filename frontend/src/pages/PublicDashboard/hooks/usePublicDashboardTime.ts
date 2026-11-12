import { useEffect, useState } from 'react';
// eslint-disable-next-line no-restricted-imports -- the dashboard reads redux global time
import { useDispatch } from 'react-redux';
import { QueryParams } from 'constants/query';
import { DEFAULT_TIME_RANGE } from 'container/TopNav/DateTimeSelectionV2/constants';
import type { Time } from 'container/TopNav/DateTimeSelectionV2/types';
import { getCurrentLocation, navigate } from 'lib/router/navigation';
import { UpdateTimeInterval } from 'store/actions';

/**
 * Starts the link on its shared default range, by writing it where the
 * dashboard's time picker looks first (`relativeTime`) and into the global time.
 * A viewer's own range is kept only when the link lets them change it. Returns
 * whether the dashboard may mount.
 */
export function usePublicDashboardTime({
	defaultTimeRange,
	timeRangeEnabled,
}: {
	defaultTimeRange: string | undefined;
	timeRangeEnabled: boolean;
}): boolean {
	const dispatch = useDispatch();
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		const { pathname, search } = getCurrentLocation();
		const params = new URLSearchParams(search);
		const hasOwnRange =
			params.has(QueryParams.relativeTime) ||
			(params.has(QueryParams.startTime) && params.has(QueryParams.endTime));

		if (!timeRangeEnabled || !hasOwnRange) {
			const range = (defaultTimeRange || DEFAULT_TIME_RANGE) as Time;
			params.delete(QueryParams.startTime);
			params.delete(QueryParams.endTime);
			params.set(QueryParams.relativeTime, range);
			navigate(`${pathname}?${params.toString()}`, { replace: true });
			dispatch(UpdateTimeInterval(range));
		}
		setIsReady(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- once per link
	}, []);

	return isReady;
}
