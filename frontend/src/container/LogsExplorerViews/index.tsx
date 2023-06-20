import { TabsProps } from 'antd';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { PANEL_TYPES_QUERY } from 'constants/queryBuilderQueryNames';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import LogsExplorerList from 'container/LogsExplorerList';
import LogsExplorerTable from 'container/LogsExplorerTable';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useUrlQuery from 'hooks/useUrlQuery';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { TabsStyled } from './LogsExplorerViews.styled';

function LogsExplorerViews(): JSX.Element {
	const location = useLocation();
	const urlQuery = useUrlQuery();
	const history = useHistory();
	const { currentQuery, stagedQuery } = useQueryBuilder();

	const { selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const panelTypeParam = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);

	const { data, isFetching } = useGetQueryRange(
		{
			query: stagedQuery || initialQueriesMap.metrics,
			graphType: panelTypeParam,
			globalSelectedInterval: selectedTime,
			selectedTime: 'GLOBAL_TIME',
		},
		{
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				selectedTime,
				stagedQuery,
				panelTypeParam,
			],
			enabled: !!stagedQuery,
		},
	);

	const panelTypeParams = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);

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
			{ label: 'TimeSeries', key: PANEL_TYPES.TIME_SERIES },
			{
				label: 'Table',
				key: PANEL_TYPES.TABLE,
				children: <LogsExplorerTable data={currentData} isLoading={isFetching} />,
			},
		],
		[isMultipleQueries, isGroupByExist, currentData, isFetching],
	);

	const handleChangeView = useCallback(
		(panelType: string) => {
			urlQuery.set(PANEL_TYPES_QUERY, JSON.stringify(panelType) as GRAPH_TYPES);
			const path = `${location.pathname}?${urlQuery}`;

			history.push(path);
		},
		[history, location, urlQuery],
	);

	const currentTabKey = useMemo(
		() =>
			Object.values(PANEL_TYPES).includes(panelTypeParams)
				? panelTypeParams
				: PANEL_TYPES.LIST,
		[panelTypeParams],
	);

	useEffect(() => {
		const shouldChangeView = isMultipleQueries || isGroupByExist;

		if (panelTypeParams === 'list' && shouldChangeView) {
			handleChangeView(PANEL_TYPES.TIME_SERIES);
		}
	}, [panelTypeParams, isMultipleQueries, isGroupByExist, handleChangeView]);

	return (
		<div>
			<TabsStyled
				items={tabsItems}
				defaultActiveKey={currentTabKey}
				activeKey={currentTabKey}
				onChange={handleChangeView}
			/>
		</div>
	);
}

export default memo(LogsExplorerViews);
