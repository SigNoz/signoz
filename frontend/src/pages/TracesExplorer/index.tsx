import { Tabs } from 'antd';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { PANEL_TYPES_QUERY } from 'constants/queryBuilderQueryNames';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import QuerySection from 'container/TracesExplorer/QuerySection';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { useCallback, useEffect, useMemo } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import { Container } from './styles';
import { getTabsItems } from './utils';

function TracesExplorer(): JSX.Element {
	const {
		currentQuery,
		panelType,
		updateAllQueriesOperators,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	const currentTab = panelType || PANEL_TYPES.LIST;

	const isMultipleQueries = useMemo(
		() =>
			currentQuery.builder.queryData.length > 1 ||
			currentQuery.builder.queryFormulas.length > 0,
		[currentQuery],
	);

	const defaultQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				initialQueriesMap.traces,
				PANEL_TYPES.LIST,
				DataSource.TRACES,
			),
		[updateAllQueriesOperators],
	);

	const isGroupByExist = useMemo(() => {
		const groupByCount: number = currentQuery.builder.queryData.reduce<number>(
			(acc, query) => acc + query.groupBy.length,
			0,
		);

		return groupByCount > 0;
	}, [currentQuery]);

	const tabsItems = getTabsItems({
		isListViewDisabled: isMultipleQueries || isGroupByExist,
	});

	const handleTabChange = useCallback(
		(newPanelType: string): void => {
			if (panelType === newPanelType) return;

			const query = updateAllQueriesOperators(
				currentQuery,
				newPanelType as GRAPH_TYPES,
				DataSource.TRACES,
			);

			redirectWithQueryBuilderData(query, { [PANEL_TYPES_QUERY]: newPanelType });
		},
		[
			currentQuery,
			panelType,
			redirectWithQueryBuilderData,
			updateAllQueriesOperators,
		],
	);

	useShareBuilderUrl(defaultQuery);

	useEffect(() => {
		const shouldChangeView = isMultipleQueries || isGroupByExist;

		if (
			(currentTab === PANEL_TYPES.LIST || currentTab === PANEL_TYPES.TRACE) &&
			shouldChangeView
		) {
			handleTabChange(PANEL_TYPES.TIME_SERIES);
		}
	}, [currentTab, isMultipleQueries, isGroupByExist, handleTabChange]);

	return (
		<>
			<QuerySection />

			<Container>
				<Tabs
					defaultActiveKey={currentTab}
					activeKey={currentTab}
					items={tabsItems}
					onChange={handleTabChange}
				/>
			</Container>
		</>
	);
}

export default TracesExplorer;
