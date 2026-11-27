import { useCallback } from 'react';
import { useQueries } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import {
	getQueryPayloadFromWidgetsData,
	getValueFromScalarResponse,
} from 'pages/Celery/CeleryOverview/CeleryOverviewUtils';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/widgets/widget';
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
			queryKey: [...queryKey, payload],
			queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(payload),
			enabled: !!payload,
		})),
	);

	const isLoading = queries.some((query) => query.isLoading);
	const isError = queries.some((query) => query.isError);

	const values = queries.map((query) => {
		if (query.isLoading) {
			return 'Loading...';
		}
		if (query.isError) {
			return 'Error';
		}

		return getValueFromScalarResponse(query.data);
	});

	return { values, isLoading, isError };
};
