import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import { useSearchParams } from 'react-router-dom-v5-compat';
import * as Sentry from '@sentry/react';
import { Card } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import ExplorerCard from 'components/ExplorerCard/ExplorerCard';
import QueryCancelledPlaceholder from 'components/QueryCancelledPlaceholder';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource, SignalType } from 'components/QuickFilters/types';
import WarningPopover from 'components/WarningPopover/WarningPopover';
import { LOCALSTORAGE } from 'constants/localStorage';
import { AVAILABLE_EXPORT_PANEL_TYPES } from 'constants/panelTypes';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { usePageActions } from 'container/AIAssistant/pageActions/usePageActions';
import ExplorerOptionWrapper from 'container/ExplorerOptions/ExplorerOptionWrapper';
import { useOptionsMenu } from 'container/OptionsMenu';
import LeftToolbarActions from 'container/QueryBuilder/components/ToolbarActions/LeftToolbarActions';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import Toolbar from 'container/Toolbar/Toolbar';
import {
	getExportQueryData,
	getQueryByPanelType,
} from 'container/TracesExplorer/explorerUtils';
import ListView from 'container/TracesExplorer/ListView';
import { defaultSelectedColumns } from 'container/TracesExplorer/ListView/configs';
import QuerySection from 'container/TracesExplorer/QuerySection';
import TableView from 'container/TracesExplorer/TableView';
import TracesView from 'container/TracesExplorer/TracesView';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import {
	ICurrentQueryData,
	useHandleExplorerTabChange,
} from 'hooks/useHandleExplorerTabChange';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { isEmpty } from 'lodash-es';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import { TOOLBAR_VIEWS } from 'pages/TracesExplorer/constants';
import { Warning } from 'types/api';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { generateExportToDashboardLink } from 'utils/dashboard/generateExportToDashboardLink';
import {
	explorerViewToPanelType,
	getExplorerViewFromUrl,
} from 'utils/explorerUtils';
import { v4 } from 'uuid';

import {
	tracesAddFilterAction,
	tracesChangeViewAction,
	tracesRunQueryAction,
	tracesSaveViewAction,
} from './aiActions';
import TimeSeriesView from './TimeSeriesView';

import './TracesExplorer.styles.scss';

