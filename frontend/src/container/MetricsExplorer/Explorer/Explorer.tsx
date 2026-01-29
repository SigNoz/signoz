import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';
import * as Sentry from '@sentry/react';
import { Switch, Tooltip } from 'antd';
import logEvent from 'api/common/logEvent';
import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import WarningPopover from 'components/WarningPopover/WarningPopover';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ExplorerOptionWrapper from 'container/ExplorerOptions/ExplorerOptionWrapper';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import DateTimeSelector from 'container/TopNav/DateTimeSelectionV2';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { isEmpty } from 'lodash-es';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { Warning } from 'types/api';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { generateExportToDashboardLink } from 'utils/dashboard/generateExportToDashboardLink';
import { v4 as uuid } from 'uuid';

import { MetricsExplorerEventKeys, MetricsExplorerEvents } from '../events';
import MetricDetails from '../MetricDetails/MetricDetails';
import TimeSeries from './TimeSeries';
import { ExplorerTabs } from './types';
import {
	getMetricUnits,
	splitQueryIntoOneChartPerQuery,
	useGetMetrics,
} from './utils';

import './Explorer.styles.scss';

const ONE_CHART_PER_QUERY_ENABLED_KEY = 'isOneChartPerQueryEnabled';

function Explorer(): JSX.Element {
	const {
		handleRunQuery,
		stagedQuery,
		updateAllQueriesOperators,
		currentQuery,
	} = useQueryBuilder();
	const { safeNavigate } = useSafeNavigate();
	const [isMetricDetailsOpen, setIsMetricDetailsOpen] = useState(false);

	const metricNames = useMemo(() => {
		const currentMetricNames: string[] = [];
		stagedQuery?.builder.queryData.forEach((query) => {
			if (query.aggregateAttribute?.key) {
				currentMetricNames.push(query.aggregateAttribute?.key);
			}
		});
		return currentMetricNames;
	}, [stagedQuery]);

	const {
		metrics,
		isLoading: isMetricUnitsLoading,
		isError: isMetricUnitsError,
	} = useGetMetrics(metricNames);

	const units = useMemo(() => getMetricUnits(metrics), [metrics]);

	const areAllMetricUnitsSame = useMemo(
		() =>
			!isMetricUnitsLoading &&
			!isMetricUnitsError &&
			units.length > 0 &&
			units.every((unit) => unit && unit === units[0]),
		[units, isMetricUnitsLoading, isMetricUnitsError],
	);

	const [searchParams, setSearchParams] = useSearchParams();
	const isOneChartPerQueryEnabled =
		searchParams.get(ONE_CHART_PER_QUERY_ENABLED_KEY) === 'true';

	const [showOneChartPerQuery, toggleShowOneChartPerQuery] = useState(
		isOneChartPerQueryEnabled,
	);
	const [disableOneChartPerQuery, toggleDisableOneChartPerQuery] = useState(
		false,
	);
	const [selectedTab] = useState<ExplorerTabs>(ExplorerTabs.TIME_SERIES);
	const [yAxisUnit, setYAxisUnit] = useState<string | undefined>();

	const unitsLength = useMemo(() => units.length, [units]);
	const firstUnit = useMemo(() => units?.[0], [units]);

	useEffect(() => {
		// Set the y axis unit to the first metric unit if
		// 1. There is one metric unit and it is not empty
		// 2. All metric units are the same and not empty
		// Else, set the y axis unit to empty if
		// 1. There are more than one metric units and they are not the same
		// 2. There are no metric units
		// 3. There is exactly one metric unit but it is empty/undefined
		if (unitsLength === 0) {
			setYAxisUnit(undefined);
		} else if (unitsLength === 1 && firstUnit) {
			setYAxisUnit(firstUnit);
		} else if (unitsLength === 1 && !firstUnit) {
			setYAxisUnit(undefined);
		} else if (areAllMetricUnitsSame) {
			if (firstUnit) {
				setYAxisUnit(firstUnit);
			} else {
				setYAxisUnit(undefined);
			}
		} else if (unitsLength > 1 && !areAllMetricUnitsSame) {
			setYAxisUnit(undefined);
		}
	}, [unitsLength, firstUnit, areAllMetricUnitsSame]);

	useEffect(() => {
		// Don't apply logic during loading to avoid overwriting user preferences
		if (isMetricUnitsLoading) {
			return;
		}

		// Disable one chart per query if -
		// 1. There are more than one metric
		// 2. The metric units are not the same
		if (units.length > 1 && !areAllMetricUnitsSame) {
			toggleShowOneChartPerQuery(true);
			toggleDisableOneChartPerQuery(true);
		} else if (units.length <= 1) {
			toggleShowOneChartPerQuery(false);
			toggleDisableOneChartPerQuery(true);
		} else {
			// When units are the same and loading is complete, restore URL-based preference
			toggleShowOneChartPerQuery(isOneChartPerQueryEnabled);
			toggleDisableOneChartPerQuery(false);
		}
	}, [
		units,
		areAllMetricUnitsSame,
		isMetricUnitsLoading,
		isOneChartPerQueryEnabled,
	]);

	const handleToggleShowOneChartPerQuery = (): void => {
		toggleShowOneChartPerQuery(!showOneChartPerQuery);
		setSearchParams({
			...Object.fromEntries(searchParams),
			[ONE_CHART_PER_QUERY_ENABLED_KEY]: (!showOneChartPerQuery).toString(),
		});
	};

	const defaultQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				initialQueriesMap[DataSource.METRICS],
				PANEL_TYPES.TIME_SERIES,
				DataSource.METRICS,
			),
		[updateAllQueriesOperators],
	);

	const exportDefaultQuery = useMemo(() => {
		const query = updateAllQueriesOperators(
			currentQuery || initialQueriesMap[DataSource.METRICS],
			PANEL_TYPES.TIME_SERIES,
			DataSource.METRICS,
		);
		if (yAxisUnit && !query.unit) {
			return {
				...query,
				unit: yAxisUnit,
			};
		}
		return query;
	}, [currentQuery, updateAllQueriesOperators, yAxisUnit]);

	useShareBuilderUrl({ defaultValue: defaultQuery });

	const handleExport = useCallback(
		(
			dashboard: Dashboard | null,
			_isNewDashboard?: boolean,
			queryToExport?: Query,
		): void => {
			if (!dashboard) {
				return;
			}

			const widgetId = uuid();

			let query = queryToExport || exportDefaultQuery;
			if (yAxisUnit && !query.unit) {
				query = {
					...query,
					unit: yAxisUnit,
				};
			}

			const dashboardEditView = generateExportToDashboardLink({
				query,
				panelType: PANEL_TYPES.TIME_SERIES,
				dashboardId: dashboard.id,
				widgetId,
			});

			safeNavigate(dashboardEditView);
		},
		[exportDefaultQuery, safeNavigate, yAxisUnit],
	);

	const splitedQueries = useMemo(
		() =>
			splitQueryIntoOneChartPerQuery(
				stagedQuery || initialQueriesMap[DataSource.METRICS],
				metricNames,
				units,
			),
		[stagedQuery, metricNames, units],
	);

	const [selectedMetricName, setSelectedMetricName] = useState<string | null>(
		null,
	);

	const handleOpenMetricDetails = (metricName: string): void => {
		setIsMetricDetailsOpen(true);
		setSelectedMetricName(metricName);
	};

	const handleCloseMetricDetails = (): void => {
		setIsMetricDetailsOpen(false);
		setSelectedMetricName(null);
	};

	useEffect(() => {
		logEvent(MetricsExplorerEvents.TabChanged, {
			[MetricsExplorerEventKeys.Tab]: 'explorer',
		});
	}, []);

	const queryComponents = useMemo(
		(): QueryBuilderProps['queryComponents'] => ({}),
		[],
	);

	const [warning, setWarning] = useState<Warning | undefined>(undefined);

	const oneChartPerQueryDisabledTooltip = useMemo(() => {
		if (splitedQueries.length <= 1) {
			return 'One chart per query cannot be toggled for a single query.';
		}
		if (units.length <= 1) {
			return 'One chart per query cannot be toggled when there is only one metric.';
		}
		if (disableOneChartPerQuery) {
			return 'One chart per query cannot be disabled for multiple queries with different units.';
		}
		return undefined;
	}, [disableOneChartPerQuery, splitedQueries.length, units.length]);

	// Show the y axis unit selector if -
	// 1. There is only one metric
	// 2. The metric has no saved unit
	const showYAxisUnitSelector = useMemo(
		() => !isMetricUnitsLoading && units.length === 1 && !units[0],
		[units, isMetricUnitsLoading],
	);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className="metrics-explorer-explore-container">
				<div className="explore-header">
					<div className="explore-header-left-actions">
						<span>1 chart/query</span>
						<Tooltip
							open={disableOneChartPerQuery ? undefined : false}
							title={oneChartPerQueryDisabledTooltip}
						>
							<Switch
								checked={showOneChartPerQuery}
								onChange={handleToggleShowOneChartPerQuery}
								disabled={disableOneChartPerQuery || splitedQueries.length <= 1}
								size="small"
							/>
						</Tooltip>
					</div>
					<div className="explore-header-right-actions">
						{!isEmpty(warning) && <WarningPopover warningData={warning} />}
						<DateTimeSelector showAutoRefresh />
						<RightToolbarActions onStageRunQuery={(): void => handleRunQuery()} />
					</div>
				</div>
				<QueryBuilderV2
					config={{ initialDataSource: DataSource.METRICS, queryVariant: 'static' }}
					panelType={PANEL_TYPES.TIME_SERIES}
					queryComponents={queryComponents}
					showFunctions={false}
					version="v3"
				/>
				{/* TODO: Enable once we have resolved all related metrics issues */}
				{/* <Button.Group className="explore-tabs">
					<Button
						value={ExplorerTabs.TIME_SERIES}
						className={classNames('tab', {
							'selected-view': selectedTab === ExplorerTabs.TIME_SERIES,
						})}
						onClick={(): void => setSelectedTab(ExplorerTabs.TIME_SERIES)}
					>
						<Typography.Text>Time series</Typography.Text>
					</Button>
					<Button
						value={ExplorerTabs.RELATED_METRICS}
						className={classNames('tab', {
							'selected-view': selectedTab === ExplorerTabs.RELATED_METRICS,
						})}
						onClick={(): void => setSelectedTab(ExplorerTabs.RELATED_METRICS)}
					>
						<Typography.Text>Related</Typography.Text>
					</Button>
				</Button.Group> */}
				<div className="explore-content">
					{selectedTab === ExplorerTabs.TIME_SERIES && (
						<TimeSeries
							showOneChartPerQuery={showOneChartPerQuery}
							setWarning={setWarning}
							areAllMetricUnitsSame={areAllMetricUnitsSame}
							isMetricUnitsLoading={isMetricUnitsLoading}
							isMetricUnitsError={isMetricUnitsError}
							metricUnits={units}
							metricNames={metricNames}
							metrics={metrics}
							handleOpenMetricDetails={handleOpenMetricDetails}
							yAxisUnit={yAxisUnit}
							setYAxisUnit={setYAxisUnit}
							showYAxisUnitSelector={showYAxisUnitSelector}
						/>
					)}
					{/* TODO: Enable once we have resolved all related metrics issues */}
					{/* {selectedTab === ExplorerTabs.RELATED_METRICS && (
						<RelatedMetrics metricNames={metricNames} />
					)} */}
				</div>
			</div>
			<ExplorerOptionWrapper
				disabled={!stagedQuery}
				query={exportDefaultQuery}
				sourcepage={DataSource.METRICS}
				onExport={handleExport}
				isOneChartPerQuery={showOneChartPerQuery}
				splitedQueries={splitedQueries}
			/>
			{isMetricDetailsOpen && (
				<MetricDetails
					metricName={selectedMetricName}
					isOpen={isMetricDetailsOpen}
					onClose={handleCloseMetricDetails}
					isModalTimeSelection={false}
				/>
			)}
		</Sentry.ErrorBoundary>
	);
}

export default Explorer;
