import { TabsProps } from 'antd';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { PANEL_TYPES_QUERY } from 'constants/queryBuilderQueryNames';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import LogsExplorerList from 'container/LogsExplorerList';
import LogsExplorerTable from 'container/LogsExplorerTable';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import TimeSeriesView from 'container/TimeSeriesView/TimeSeriesView';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import { TabsStyled } from './LogsExplorerViews.styled';

function LogsExplorerViews(): JSX.Element {
	const {
		currentQuery,
		stagedQuery,
		panelType,
		isEnabledQuery,
		updateAllQueriesOperators,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	const { selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { data, isFetching, isError } = useGetQueryRange(
		{
			query: stagedQuery || initialQueriesMap.metrics,
			graphType: panelType || PANEL_TYPES.LIST,
			globalSelectedInterval: selectedTime,
			selectedTime: 'GLOBAL_TIME',
			params: {
				dataSource: DataSource.LOGS,
			},
		},
		{
			queryKey: [REACT_QUERY_KEY.GET_QUERY_RANGE, selectedTime, stagedQuery],
			enabled: isEnabledQuery,
		},
	);

	const isMultipleQueries = useMemo(
		() =>
			currentQuery.builder.queryData.length > 1 ||
			currentQuery.builder.queryFormulas.length > 0,
		[currentQuery],
	);

	const isGroupByExist = useMemo(() => {
		const groupByCount: number = currentQuery.builder.queryData.reduce<number>(
			(acc, query) => acc + query.groupBy.length,
			0,
		);

		return groupByCount > 0;
	}, [currentQuery]);

	const currentData = useMemo(
		() => data?.payload.data.newResult.data.result || [],
		[data],
	);

	const tabsItems: TabsProps['items'] = useMemo(
		() => [
			{
				label: 'List View',
				key: PANEL_TYPES.LIST,
				disabled: isMultipleQueries || isGroupByExist,
				children: <LogsExplorerList data={currentData} isLoading={isFetching} />,
			},
			{
				label: 'TimeSeries',
				key: PANEL_TYPES.TIME_SERIES,
				children: (
					<TimeSeriesView isLoading={isFetching} data={data} isError={isError} />
				),
			},
			{
				label: 'Table',
				key: PANEL_TYPES.TABLE,
				children: <LogsExplorerTable data={currentData} isLoading={isFetching} />,
			},
		],
		[isMultipleQueries, isGroupByExist, currentData, isFetching, data, isError],
	);

	const handleChangeView = useCallback(
		(newPanelType: string) => {
			if (newPanelType === panelType) return;

			const query = updateAllQueriesOperators(
				currentQuery,
				newPanelType as GRAPH_TYPES,
				DataSource.LOGS,
			);

			redirectWithQueryBuilderData(query, { [PANEL_TYPES_QUERY]: newPanelType });
		},
		[
			currentQuery,
			panelType,
			updateAllQueriesOperators,
			redirectWithQueryBuilderData,
		],
	);

	useEffect(() => {
		const shouldChangeView = isMultipleQueries || isGroupByExist;

		if (panelType === 'list' && shouldChangeView) {
			handleChangeView(PANEL_TYPES.TIME_SERIES);
		}
	}, [panelType, isMultipleQueries, isGroupByExist, handleChangeView]);

	return (
		<div>
			<TabsStyled
				items={tabsItems}
				defaultActiveKey={panelType || PANEL_TYPES.LIST}
				activeKey={panelType || PANEL_TYPES.LIST}
				onChange={handleChangeView}
			/>
		</div>
	);
}

export default memo(LogsExplorerViews);
