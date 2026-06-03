import { useMemo } from 'react';
import type { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';
import type { QueryRangeRequestV5 } from 'types/api/v5/queryRange';
import { getTimeRangeFromQueryRangeRequest } from 'utils/getTimeRange';

interface TimeScale {
	minTimeScale: number | undefined;
	maxTimeScale: number | undefined;
}

/**
 * Derives the X-axis time-scale clamps from a query-range response. Reads
 * `start`/`end` off `data.params` (the request that produced this payload)
 * so each panel pins to the window it actually fetched — important during
 * drag-zoom transitions when the time picker has moved but new data hasn't
 * arrived yet. Falls back to the global time picker via the helper when
 * `data` is absent.
 */
export function useTimeScale(
	data: MetricQueryRangeSuccessResponse | undefined,
): TimeScale {
	return useMemo(() => {
		// `data.params` is typed `unknown` on this branch; PR 11562 narrows it
		// to `QueryRangeRequestV5`. Drop this cast when that lands.
		const params = data?.params as QueryRangeRequestV5 | undefined;
		const { startTime, endTime } = getTimeRangeFromQueryRangeRequest(params);
		return { minTimeScale: startTime, maxTimeScale: endTime };
	}, [data]);
}
