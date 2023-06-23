import { Tabs } from 'antd';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { PANEL_TYPES_QUERY } from 'constants/queryBuilderQueryNames';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import QuerySection from 'container/TracesExplorer/QuerySection';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { useCallback, useMemo } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import { Container } from './styles';
import { getTabsItems } from './utils';

function TracesExplorer(): JSX.Element {
	const {
		updateAllQueriesOperators,
		redirectWithQueryBuilderData,
		currentQuery,
		panelType,
	} = useQueryBuilder();

	const tabsItems = getTabsItems();

	const currentTab = panelType || PANEL_TYPES.TIME_SERIES;

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

	const defaultValue = useMemo(
		() =>
			updateAllQueriesOperators(
				initialQueriesMap.traces,
				PANEL_TYPES.TIME_SERIES,
				DataSource.TRACES,
			),
		[updateAllQueriesOperators],
	);

	useShareBuilderUrl(defaultValue);

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
