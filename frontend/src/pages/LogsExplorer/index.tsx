import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import * as Sentry from '@sentry/react';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import cx from 'classnames';
import ExplorerCard from 'components/ExplorerCard/ExplorerCard';
import QueryCancelledPlaceholder from 'components/QueryCancelledPlaceholder';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource, SignalType } from 'components/QuickFilters/types';
import WarningPopover from 'components/WarningPopover/WarningPopover';
import { LOCALSTORAGE } from 'constants/localStorage';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { usePageActions } from 'container/AIAssistant/pageActions/usePageActions';
import LogExplorerQuerySection from 'container/LogExplorerQuerySection';
import LogsExplorerViewsContainer from 'container/LogsExplorerViews';
import LeftToolbarActions from 'container/QueryBuilder/components/ToolbarActions/LeftToolbarActions';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import Toolbar from 'container/Toolbar/Toolbar';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import {
	ICurrentQueryData,
	useHandleExplorerTabChange,
} from 'hooks/useHandleExplorerTabChange';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';
import { defaultTo, isEmpty, isNull } from 'lodash-es';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { ResizableBox } from 'periscope/components/ResizableBox';
import usePanelWidth from 'periscope/components/ResizableBox/usePanelWidth';
import { EventSourceProvider } from 'providers/EventSource';
import { Warning } from 'types/api';
import { DataSource } from 'types/common/queryBuilder';
import {
	explorerViewToPanelType,
	panelTypeToExplorerView,
} from 'utils/explorerUtils';

import {
	logsAddFilterAction,
	logsChangeViewAction,
	logsRunQueryAction,
	logsSaveViewAction,
} from './aiActions';
import { ExplorerViews } from './utils';

import './LogsExplorer.styles.scss';

const QUICK_FILTERS_DEFAULT_WIDTH = 260;
const QUICK_FILTERS_MIN_WIDTH = 240;
const QUICK_FILTERS_MAX_WIDTH = 500;

