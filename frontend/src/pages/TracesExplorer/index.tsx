import { Tabs } from 'antd';
import axios from 'axios';
import ExplorerCard from 'components/ExplorerCard';
import { QueryParams } from 'constants/query';
import {
	initialAutocompleteData,
	initialQueriesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { queryParamNamesMap } from 'constants/queryBuilderQueryNames';
import ROUTES from 'constants/routes';
import ExportPanel from 'container/ExportPanel';
import { SIGNOZ_VALUE } from 'container/QueryBuilder/filters/OrderByFilter/constants';
import QuerySection from 'container/TracesExplorer/QuerySection';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { addEmptyWidgetInDashboardJSONWithQuery } from 'hooks/dashboard/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { useCallback, useEffect, useMemo } from 'react';
import { generatePath } from 'react-router-dom';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { ActionsWrapper, Container } from './styles';
import { getTabsItems } from './utils';

function TracesExplorer(): JSX.Element {
	const { notifications } = useNotifications();

	const {
		currentQuery,
		panelType,
		updateAllQueriesOperators,
		updateQueriesData,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	const currentTab = panelType || PANEL_TYPES.LIST;

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

	const defaultQuery = useMemo(() => {
		const query = updateAllQueriesOperators(
			initialQueriesMap.traces,
			PANEL_TYPES.LIST,
			DataSource.TRACES,
		);

		return {
			...query,
			builder: {
				...query.builder,
				queryData: [
					{
						...query.builder.queryData[0],
						orderBy: [{ columnName: 'timestamp', order: 'desc' }],
					},
				],
			},
		};
	}, [updateAllQueriesOperators]);

	const tabsItems = getTabsItems({
		isListViewDisabled: isMultipleQueries || isGroupByExist,
	});

	const exportDefaultQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				currentQuery || initialQueriesMap.traces,
				PANEL_TYPES.TIME_SERIES,
				DataSource.TRACES,
			),
		[currentQuery, updateAllQueriesOperators],
	);

	const { mutate: updateDashboard, isLoading } = useUpdateDashboard();

	const handleExport = useCallback(
		(dashboard: Dashboard | null): void => {
			if (!dashboard) return;

			const updatedDashboard = addEmptyWidgetInDashboardJSONWithQuery(
				dashboard,
				exportDefaultQuery,
			);

			updateDashboard(updatedDashboard, {
				onSuccess: (data) => {
					if (data.error) {
						const message =
							data.error === 'feature usage exceeded' ? (
								<span>
									Panel limit exceeded for {DataSource.TRACES} in community edition.
									Please checkout our paid plans{' '}
									<a
										href="https://signoz.io/pricing/?utm_source=product&utm_medium=dashboard-limit"
										rel="noreferrer noopener"
										target="_blank"
									>
										here
									</a>
								</span>
							) : (
								data.error
							);
						notifications.error({
							message,
						});

						return;
					}
					const dashboardEditView = `${generatePath(ROUTES.DASHBOARD, {
						dashboardId: data?.payload?.uuid,
					})}/new?${QueryParams.graphType}=graph&${QueryParams.widgetId}=empty&${
						queryParamNamesMap.compositeQuery
					}=${encodeURIComponent(JSON.stringify(exportDefaultQuery))}`;

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
		},
		[exportDefaultQuery, notifications, updateDashboard],
	);

	const getUpdateQuery = useCallback(
		(newPanelType: PANEL_TYPES): Query => {
			let query = updateAllQueriesOperators(
				currentQuery,
				newPanelType,
				DataSource.TRACES,
			);

			if (
				newPanelType === PANEL_TYPES.LIST ||
				newPanelType === PANEL_TYPES.TRACE
			) {
				query = updateQueriesData(query, 'queryData', (item) => ({
					...item,
					orderBy: item.orderBy.filter((item) => item.columnName !== SIGNOZ_VALUE),
					aggregateAttribute: initialAutocompleteData,
				}));
			}

			return query;
		},
		[currentQuery, updateAllQueriesOperators, updateQueriesData],
	);

	const handleTabChange = useCallback(
		(type: string): void => {
			const newPanelType = type as PANEL_TYPES;
			if (panelType === newPanelType) return;

			const query = getUpdateQuery(newPanelType);

			redirectWithQueryBuilderData(query, {
				[queryParamNamesMap.panelTypes]: newPanelType,
			});
		},
		[getUpdateQuery, panelType, redirectWithQueryBuilderData],
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
			<ExplorerCard>
				<QuerySection />
			</ExplorerCard>

			<Container>
				<ActionsWrapper>
					<ExportPanel
						query={exportDefaultQuery}
						isLoading={isLoading}
						onExport={handleExport}
					/>
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
