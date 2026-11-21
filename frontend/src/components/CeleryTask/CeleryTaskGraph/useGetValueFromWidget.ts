import { useCallback } from 'react';
import { useQueries } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilderPanelTypes';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import {
	getQueryPayloadFromWidgetsData,
	getValueFromScalarResponse,
} from 'pages/Celery/CeleryOverview/CeleryOverviewUtils';
import type { AppState } from 'store/reducers';
import type { SuccessResponse } from 'types/api';
import type { Widgets } from 'types/api/widgets/widget';
import type { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import type { GlobalReducer } from 'types/reducer/globalTime';

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
			queryKey: [...queryKey, payload, ENTITY_VERSION_V5],
			queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(payload, ENTITY_VERSION_V5),
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
