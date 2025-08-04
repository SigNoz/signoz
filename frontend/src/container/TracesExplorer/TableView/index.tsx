import { Space } from 'antd';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { QueryTable } from 'container/QueryTable';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import APIError from 'types/api/error';
import { QueryDataV3 } from 'types/api/widgets/getQuery';
import { GlobalReducer } from 'types/reducer/globalTime';

function TableView(): JSX.Element {
	const { stagedQuery, panelType } = useQueryBuilder();

	const { selectedTime: globalSelectedTime, maxTime, minTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { data, isLoading, isError, error } = useGetQueryRange(
		{
			query: stagedQuery || initialQueriesMap.traces,
			graphType: panelType || PANEL_TYPES.TABLE,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
			params: {
				dataSource: 'traces',
			},
		},
		// ENTITY_VERSION_V4,
		ENTITY_VERSION_V5,
		{
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				globalSelectedTime,
				maxTime,
				minTime,
				stagedQuery,
			],
			enabled: !!stagedQuery && panelType === PANEL_TYPES.TABLE,
		},
	);

	const queryTableData = useMemo(
		() =>
			data?.payload?.data?.newResult?.data?.result ||
			data?.payload.data.result ||
			[],
		[data],
	);

	return (
		<Space.Compact block direction="vertical">
			{isError && error && <ErrorInPlace error={error as APIError} />}
			{!isError && (
				<QueryTable
					query={stagedQuery || initialQueriesMap.traces}
					queryTableData={queryTableData as QueryDataV3[]}
					loading={isLoading}
					sticky
				/>
			)}
		</Space.Compact>
	);
}

export default memo(TableView);
