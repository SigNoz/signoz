import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QueryKey, useQueryClient } from 'react-query';
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
import { initialQueryAIWithType } from 'constants/queryBuilder';
import { useOptionsMenu } from 'container/OptionsMenu';
import LeftToolbarActions from 'container/QueryBuilder/components/ToolbarActions/LeftToolbarActions';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import Toolbar from 'container/Toolbar/Toolbar';
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
import { Warning } from 'types/api';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import {
	explorerViewToPanelType,
	getExplorerViewFromUrl,
} from 'utils/explorerUtils';

import {
	DEFAULT_PANEL_TYPE,
	defaultSelectedColumns,
	TOOLBAR_VIEWS,
} from './constants';
import styles from './Explorer.module.scss';
import ListView from './ListView/ListView';
import QuerySection from './QuerySection/QuerySection';
import TableView from './TableView/TableView';
import TimeSeriesView from './TimeSeriesView/TimeSeriesView';
import TracesView from './TracesView/TracesView';

// Forked from the Traces Explorer; diverges as the GenAI query surface lands.
function Explorer(): JSX.Element {
	const {
		updateAllQueriesOperators,
		handleRunQuery,
		stagedQuery,
		handleSetConfig,
	} = useQueryBuilder();

	// TODO(ai-explorer): destructure `{ options }` when save-view / add-to-dashboard
	// land (Traces Explorer passes it to getExportQueryData). Until then the call
	// only seeds `?options=` for views that do not mount ListView.
	// TODO: shares the Traces Explorer's saved columns; needs its own ai_o11y key.
	useOptionsMenu({
		storageKey: LOCALSTORAGE.TRACES_LIST_OPTIONS,
		dataSource: DataSource.TRACES,
		aggregateOperator: 'noop',
		initialOptions: {
			selectColumns: defaultSelectedColumns,
		},
	});

	const [searchParams] = useSearchParams();
	const queryClient = useQueryClient();
	const listQueryKeyRef = useRef<QueryKey>();

	// Get panel type from URL
	const panelTypesFromUrl = useGetPanelTypesQueryParam(DEFAULT_PANEL_TYPE);
	const [isLoadingQueries, setIsLoadingQueries] = useState<boolean>(false);
	const [isCancelled, setIsCancelled] = useState(false);

	useEffect(() => {
		if (isLoadingQueries) {
			setIsCancelled(false);
		}
	}, [isLoadingQueries]);

	const handleCancelQuery = useCallback(() => {
		if (listQueryKeyRef.current) {
			void queryClient.cancelQueries(listQueryKeyRef.current);
		}
		setIsCancelled(true);
		// The active view unmounts on cancel, so no child will reset this.
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
				initialQueryAIWithType,
				DEFAULT_PANEL_TYPE,
				DataSource.TRACES,
			),
		[updateAllQueriesOperators],
	);

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

	useShareBuilderUrl({ defaultValue: defaultQuery });

	const logEventCalledRef = useRef(false);

	useEffect(() => {
		if (!logEventCalledRef.current) {
			void logEvent('AI Observability Explorer: Page visited', {});
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
			<div
				className={styles.explorerPage}
				data-testid="llm-observability-explorer"
			>
				<Card className={styles.filter} hidden={!isOpen}>
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
					className={cx(styles.explorer, {
						[styles.isFiltersExpanded]: isOpen,
					})}
				>
					<div>
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

					<div className={styles.views}>
						{isCancelled && (
							<QueryCancelledPlaceholder subText='Click "Run Query" to load traces.' />
						)}

						{!isCancelled && selectedView === ExplorerViews.LIST && (
							<ListView
								isFilterApplied={isFilterApplied}
								setWarning={setWarning}
								setIsLoadingQueries={setIsLoadingQueries}
								queryKeyRef={listQueryKeyRef}
							/>
						)}

						{!isCancelled && selectedView === ExplorerViews.TRACE && (
							<TracesView
								isFilterApplied={isFilterApplied}
								setWarning={setWarning}
								setIsLoadingQueries={setIsLoadingQueries}
								queryKeyRef={listQueryKeyRef}
							/>
						)}

						{!isCancelled && selectedView === ExplorerViews.TIMESERIES && (
							<TimeSeriesView
								dataSource={DataSource.TRACES}
								isFilterApplied={isFilterApplied}
								setWarning={setWarning}
								setIsLoadingQueries={setIsLoadingQueries}
								queryKeyRef={listQueryKeyRef}
							/>
						)}

						{!isCancelled && selectedView === ExplorerViews.TABLE && (
							<TableView
								setWarning={setWarning}
								setIsLoadingQueries={setIsLoadingQueries}
								queryKeyRef={listQueryKeyRef}
							/>
						)}
					</div>
				</div>
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default Explorer;