function LogsExplorer(): JSX.Element {
	const [showLiveLogs, setShowLiveLogs] = useState<boolean>(false);

	const {
		initialWidth: quickFiltersInitialWidth,
		persistWidth: persistQuickFiltersWidth,
	} = usePanelWidth({
		storageKey: LOCALSTORAGE.QUICK_FILTERS_WIDTH_LOGS,
		defaultWidth: QUICK_FILTERS_DEFAULT_WIDTH,
		minWidth: QUICK_FILTERS_MIN_WIDTH,
		maxWidth: QUICK_FILTERS_MAX_WIDTH,
	});

	// Get panel type from URL
	const panelTypesFromUrl = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);

	const [selectedView, setSelectedView] = useState<ExplorerViews>(
		() => panelTypeToExplorerView[panelTypesFromUrl],
	);

	const [showFilters, setShowFilters] = useState<boolean>(() => {
		const localStorageValue = getLocalStorageKey(
			LOCALSTORAGE.SHOW_LOGS_QUICK_FILTERS,
		);
		if (!isNull(localStorageValue)) {
			return localStorageValue === 'true';
		}
		return true;
	});

	const {
		handleRunQuery,
		handleSetConfig,
		currentQuery,
		handleSetQueryData,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	const { handleExplorerTabChange } = useHandleExplorerTabChange();

	const isAIAssistantEnabled = useIsAIAssistantEnabled();

	const listQueryKeyRef = useRef<any>();

	const chartQueryKeyRef = useRef<any>();

	const [isLoadingQueries, setIsLoadingQueries] = useState<boolean>(false);
	const [isCancelled, setIsCancelled] = useState(false);

	useEffect(() => {
		if (isLoadingQueries) {
			setIsCancelled(false);
		}
	}, [isLoadingQueries]);

	const queryClient = useQueryClient();
	const handleCancelQuery = useCallback(() => {
		if (listQueryKeyRef.current) {
			queryClient.cancelQueries(listQueryKeyRef.current);
		}
		if (chartQueryKeyRef.current) {
			queryClient.cancelQueries(chartQueryKeyRef.current);
		}
		setIsCancelled(true);
		// Reset loading state — the views container unmounts when cancelled, so
		// no child will call setIsLoadingQueries(false) otherwise.
		setIsLoadingQueries(false);
	}, [queryClient]);

	const [warning, setWarning] = useState<Warning | undefined>();

	const handleChangeSelectedView = useCallback(
		(view: ExplorerViews, querySearchParameters?: ICurrentQueryData): void => {
			const nextPanelType = defaultTo(
				explorerViewToPanelType[view],
				PANEL_TYPES.LIST,
			);

			handleSetConfig(nextPanelType, DataSource.LOGS);
			setSelectedView(view);

			if (view !== ExplorerViews.LIST) {
				setShowLiveLogs(false);
			}

			handleExplorerTabChange(nextPanelType, querySearchParameters);
		},
		[handleSetConfig, handleExplorerTabChange, setSelectedView],
	);

	// ─── AI Assistant page actions (only when license feature is on) ───────────
	const aiActions = useMemo(
		() =>
			isAIAssistantEnabled
				? [
						logsRunQueryAction({
							currentQuery,
							handleSetQueryData,
							redirectWithQueryBuilderData,
						}),
						logsAddFilterAction({
							currentQuery,
							handleSetQueryData,
							redirectWithQueryBuilderData,
						}),
						logsChangeViewAction({
							onChangeView: (view) => handleChangeSelectedView(view as ExplorerViews),
						}),
						logsSaveViewAction({
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
	usePageActions('logs-explorer', aiActions);
	// ───────────────────────────────────────────────────────────────────────────

	const handleFilterVisibilityChange = (): void => {
		setLocalStorageApi(
			LOCALSTORAGE.SHOW_LOGS_QUICK_FILTERS,
			String(!showFilters),
		);
		setShowFilters((prev) => !prev);
	};

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
				show: false,
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

	const handleShowLiveLogs = useCallback(() => {
		setShowLiveLogs(true);
	}, []);

	const handleExitLiveLogs = useCallback(() => {
		setShowLiveLogs(false);
	}, []);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<EventSourceProvider>
				<div
					className={cx('logs-module-page', showFilters ? 'filter-visible' : '')}
				>
					{showFilters && (
						<ResizableBox
							handle="right"
							defaultWidth={QUICK_FILTERS_DEFAULT_WIDTH}
							initialWidth={quickFiltersInitialWidth}
							minWidth={QUICK_FILTERS_MIN_WIDTH}
							maxWidth={QUICK_FILTERS_MAX_WIDTH}
							onResize={persistQuickFiltersWidth}
							resetToDefaultOnDoubleClick
							withHandle
							className="log-quick-filter-left-section"
							handleTestId="quick-filters-resize-handle"
						>
							<QuickFilters
								className="qf-logs-explorer"
								signal={SignalType.LOGS}
								source={QuickFiltersSource.LOGS_EXPLORER}
								handleFilterVisibilityChange={handleFilterVisibilityChange}
							/>
						</ResizableBox>
					)}
					<section className={cx('log-module-right-section')}>
						<Toolbar
							showAutoRefresh={false}
							leftActions={
								<LeftToolbarActions
									showFilter={showFilters}
									handleFilterVisibilityChange={handleFilterVisibilityChange}
									items={toolbarViews}
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
									showLiveLogs={showLiveLogs}
								/>
							}
							showLiveLogs={showLiveLogs}
							onGoLive={handleShowLiveLogs}
							onExitLiveLogs={handleExitLiveLogs}
						/>

						<div className="log-explorer-query-container">
							<div>
								<ExplorerCard sourcepage={DataSource.LOGS}>
									<LogExplorerQuerySection selectedView={selectedView} />
								</ExplorerCard>
							</div>
							<div className="logs-explorer-views">
								{isCancelled ? (
									<QueryCancelledPlaceholder subText='Click "Run Query" to load logs.' />
								) : (
									<LogsExplorerViewsContainer
										listQueryKeyRef={listQueryKeyRef}
										chartQueryKeyRef={chartQueryKeyRef}
										setIsLoadingQueries={setIsLoadingQueries}
										setWarning={setWarning}
										showLiveLogs={showLiveLogs}
										handleChangeSelectedView={handleChangeSelectedView}
									/>
								)}
							</div>
						</div>
					</section>
				</div>
			</EventSourceProvider>
		</Sentry.ErrorBoundary>
	);
}

export default LogsExplorer;
