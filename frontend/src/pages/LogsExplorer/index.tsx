import './LogsExplorer.styles.scss';

import * as Sentry from '@sentry/react';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import cx from 'classnames';
import ExplorerCard from 'components/ExplorerCard/ExplorerCard';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource } from 'components/QuickFilters/types';
import { LOCALSTORAGE } from 'constants/localStorage';
import LogExplorerQuerySection from 'container/LogExplorerQuerySection';
import LogsExplorerViews from 'container/LogsExplorerViews';
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
import useUrlQueryData from 'hooks/useUrlQueryData';
import { isEqual, isNull } from 'lodash-es';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import { WrapperStyled } from './styles';
import { LogsQuickFiltersConfig, SELECTED_VIEWS } from './utils';

function LogsExplorer(): JSX.Element {
	const [showFrequencyChart, setShowFrequencyChart] = useState(true);
	const [selectedView, setSelectedView] = useState<SELECTED_VIEWS>(
		SELECTED_VIEWS.SEARCH,
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

	const { handleRunQuery, currentQuery } = useQueryBuilder();

	const listQueryKeyRef = useRef<any>();

	const chartQueryKeyRef = useRef<any>();

	const [isLoadingQueries, setIsLoadingQueries] = useState<boolean>(false);

	const handleToggleShowFrequencyChart = (): void => {
		setShowFrequencyChart(!showFrequencyChart);
	};

	const handleChangeSelectedView = (view: SELECTED_VIEWS): void => {
		setSelectedView(view);
	};

	const handleFilterVisibilityChange = (): void => {
		setLocalStorageApi(
			LOCALSTORAGE.SHOW_LOGS_QUICK_FILTERS,
			String(!showFilters),
		);
		setShowFilters((prev) => !prev);
	};

	// Switch to query builder view if there are more than 1 queries
	useEffect(() => {
		if (currentQuery.builder.queryData.length > 1) {
			handleChangeSelectedView(SELECTED_VIEWS.QUERY_BUILDER);
		}
		if (
			currentQuery.builder.queryData.length === 1 &&
			currentQuery.builder.queryData?.[0]?.groupBy?.length > 0
		) {
			handleChangeSelectedView(SELECTED_VIEWS.QUERY_BUILDER);
		}
	}, [currentQuery.builder.queryData, currentQuery.builder.queryData.length]);

	const {
		queryData: optionsQueryData,
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
		const migratedQuery = migrateOptionsQuery(optionsQueryData);
		// Only redirect if the query was actually modified
		if (!isEqual(migratedQuery, optionsQueryData)) {
			redirectWithOptionsData(migratedQuery);
		}
	}, [migrateOptionsQuery, optionsQueryData, redirectWithOptionsData]);

	const isMultipleQueries = useMemo(
		() =>
			currentQuery.builder.queryData?.length > 1 ||
			currentQuery.builder.queryFormulas?.length > 0,
		[currentQuery],
	);

	const isGroupByPresent = useMemo(
		() =>
			currentQuery.builder.queryData?.length === 1 &&
			currentQuery.builder.queryData?.[0]?.groupBy?.length > 0,
		[currentQuery.builder.queryData],
	);

	const toolbarViews = useMemo(
		() => ({
			search: {
				name: 'search',
				label: 'Search',
				disabled: isMultipleQueries || isGroupByPresent,
				show: true,
			},
			queryBuilder: {
				name: 'query-builder',
				label: 'Query Builder',
				disabled: false,
				show: true,
			},
			clickhouse: {
				name: 'clickhouse',
				label: 'Clickhouse',
				disabled: false,
				show: false,
			},
		}),
		[isGroupByPresent, isMultipleQueries],
	);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className={cx('logs-module-page', showFilters ? 'filter-visible' : '')}>
				{showFilters && (
					<section className={cx('log-quick-filter-left-section')}>
						<QuickFilters
							source={QuickFiltersSource.LOGS_EXPLORER}
							config={LogsQuickFiltersConfig}
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
								onToggleHistrogramVisibility={handleToggleShowFrequencyChart}
								showFrequencyChart={showFrequencyChart}
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

					<WrapperStyled>
						<div className="log-explorer-query-container">
							<div>
								<ExplorerCard sourcepage={DataSource.LOGS}>
									<LogExplorerQuerySection selectedView={selectedView} />
								</ExplorerCard>
							</div>
							<div className="logs-explorer-views">
								<LogsExplorerViews
									selectedView={selectedView}
									showFrequencyChart={showFrequencyChart}
									listQueryKeyRef={listQueryKeyRef}
									chartQueryKeyRef={chartQueryKeyRef}
									setIsLoadingQueries={setIsLoadingQueries}
								/>
							</div>
						</div>
					</WrapperStyled>
				</section>
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default LogsExplorer;
