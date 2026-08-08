import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import { useSearchParams } from 'react-router-dom-v5-compat';
import * as Sentry from '@sentry/react';
import { Card } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import QueryCancelledPlaceholder from 'components/QueryCancelledPlaceholder';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource, SignalType } from 'components/QuickFilters/types';
import WarningPopover from 'components/WarningPopover/WarningPopover';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import LeftToolbarActions from 'container/QueryBuilder/components/ToolbarActions/LeftToolbarActions';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import Toolbar from 'container/Toolbar/Toolbar';
import ListView from 'container/TracesExplorer/ListView';
import TableView from 'container/TracesExplorer/TableView';
import TracesView from 'container/TracesExplorer/TracesView';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import {
	ICurrentQueryData,
	useHandleExplorerTabChange,
} from 'hooks/useHandleExplorerTabChange';
import { isEmpty } from 'lodash-es';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import TimeSeriesView from 'pages/TracesExplorer/TimeSeriesView';
import { Warning } from 'types/api';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import {
	explorerViewToPanelType,
	getExplorerViewFromUrl,
} from 'utils/explorerUtils';

import {
	AI_EXPLORER_TOOLBAR_VIEWS,
	AI_OBSERVABILITY_QUICK_FILTERS_CONFIG,
} from './constants';
import QuerySection from './QuerySection';

import './Explorer.styles.scss';

/**
 * Explorer shell for AI Observability.
 *
 * Owns the quick-filter rail, the query builder and the view switcher; the four
 * views render underneath it. Everything below this component is the existing,
 * signal-generic traces machinery — the AI scope is expressed through the query
 * itself, not through view-specific behaviour.
 *
 * Trace View is the landing view (§6.2C). The quick filters and the query
 * builder are mounted outside the view switcher so both survive a view change.
 */
function Explorer(): JSX.Element {
	const {
		updateAllQueriesOperators,
		handleRunQuery,
		stagedQuery,
		handleSetConfig,
	} = useQueryBuilder();

	const [searchParams] = useSearchParams();
	const queryClient = useQueryClient();
	const listQueryKeyRef = useRef<any>();

	const panelTypesFromUrl = useGetPanelTypesQueryParam(PANEL_TYPES.TRACE);
	const [isLoadingQueries, setIsLoadingQueries] = useState<boolean>(false);
	const [isCancelled, setIsCancelled] = useState(false);
	const [warning, setWarning] = useState<Warning | undefined>();
	const [isFilterRailOpen, setIsFilterRailOpen] = useState<boolean>(true);

	const [selectedView, setSelectedView] = useState<ExplorerViews>(() =>
		getExplorerViewFromUrl(searchParams, panelTypesFromUrl),
	);

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
		// The active view unmounts when cancelled, so no child will reset this.
		setIsLoadingQueries(false);
	}, [queryClient]);

	const defaultQuery = useMemo(
		(): Query =>
			updateAllQueriesOperators(
				initialQueriesMap.traces,
				PANEL_TYPES.TRACE,
				DataSource.TRACES,
			),
		[updateAllQueriesOperators],
	);

	useShareBuilderUrl({ defaultValue: defaultQuery });

	const { handleExplorerTabChange } = useHandleExplorerTabChange();

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

	const logEventCalledRef = useRef(false);
	useEffect(() => {
		if (!logEventCalledRef.current) {
			logEvent('AI Observability Explorer: Page visited', {});
			logEventCalledRef.current = true;
		}
	}, []);

	const isFilterApplied = useMemo(() => {
		const result = stagedQuery?.builder?.queryData?.filter(
			(item) => !isEmpty(item.filters?.items) && !item.disabled,
		);
		return !!result?.length;
	}, [stagedQuery]);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className="ai-explorer-page" data-testid="ai-observability-explorer">
				<Card className="ai-explorer-filter" hidden={!isFilterRailOpen}>
					<QuickFilters
						className="qf-ai-observability-explorer"
						config={AI_OBSERVABILITY_QUICK_FILTERS_CONFIG}
						source={QuickFiltersSource.AI_OBSERVABILITY}
						signal={SignalType.AI_OBSERVABILITY}
						// One query per view here, so naming which query the filters apply to
						// would be noise.
						showQueryName={false}
						handleFilterVisibilityChange={(): void =>
							setIsFilterRailOpen(!isFilterRailOpen)
						}
					/>
				</Card>

				<div
					className={cx('ai-explorer', {
						'filters-expanded': isFilterRailOpen,
					})}
				>
					<Toolbar
						showAutoRefresh
						leftActions={
							<LeftToolbarActions
								showFilter={isFilterRailOpen}
								handleFilterVisibilityChange={(): void =>
									setIsFilterRailOpen(!isFilterRailOpen)
								}
								items={AI_EXPLORER_TOOLBAR_VIEWS}
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

					<div className="query-section-container">
						<QuerySection />
					</div>

					<div className="ai-explorer-views">
						{isCancelled && (
							<QueryCancelledPlaceholder subText='Click "Run Query" to load AI traces.' />
						)}

						{!isCancelled && selectedView === ExplorerViews.TRACE && (
							<div className="ai-explorer-trace-view">
								<TracesView
									isFilterApplied={isFilterApplied}
									setWarning={setWarning}
									setIsLoadingQueries={setIsLoadingQueries}
									queryKeyRef={listQueryKeyRef}
								/>
							</div>
						)}

						{!isCancelled && selectedView === ExplorerViews.LIST && (
							<div className="ai-explorer-list-view">
								<ListView
									isFilterApplied={isFilterApplied}
									setWarning={setWarning}
									setIsLoadingQueries={setIsLoadingQueries}
									queryKeyRef={listQueryKeyRef}
								/>
							</div>
						)}

						{!isCancelled && selectedView === ExplorerViews.TIMESERIES && (
							<div className="ai-explorer-time-series-view">
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
							<div className="ai-explorer-table-view">
								<TableView
									setWarning={setWarning}
									setIsLoadingQueries={setIsLoadingQueries}
									queryKeyRef={listQueryKeyRef}
								/>
							</div>
						)}
					</div>
				</div>
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default Explorer;
