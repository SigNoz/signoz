import { TabsProps } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { PANEL_TYPES_QUERY } from 'constants/queryBuilderQueryNames';
import LogsExplorerList from 'container/LogsExplorerList';
import LogsExplorerTable from 'container/LogsExplorerTable';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import { TabsStyled } from './LogsExplorerViews.styled';

function LogsExplorerViews(): JSX.Element {
	const {
		currentQuery,
		panelType,
		updateAllQueriesOperators,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

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

	const tabsItems: TabsProps['items'] = useMemo(
		() => [
			{
				label: 'List View',
				key: PANEL_TYPES.LIST,
				disabled: isMultipleQueries || isGroupByExist,
				children: <LogsExplorerList />,
			},
			{ label: 'TimeSeries', key: PANEL_TYPES.TIME_SERIES },
			{
				label: 'Table',
				key: PANEL_TYPES.TABLE,
				children: <LogsExplorerTable />,
			},
		],
		[isMultipleQueries, isGroupByExist],
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
				destroyInactiveTabPane
			/>
		</div>
	);
}

export default memo(LogsExplorerViews);
