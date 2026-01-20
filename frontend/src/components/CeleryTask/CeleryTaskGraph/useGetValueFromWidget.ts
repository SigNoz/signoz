import { ENTITY_VERSION_V4 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { getQueryPayloadFromWidgetsData } from 'pages/Celery/CeleryOverview/CeleryOverviewUtils';
import { useCallback } from 'react';
import { useQueries } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { GlobalReducer } from 'types/reducer/globalTime';

interface UseGetValueResult {
	values: string[];
	isLoading: boolean;
	isError: boolean;
}

export const useGetValueFromWidget = (
	widgetsData: Widgets | Widgets[],
	queryKey: string[],
): UseGetValueResult => {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const queryPayloads = useCallback(
		() =>
			getQueryPayloadFromWidgetsData({
				start: Math.floor(minTime / 1000000000),
				end: Math.floor(maxTime / 1000000000),
				widgetsData: Array.isArray(widgetsData) ? widgetsData : [widgetsData],
				panelType: PANEL_TYPES.VALUE,
			}),
		[minTime, maxTime, widgetsData],
	);

	const queries = useQueries(
		queryPayloads().map((payload) => ({
			queryKey: [...queryKey, payload, ENTITY_VERSION_V4],
			queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(payload, ENTITY_VERSION_V4),
			enabled: !!payload,
		})),
	);

	const isLoading = queries.some((query) => query.isLoading);
	const isError = queries.some((query) => query.isError);

	const values = queries.map((query) => {
		if (query.isLoading) return 'Loading...';
		if (query.isError) return 'Error';

		const value = parseFloat(
			query.data?.payload?.data?.newResult?.data?.result?.[0]?.series?.[0]
				?.values?.[0]?.value || 'NaN',
		);
		return Number.isNaN(value) ? 'NaN' : value.toFixed(2);
	});

	return { values, isLoading, isError };
};
