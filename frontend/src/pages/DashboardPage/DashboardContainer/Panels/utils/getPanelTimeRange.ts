import type { Querybuildertypesv5QueryRangeRequestDTO } from 'api/generated/services/sigNoz.schemas';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import store from 'store';

/** Panel time window in epoch SECONDS (uPlot X-scale + drilldown explorer window). */
interface PanelTimeRange {
	startTime: number;
	endTime: number;
}

/**
 * Time window a panel's data was fetched over, read off the request's `start`/`end` (ms → s).
 * Falls back to the dashboard global-time window when the panel hasn't fetched yet.
 */
export function getPanelTimeRange(
	request: Querybuildertypesv5QueryRangeRequestDTO | undefined,
): PanelTimeRange {
	if (request?.start && request?.end) {
		return { startTime: request.start / 1000, endTime: request.end / 1000 };
	}

	const { globalTime } = store.getState();
	const { start, end } = getStartEndRangeTime({
		type: 'GLOBAL_TIME',
		interval: globalTime.selectedTime,
	});
	return { startTime: parseInt(start, 10), endTime: parseInt(end, 10) };
}
