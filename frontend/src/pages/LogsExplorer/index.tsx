import './LogsExplorer.styles.scss';

import * as Sentry from '@sentry/react';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import cx from 'classnames';
import ExplorerCard from 'components/ExplorerCard/ExplorerCard';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource, SignalType } from 'components/QuickFilters/types';
import { LOCALSTORAGE } from 'constants/localStorage';
import { PANEL_TYPES } from 'constants/queryBuilder';
import LogExplorerQuerySection from 'container/LogExplorerQuerySection';
import LogsExplorerViewsContainer from 'container/LogsExplorerViews';
import {
	defaultLogsSelectedColumns,
	defaultOptionsQuery,
	URL_OPTIONS,
} from 'container/OptionsMenu/constants';
import { OptionsQuery } from 'container/OptionsMenu/types';
import LeftToolbarActions from 'container/QueryBuilder/components/ToolbarActions/LeftToolbarActions';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import Toolbar from 'container/Toolbar/Toolbar';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useHandleExplorerTabChange } from 'hooks/useHandleExplorerTabChange';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { isEqual, isNull } from 'lodash-es';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { usePreferenceContext } from 'providers/preferences/context/PreferenceContextProvider';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import { ExplorerViews } from './utils';

function LogsExplorer(): JSX.Element {
	const [selectedView, setSelectedView] = useState<ExplorerViews>(
		ExplorerViews.LIST,
	);
	const { preferences, loading: preferencesLoading } = usePreferenceContext();

	const [showFilters, setShowFilters] = useState<boolean>(() => {
		const localStorageValue = getLocalStorageKey(
			LOCALSTORAGE.SHOW_LOGS_QUICK_FILTERS,
		);
		if (!isNull(localStorageValue)) {
			return localStorageValue === 'true';
		}
		return true;
	});

	const { handleRunQuery, handleSetConfig } = useQueryBuilder();

	const { handleExplorerTabChange } = useHandleExplorerTabChange();

	const listQueryKeyRef = useRef<any>();

	const chartQueryKeyRef = useRef<any>();

	const [isLoadingQueries, setIsLoadingQueries] = useState<boolean>(false);

	const handleChangeSelectedView = useCallback(
		(view: ExplorerViews): void => {
			if (selectedView === ExplorerViews.LIST) {
				handleSetConfig(PANEL_TYPES.LIST, DataSource.LOGS);
			}

			setSelectedView(view);
			handleExplorerTabChange(
				view === ExplorerViews.TIMESERIES ? PANEL_TYPES.TIME_SERIES : view,
			);
		},
		[handleSetConfig, handleExplorerTabChange, selectedView],
	);

	const handleFilterVisibilityChange = (): void => {
		setLocalStorageApi(
			LOCALSTORAGE.SHOW_LOGS_QUICK_FILTERS,
			String(!showFilters),
		);
		setShowFilters((prev) => !prev);
	};

	const {
		redirectWithQuery: redirectWithOptionsData,
	} = useUrlQueryData<OptionsQuery>(URL_OPTIONS, defaultOptionsQuery);

	// Get and parse stored columns from localStorage
	const logListOptionsFromLocalStorage = useMemo(() => {
		const data = getLocalStorageKey(LOCALSTORAGE.LOGS_LIST_OPTIONS);

		if (!data) return null;

		try {
			return JSON.parse(data);
		} catch {
			return null;
		}
	}, []);

	// Check if the columns have the required columns (timestamp, body)
	const hasRequiredColumns = useCallback(
		(columns?: Array<{ key: string }> | null): boolean => {
			if (!columns?.length) return false;

			const hasTimestamp = columns.some((col) => col.key === 'timestamp');
			const hasBody = columns.some((col) => col.key === 'body');

			return hasTimestamp && hasBody;
		},
		[],
	);

	// Merge the columns with the required columns (timestamp, body) if missing
	const mergeWithRequiredColumns = useCallback(
		(columns: BaseAutocompleteData[]): BaseAutocompleteData[] => [
			// Add required columns (timestamp, body) if missing
			...(!hasRequiredColumns(columns) ? defaultLogsSelectedColumns : []),
			...columns,
		],
		[hasRequiredColumns],
	);

	// Migrate the options query to the new format
	const migrateOptionsQuery = useCallback(
		(query: OptionsQuery): OptionsQuery => {
			// Skip if already migrated
			if (query.version) return query;

			if (logListOptionsFromLocalStorage?.version) {
				return logListOptionsFromLocalStorage;
			}

			// Case 1: we have localStorage columns
			if (logListOptionsFromLocalStorage?.selectColumns?.length > 0) {
				return {
					...query,
					version: 1,
					selectColumns: mergeWithRequiredColumns(
						logListOptionsFromLocalStorage.selectColumns,
					),
				};
			}

			// Case 2: No query columns in localStorage in but query has columns
			if (query.selectColumns.length > 0) {
				return {
					...query,
					version: 1,
					selectColumns: mergeWithRequiredColumns(query.selectColumns),
				};
			}

			// Case 3: No columns anywhere, use defaults
			return {
				...query,
				version: 1,
				selectColumns: defaultLogsSelectedColumns,
			};
		},
		[mergeWithRequiredColumns, logListOptionsFromLocalStorage],
	);

	useEffect(() => {
		if (!preferences || preferencesLoading) {
			return;
		}
		const migratedQuery = migrateOptionsQuery({
			selectColumns: preferences.columns || defaultLogsSelectedColumns,
			maxLines: preferences.formatting?.maxLines || defaultOptionsQuery.maxLines,
			format: preferences.formatting?.format || defaultOptionsQuery.format,
			fontSize: preferences.formatting?.fontSize || defaultOptionsQuery.fontSize,
			version: preferences.formatting?.version,
		});
		// Only redirect if the query was actually modified
		if (
			!isEqual(migratedQuery, {
				selectColumns: preferences?.columns,
				maxLines: preferences?.formatting?.maxLines,
				format: preferences?.formatting?.format,
				fontSize: preferences?.formatting?.fontSize,
				version: preferences?.formatting?.version,
			})
		) {
			redirectWithOptionsData(migratedQuery);
		}
	}, [
		migrateOptionsQuery,
		preferences,
		redirectWithOptionsData,
		preferencesLoading,
	]);

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

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className={cx('logs-module-page', showFilters ? 'filter-visible' : '')}>
				{showFilters && (
					<section className={cx('log-quick-filter-left-section')}>
						<QuickFilters
							className="qf-logs-explorer"
							signal={SignalType.LOGS}
							source={QuickFiltersSource.LOGS_EXPLORER}
							handleFilterVisibilityChange={handleFilterVisibilityChange}
						/>
					</section>
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
						rightActions={
							<RightToolbarActions
								onStageRunQuery={handleRunQuery}
								listQueryKeyRef={listQueryKeyRef}
								chartQueryKeyRef={chartQueryKeyRef}
								isLoadingQueries={isLoadingQueries}
							/>
						}
						showOldCTA
					/>

					<div className="log-explorer-query-container">
						<div>
							<ExplorerCard sourcepage={DataSource.LOGS}>
								<LogExplorerQuerySection selectedView={selectedView} />
							</ExplorerCard>
						</div>
						<div className="logs-explorer-views">
							<LogsExplorerViewsContainer
								selectedView={selectedView}
								listQueryKeyRef={listQueryKeyRef}
								chartQueryKeyRef={chartQueryKeyRef}
								setIsLoadingQueries={setIsLoadingQueries}
							/>
						</div>
					</div>
				</section>
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default LogsExplorer;
