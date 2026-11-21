import type { MutableRefObject } from 'react';
import { useMemo } from 'react';
import type { UseQueryOptions, UseQueryResult } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { initialQueriesMap } from 'constants/queryBuilder';
import { PANEL_TYPES } from 'constants/queryBuilderPanelTypes';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import type { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import type { AppState } from 'store/reducers';
import type { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import type { GlobalReducer } from 'types/reducer/globalTime';

import { useGetQueryRange } from './useGetQueryRange';
import { useQueryBuilder } from './useQueryBuilder';

export const useGetExplorerQueryRange = (
	requestData: Query | null,
	panelType: PANEL_TYPES | null,
	version: string,
	options?: UseQueryOptions<MetricQueryRangeSuccessResponse, Error>,
	params?: Record<string, unknown>,
	isDependentOnQB = true,
	keyRef?: MutableRefObject<any>,
	headers?: Record<string, string>,
	selectedTimeInterval?: GetQueryResultsProps['globalSelectedInterval'],
): UseQueryResult<MetricQueryRangeSuccessResponse, Error> => {
	const { isEnabledQuery } = useQueryBuilder();
	const {
		selectedTime: globalSelectedInterval,
		minTime,
		maxTime,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);

	const key =
		typeof options?.queryKey === 'string'
			? options?.queryKey
			: REACT_QUERY_KEY.GET_QUERY_RANGE;

	const isEnabled = useMemo(() => {
		if (!options) {
			return isEnabledQuery;
		}
		if (typeof options.enabled === 'boolean') {
			return options.enabled && (!isDependentOnQB || isEnabledQuery);
		}

		return isEnabledQuery;
	}, [options, isEnabledQuery, isDependentOnQB]);

	if (keyRef) {
		keyRef.current = [key, globalSelectedInterval, requestData, minTime, maxTime];
	}

	return useGetQueryRange(
		{
			graphType: panelType || PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: selectedTimeInterval ?? globalSelectedInterval,

			query: requestData || initialQueriesMap.metrics,
			params,
		},
		// version,
		ENTITY_VERSION_V5,
		{
			...options,
			queryKey: [key, globalSelectedInterval, requestData, minTime, maxTime],
			enabled: isEnabled,
		},
		headers,
	);
};
