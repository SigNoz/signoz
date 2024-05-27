import './TracesExplorer.styles.scss';

import { FilterOutlined } from '@ant-design/icons';
import { Button, Card, Tabs } from 'antd';
import axios from 'axios';
import ExplorerCard from 'components/ExplorerCard/ExplorerCard';
import { AVAILABLE_EXPORT_PANEL_TYPES } from 'constants/panelTypes';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ExplorerOptionWrapper from 'container/ExplorerOptions/ExplorerOptionWrapper';
import ExportPanel from 'container/ExportPanel';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import DateTimeSelector from 'container/TopNav/DateTimeSelectionV2';
import QuerySection from 'container/TracesExplorer/QuerySection';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { addEmptyWidgetInDashboardJSONWithQuery } from 'hooks/dashboard/utils';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { useHandleExplorerTabChange } from 'hooks/useHandleExplorerTabChange';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Dashboard } from 'types/api/dashboard/getAll';
import { DataSource } from 'types/common/queryBuilder';
import { generateExportToDashboardLink } from 'utils/dashboard/generateExportToDashboardLink';
import { v4 } from 'uuid';

import { Filter } from './Filter/Filter';
import { ActionsWrapper, Container } from './styles';
import { getTabsItems } from './utils';

function TracesExplorer(): JSX.Element {
	const { notifications } = useNotifications();

	const {
		currentQuery,
		panelType,
		updateAllQueriesOperators,
		handleRunQuery,
		stagedQuery,
	} = useQueryBuilder();

	const currentPanelType = useGetPanelTypesQueryParam();

	const { handleExplorerTabChange } = useHandleExplorerTabChange();

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
			if (!dashboard || !panelType) return;

			const panelTypeParam = AVAILABLE_EXPORT_PANEL_TYPES.includes(panelType)
				? panelType
				: PANEL_TYPES.TIME_SERIES;

			const widgetId = v4();

			const updatedDashboard = addEmptyWidgetInDashboardJSONWithQuery(
				dashboard,
				exportDefaultQuery,
				widgetId,
				panelTypeParam,
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
					const dashboardEditView = generateExportToDashboardLink({
						query: exportDefaultQuery,
						panelType: panelTypeParam,
						dashboardId: data.payload?.uuid || '',
						widgetId,
					});

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
		[exportDefaultQuery, notifications, panelType, updateDashboard],
	);

	useShareBuilderUrl(defaultQuery);

	useEffect(() => {
		const shouldChangeView = isMultipleQueries || isGroupByExist;

		if (
			(currentTab === PANEL_TYPES.LIST || currentTab === PANEL_TYPES.TRACE) &&
			shouldChangeView
		) {
			handleExplorerTabChange(currentPanelType || PANEL_TYPES.TIME_SERIES);
		}
	}, [
		currentTab,
		isMultipleQueries,
		isGroupByExist,
		handleExplorerTabChange,
		currentPanelType,
	]);
	const [isOpen, setOpen] = useState<boolean>(true);

	return (
		<ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
			<div className="trace-explorer-page">
				<Card className="filter" hidden={!isOpen}>
					<Filter setOpen={setOpen} />
				</Card>
				<Card className="trace-explorer">
					<div className="trace-explorer-header">
						<Button onClick={(): void => setOpen(!isOpen)}>
							<FilterOutlined />
						</Button>
						<div className="trace-explorer-run-query">
							<RightToolbarActions onStageRunQuery={handleRunQuery} />
							<DateTimeSelector showAutoRefresh />
						</div>
					</div>
					<ExplorerCard sourcepage={DataSource.TRACES}>
						<QuerySection />
					</ExplorerCard>

					<Container className="traces-explorer-views">
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
							onChange={handleExplorerTabChange}
						/>
					</Container>
					<ExplorerOptionWrapper
						disabled={!stagedQuery}
						query={exportDefaultQuery}
						isLoading={isLoading}
						sourcepage={DataSource.TRACES}
						onExport={handleExport}
					/>
				</Card>
			</div>
		</ErrorBoundary>
	);
}

export default TracesExplorer;
