import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import { UseQueryResult } from 'react-query';
import store from 'store';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

export const getTimeRangeFromQueryRangeRequest = (
	widgetParams?: QueryRangeRequestV5,
): Record<string, number> => {
	if (widgetParams && widgetParams?.start && widgetParams?.end) {
		return {
			startTime: widgetParams.start / 1000,
			endTime: widgetParams.end / 1000,
		};
	}
	const { globalTime } = store.getState();

	const { start: globalStartTime, end: globalEndTime } = getStartEndRangeTime({
		type: 'GLOBAL_TIME',
		interval: globalTime.selectedTime,
	});

	return {
		startTime: (parseInt(globalStartTime, 10) * 1e3) / 1000,
		endTime: (parseInt(globalEndTime, 10) * 1e3) / 1000,
	};
};

export const getTimeRange = (
	widgetQueryRange?: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>,
): Record<string, number> => {
	const widgetParams =
		(widgetQueryRange?.data?.params as QueryRangeRequestV5) || null;

	return getTimeRangeFromQueryRangeRequest(widgetParams);
};