function TracesExplorer(): JSX.Element {
	const {
		panelType,
		updateAllQueriesOperators,
		handleRunQuery,
		stagedQuery,
		handleSetConfig,
		currentQuery,
		handleSetQueryData,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	const isAIAssistantEnabled = useIsAIAssistantEnabled();

	const { options } = useOptionsMenu({
		storageKey: LOCALSTORAGE.TRACES_LIST_OPTIONS,
		dataSource: DataSource.TRACES,
		aggregateOperator: 'noop',
		initialOptions: {
			selectColumns: defaultSelectedColumns,
		},
	});

	const [searchParams] = useSearchParams();
	const queryClient = useQueryClient();
	const listQueryKeyRef = useRef<any>();

	// Get panel type from URL
	const panelTypesFromUrl = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);
	const [isLoadingQueries, setIsLoadingQueries] = useState<boolean>(false);
	const [isCancelled, setIsCancelled] = useState(false);

	useEffect(() => {
		if (isLoadingQueries) {
			setIsCancelled(false);
		}
	}, [isLoadingQueries]);

	const handleCancelQuery = useCallback(() => {
		if (listQueryKeyRef.current) {
			queryClient.cancelQueries(listQueryKeyRef.current);
		}
		setIsCancelled(true);
		// Reset loading state — the active view unmounts when cancelled, so no
		// child will call setIsLoadingQueries(false) otherwise.
		setIsLoadingQueries(false);
	}, [queryClient]);

	const [selectedView, setSelectedView] = useState<ExplorerViews>(() =>
		getExplorerViewFromUrl(searchParams, panelTypesFromUrl),
	);

	const [warning, setWarning] = useState<Warning | undefined>();
	const [isOpen, setOpen] = useState<boolean>(true);

	const defaultQuery = useMemo(
		(): Query =>
			updateAllQueriesOperators(
				initialQueriesMap.traces,
				PANEL_TYPES.LIST,
				DataSource.TRACES,
			),
		[updateAllQueriesOperators],
	);

	const { handleExplorerTabChange } = useHandleExplorerTabChange();
	const { safeNavigate } = useSafeNavigate();

	const handleChangeSelectedView = useCallback(
		(view: ExplorerViews, querySearchParameters?: ICurrentQueryData): void => {
			handleSetConfig(explorerViewToPanelType[view], DataSource.TRACES);

			setSelectedView(view);

			handleExplorerTabChange(
				explorerViewToPanelType[view],
				querySearchParameters,
			);
		},
		[handleExplorerTabChange, handleSetConfig],
	);

	// ─── AI Assistant page actions (only when license feature is on) ───────────
	const aiActions = useMemo(
		() =>
			isAIAssistantEnabled
				? [
						tracesRunQueryAction({
							currentQuery,
							handleSetQueryData,
							redirectWithQueryBuilderData,
						}),
						tracesAddFilterAction({
							currentQuery,
							handleSetQueryData,
							redirectWithQueryBuilderData,
						}),
						tracesChangeViewAction({
							onChangeView: (view) => handleChangeSelectedView(view as ExplorerViews),
						}),
						tracesSaveViewAction({
							// POC stub — logs a save request; wire to real API when available
							onSaveView: async (name) => {
								// eslint-disable-next-line no-console
								console.info('[AI Assistant] Save view requested:', name);
							},
						}),
					]
				: [],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			isAIAssistantEnabled,
			currentQuery,
			handleSetQueryData,
			redirectWithQueryBuilderData,
			handleChangeSelectedView,
		],
	);
	usePageActions('traces-explorer', aiActions);
	// ───────────────────────────────────────────────────────────────────────────

	const exportDefaultQuery = useMemo(
		() =>
			getQueryByPanelType(
				stagedQuery || initialQueriesMap.traces,
				panelType || PANEL_TYPES.LIST,
			),
		[stagedQuery, panelType],
	);

	const handleExport = useCallback(
		(dashboard: Dashboard | null, isNewDashboard?: boolean): void => {
			if (!dashboard || !panelType) {
				return;
			}

			const panelTypeParam = AVAILABLE_EXPORT_PANEL_TYPES.includes(panelType)
				? panelType
				: PANEL_TYPES.TIME_SERIES;

			const widgetId = v4();

			const query = getExportQueryData(
				exportDefaultQuery,
				panelTypeParam,
				options,
			);

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
		[exportDefaultQuery, panelType, safeNavigate, options],
	);

	useShareBuilderUrl({ defaultValue: defaultQuery });

	const logEventCalledRef = useRef(false);

	useEffect(() => {
		if (!logEventCalledRef.current) {
			logEvent('Traces Explorer: Page visited', {});
			logEventCalledRef.current = true;
		}
	}, []);

	const isFilterApplied = useMemo(() => {
		// if any of the non-disabled queries has filters applied, return true
		const result = stagedQuery?.builder?.queryData?.filter(
			(item) => !isEmpty(item.filters?.items) && !item.disabled,
		);
		return !!result?.length;
	}, [stagedQuery]);

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
									items={TOOLBAR_VIEWS}
									selectedView={selectedView}
									onChangeSelectedView={handleChangeSelectedView}
								/>
							}
							warningElement={
								!isEmpty(warning) ? <WarningPopover warningData={warning} /> : <div />
							}
							rightActions={
								<RightToolbarActions
									onStageRunQuery={(): void => {
										setIsCancelled(false);
										handleRunQuery();
									}}
									isLoadingQueries={isLoadingQueries}
									handleCancelQuery={handleCancelQuery}
								/>
							}
						/>
					</div>
					<ExplorerCard sourcepage={DataSource.TRACES}>
						<div className="query-section-container">
							<QuerySection />
						</div>
					</ExplorerCard>

					<div className="traces-explorer-views">
						{isCancelled && (
							<QueryCancelledPlaceholder subText='Click "Run Query" to load traces.' />
						)}

						{!isCancelled && selectedView === ExplorerViews.LIST && (
							<div className="trace-explorer-list-view">
								<ListView
									isFilterApplied={isFilterApplied}
									setWarning={setWarning}
									setIsLoadingQueries={setIsLoadingQueries}
									queryKeyRef={listQueryKeyRef}
								/>
							</div>
						)}

						{!isCancelled && selectedView === ExplorerViews.TRACE && (
							<div className="trace-explorer-traces-view">
								<TracesView
									isFilterApplied={isFilterApplied}
									setWarning={setWarning}
									setIsLoadingQueries={setIsLoadingQueries}
									queryKeyRef={listQueryKeyRef}
								/>
							</div>
						)}

						{!isCancelled && selectedView === ExplorerViews.TIMESERIES && (
							<div className="trace-explorer-time-series-view">
								<TimeSeriesView
									dataSource={DataSource.TRACES}
									isFilterApplied={isFilterApplied}
									setWarning={setWarning}
									setIsLoadingQueries={setIsLoadingQueries}
									queryKeyRef={listQueryKeyRef}
								/>
							</div>
						)}

						{!isCancelled && selectedView === ExplorerViews.TABLE && (
							<div className="trace-explorer-table-view">
								<TableView
									setWarning={setWarning}
									setIsLoadingQueries={setIsLoadingQueries}
									queryKeyRef={listQueryKeyRef}
								/>
							</div>
						)}
					</div>

					<ExplorerOptionWrapper
						disabled={!stagedQuery}
						query={exportDefaultQuery}
						sourcepage={DataSource.TRACES}
						onExport={handleExport}
						handleChangeSelectedView={handleChangeSelectedView}
					/>
				</div>
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default TracesExplorer;
