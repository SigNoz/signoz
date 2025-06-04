import './TracesExplorer.styles.scss';

import * as Sentry from '@sentry/react';
import { Card } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import ExplorerCard from 'components/ExplorerCard/ExplorerCard';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource, SignalType } from 'components/QuickFilters/types';
import { LOCALSTORAGE } from 'constants/localStorage';
import { AVAILABLE_EXPORT_PANEL_TYPES } from 'constants/panelTypes';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ExplorerOptionWrapper from 'container/ExplorerOptions/ExplorerOptionWrapper';
import ExportPanel from 'container/ExportPanel';
import { useOptionsMenu } from 'container/OptionsMenu';
import LeftToolbarActions from 'container/QueryBuilder/components/ToolbarActions/LeftToolbarActions';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import TimeSeriesView from 'container/TimeSeriesView';
import Toolbar from 'container/Toolbar/Toolbar';
import ListView from 'container/TracesExplorer/ListView';
// import DateTimeSelector from 'container/TopNav/DateTimeSelectionV2';
import { defaultSelectedColumns } from 'container/TracesExplorer/ListView/configs';
import QuerySection from 'container/TracesExplorer/QuerySection';
import TableView from 'container/TracesExplorer/TableView';
import TracesView from 'container/TracesExplorer/TracesView';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { addEmptyWidgetInDashboardJSONWithQuery } from 'hooks/dashboard/utils';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { useHandleExplorerTabChange } from 'hooks/useHandleExplorerTabChange';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { cloneDeep, isEmpty, set } from 'lodash-es';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { generateExportToDashboardLink } from 'utils/dashboard/generateExportToDashboardLink';
import { v4 } from 'uuid';

