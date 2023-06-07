/* eslint-disable  */
// @ts-ignore
// @ts-nocheck

import { TracesExplorerRangePayload } from 'types/api/trace/getQueryRange';
import { COMPOSITE_QUERY } from 'constants/queryBuilderQueryNames';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import useUrlQuery from 'hooks/useUrlQuery';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import getStep from 'lib/getStep';
import { mapQueryDataToApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataToApi';
import { useMemo } from 'react';
import { useQuery, UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getMetricsQueryRange } from 'api/metrics/getQueryRange';

export const useGetTracesExplorerQueryRange = ({
	query,
}: UseGetTracesExplorerQueryRangeProps): UseQueryResult<
	SuccessResponse<TracesExplorerRangePayload> | ErrorResponse,
	unknown
> => {
	const { selectedTime: globalSelectedTime, maxTime, minTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const urlQuery = useUrlQuery();
	const currentQuery = urlQuery.get(COMPOSITE_QUERY);

	const { queryData, queryFormulas } = query.builder;

	const currentQueryData = mapQueryDataToApi(queryData, 'queryName');
	const currentFormulas = mapQueryDataToApi(queryFormulas, 'queryName');

	const builderQueries = {
		...currentQueryData.data,
		...currentFormulas.data,
	};

	const { start, end } = getStartEndRangeTime({});

	const canQuery = useMemo((): boolean => {
		if (!query || query == null) return false;

		if (query.builder.queryData[0]?.dataSource !== DataSource.TRACES) {
			return false;
		}

		return (
			query.builder.queryData.length > 0 &&
			query.builder.queryData[0].queryName !== ''
		);
	}, [query]);

	const queryKeys = [currentQuery, globalSelectedTime, maxTime, minTime];

	const queryResponse = useQuery(
		[REACT_QUERY_KEY.GET_TRACES_EXPLORER_QUERY_RANGE, ...queryKeys],
		async () =>
			getMetricsQueryRange({
				start: parseInt(start, 10) * 1e3,
				end: parseInt(end, 10) * 1e3,
				step: getStep({ start, end, inputFormat: 'ms' }),
				dataSource: DataSource.TRACES,
				compositeQuery: {
					queryType: query.queryType,
					panelType: 'graph',
					builderQueries,
				},
			}),
		{
			retry: false,
			enabled: canQuery,
		},
	);

	return queryResponse;
};

interface UseGetTracesExplorerQueryRangeProps {
	query: Query;
}
