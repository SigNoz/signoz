import { Tabs } from 'antd';
import update from 'api/dashboard/update';
import axios from 'axios';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import {
	COMPOSITE_QUERY,
	PANEL_TYPES_QUERY,
} from 'constants/queryBuilderQueryNames';
import ROUTES from 'constants/routes';
import ExportPanel from 'container/ExportPanel';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import QuerySection from 'container/TracesExplorer/QuerySection';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { useCallback, useMemo } from 'react';
import { useMutation } from 'react-query';
import { generatePath } from 'react-router-dom';
import { Dashboard } from 'types/api/dashboard/getAll';
import { DataSource } from 'types/common/queryBuilder';

import { ActionsWrapper, Container } from './styles';
import { getTabsItems, getUpdatedDashboard } from './utils';

function TracesExplorer(): JSX.Element {
	const { notifications } = useNotifications();
	const {
		currentQuery,
		stagedQuery,
		panelType,
		updateAllQueriesOperators,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	const tabsItems = getTabsItems();
	const currentTab = panelType || PANEL_TYPES.TIME_SERIES;

	const defaultQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				initialQueriesMap.traces,
				PANEL_TYPES.TIME_SERIES,
				DataSource.TRACES,
			),
		[updateAllQueriesOperators],
	);

	const exportDefaultQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				stagedQuery || initialQueriesMap.traces,
				PANEL_TYPES.TIME_SERIES,
				DataSource.TRACES,
			),
		[stagedQuery, updateAllQueriesOperators],
	);

	const { mutate: updateDashboard, isLoading } = useMutation(update, {
		onSuccess: (data) => {
			const dashboardEditView = `${generatePath(ROUTES.DASHBOARD, {
				dashboardId: data?.payload?.uuid,
			})}/new?graphType=graph&widgetId=empty&${COMPOSITE_QUERY}=${JSON.stringify(
				exportDefaultQuery,
			)}`;

			history.push(dashboardEditView);
		},
		onError: (error) => {
			if (axios.isAxiosError(error)) {
				notifications.error({
					message: error.message,
				});
			}
		},
	});

	const handleExport = useCallback(
		(dashboard: Dashboard | null): void => {
			if (!dashboard) return;

			const updatedDashboard = getUpdatedDashboard(dashboard, exportDefaultQuery);

			updateDashboard(updatedDashboard);
		},
		[exportDefaultQuery, updateDashboard],
	);

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

	return (
		<>
			<QuerySection />

			<Container>
				<ActionsWrapper>
					<ExportPanel isLoading={isLoading} onExport={handleExport} />
				</ActionsWrapper>

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
