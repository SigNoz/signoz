import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { useMemo } from 'react';
import { UseQueryOptions, UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

import { useGetQueryRange } from './useGetQueryRange';
import { useQueryBuilder } from './useQueryBuilder';

export const useGetExplorerQueryRange = (
	requestData: Query | null,
	panelType: GRAPH_TYPES | null,
	options?: UseQueryOptions<SuccessResponse<MetricRangePayloadProps>, Error>,
): UseQueryResult<SuccessResponse<MetricRangePayloadProps>, Error> => {
	const { isEnabledQuery } = useQueryBuilder();
	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const key = useMemo(
		() =>
			typeof options?.queryKey === 'string'
				? options?.queryKey
				: REACT_QUERY_KEY.GET_QUERY_RANGE,
		[options?.queryKey],
	);

	const isEnabled = useMemo(() => {
		if (!options) return isEnabledQuery;
		if (typeof options.enabled === 'boolean') {
			return isEnabledQuery && options.enabled;
		}

		return isEnabledQuery;
	}, [options, isEnabledQuery]);

	return useGetQueryRange(
		{
			graphType: panelType || PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval,
			query: requestData || initialQueriesMap.metrics,
		},
		{
			...options,
			retry: false,
			queryKey: [key, globalSelectedInterval, requestData],
			enabled: isEnabled,
		},
	);
};