function TracesExplorer(): JSX.Element {
	const {
		currentQuery,
		panelType,
		updateAllQueriesOperators,
		handleRunQuery,
		stagedQuery,
	} = useQueryBuilder();

	const { options } = useOptionsMenu({
		storageKey: LOCALSTORAGE.TRACES_LIST_OPTIONS,
		dataSource: DataSource.TRACES,
		aggregateOperator: 'noop',
		initialOptions: {
			selectColumns: defaultSelectedColumns,
		},
	});

	const currentPanelType = useGetPanelTypesQueryParam();
	const currentTab = panelType || PANEL_TYPES.LIST;

	const { handleExplorerTabChange } = useHandleExplorerTabChange();
	const { safeNavigate } = useSafeNavigate();

	const listQuery = useMemo(() => {
		if (!stagedQuery || stagedQuery.builder.queryData.length < 1) return null;

		return stagedQuery.builder.queryData.find((item) => !item.disabled) || null;
	}, [stagedQuery]);

	const isMultipleQueries = useMemo(
		() =>
			currentQuery.builder.queryData.length > 1 ||
			currentQuery.builder.queryFormulas.length > 0,
		[currentQuery],
	);

	const isGroupByExist = useMemo(() => {
		const groupByCount: number = currentQuery.builder.queryData.reduce<number>(
			(acc, query) => acc + (query?.groupBy?.length || 0),
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

	const exportDefaultQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				currentQuery || initialQueriesMap.traces,
				PANEL_TYPES.TIME_SERIES,
				DataSource.TRACES,
			),
		[currentQuery, updateAllQueriesOperators],
	);

	const getUpdatedQueryForExport = useCallback((): Query => {
		const updatedQuery = cloneDeep(currentQuery);

		set(
			updatedQuery,
			'builder.queryData[0].selectColumns',
			options.selectColumns,
		);

		return updatedQuery;
	}, [currentQuery, options.selectColumns]);

	const handleExport = useCallback(
		(dashboard: Dashboard | null, isNewDashboard?: boolean): void => {
			if (!dashboard || !panelType) return;

			const panelTypeParam = AVAILABLE_EXPORT_PANEL_TYPES.includes(panelType)
				? panelType
				: PANEL_TYPES.TIME_SERIES;

			const widgetId = v4();

			const query =
				panelType === PANEL_TYPES.LIST
					? getUpdatedQueryForExport()
					: exportDefaultQuery;

			logEvent('Traces Explorer: Add to dashboard successful', {
				panelType,
				isNewDashboard,
				dashboardName: dashboard?.data?.title,
			});

			const dashboardEditView = generateExportToDashboardLink({
				query,
				panelType: panelTypeParam,
				dashboardId: dashboard.id,
				widgetId,
			});

			safeNavigate(dashboardEditView);
		},
		[exportDefaultQuery, panelType, safeNavigate, getUpdatedQueryForExport],
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
	const logEventCalledRef = useRef(false);

	useEffect(() => {
		if (!logEventCalledRef.current) {
			logEvent('Traces Explorer: Page visited', {});
			logEventCalledRef.current = true;
		}
	}, []);

	const toolbarViews = useMemo(
		() => ({
			list: {
				name: 'list',
				label: 'List',
				show: true,
				key: 'list',
			},
			timeseries: {
				name: 'timeseries',
				label: 'Timeseries',
				disabled: false,
				show: true,
				key: 'timeseries',
			},
			trace: {
				name: 'trace',
				label: 'Trace',
				disabled: false,
				show: true,
				key: 'trace',
			},
			table: {
				name: 'table',
				label: 'Table',
				disabled: false,
				show: true,
				key: 'table',
			},
			clickhouse: {
				name: 'clickhouse',
				label: 'Clickhouse',
				disabled: false,
				show: false,
				key: 'clickhouse',
			},
		}),
		[],
	);

	const isFilterApplied = useMemo(() => !isEmpty(listQuery?.filters.items), [
		listQuery,
	]);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className="trace-explorer-page">
				<Card className="filter" hidden={!isOpen}>
					<QuickFilters
						className="qf-traces-explorer"
						source={QuickFiltersSource.TRACES_EXPLORER}
						signal={SignalType.TRACES}
						handleFilterVisibilityChange={(): void => {
							setOpen(!isOpen);
						}}
					/>
				</Card>
				<div
					className={cx('trace-explorer', {
						'filters-expanded': isOpen,
					})}
				>
					<div className="trace-explorer-header">
						<Toolbar
							showAutoRefresh
							leftActions={
								<LeftToolbarActions
									showFilter={isOpen}
									handleFilterVisibilityChange={(): void => setOpen(!isOpen)}
									items={toolbarViews}
									selectedView={
										currentTab === PANEL_TYPES.TIME_SERIES ? 'timeseries' : currentTab
									}
									onChangeSelectedView={(view): void => {
										if (view === 'timeseries') {
											handleExplorerTabChange(PANEL_TYPES.TIME_SERIES);
											// setSelectedView(PANEL_TYPES.TIME_SERIES);
										} else {
											handleExplorerTabChange((view as unknown) as PANEL_TYPES);
											// setSelectedView((view as unknown) as PANEL_TYPES);
										}
									}}
								/>
							}
							rightActions={<RightToolbarActions onStageRunQuery={handleRunQuery} />}
							// showOldCTA={false}
						/>
					</div>
					<ExplorerCard sourcepage={DataSource.TRACES}>
						<div className="query-section-container">
							<QuerySection selectedView={currentTab} />
						</div>
					</ExplorerCard>

					<div className="traces-explorer-views">
						<div className="traces-explorer-export-panel">
							<ExportPanel
								query={exportDefaultQuery}
								isLoading={false}
								onExport={handleExport}
							/>
						</div>

						{currentTab === PANEL_TYPES.LIST && (
							<div className="trace-explorer-list-view">
								<ListView isFilterApplied={isFilterApplied} />
							</div>
						)}

						{currentTab === PANEL_TYPES.TRACE && (
							<div className="trace-explorer-traces-view">
								<TracesView isFilterApplied={isFilterApplied} />
							</div>
						)}

						{currentTab === PANEL_TYPES.TIME_SERIES && (
							<div className="trace-explorer-time-series-view">
								<TimeSeriesView
									dataSource={DataSource.TRACES}
									isFilterApplied={isFilterApplied}
								/>
							</div>
						)}

						{currentTab === PANEL_TYPES.TABLE && (
							<div className="trace-explorer-table-view">
								<TableView />
							</div>
						)}
					</div>

					<ExplorerOptionWrapper
						disabled={!stagedQuery}
						query={exportDefaultQuery}
						sourcepage={DataSource.TRACES}
						onExport={handleExport}
					/>
				</div>
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default TracesExplorer;
