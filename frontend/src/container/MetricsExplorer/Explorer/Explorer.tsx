import './Explorer.styles.scss';

import * as Sentry from '@sentry/react';
import { Switch } from 'antd';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ExplorerOptionWrapper from 'container/ExplorerOptions/ExplorerOptionWrapper';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import DateTimeSelector from 'container/TopNav/DateTimeSelectionV2';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { generateExportToDashboardLink } from 'utils/dashboard/generateExportToDashboardLink';
import { v4 as uuid } from 'uuid';

import QuerySection from './QuerySection';
import TimeSeries from './TimeSeries';
import { ExplorerTabs } from './types';
import { splitQueryIntoOneChartPerQuery } from './utils';

const ONE_CHART_PER_QUERY_ENABLED_KEY = 'isOneChartPerQueryEnabled';

function Explorer(): JSX.Element {
	const {
		handleRunQuery,
		stagedQuery,
		updateAllQueriesOperators,
		currentQuery,
	} = useQueryBuilder();
	const { safeNavigate } = useSafeNavigate();

	const [searchParams, setSearchParams] = useSearchParams();
	const isOneChartPerQueryEnabled =
		searchParams.get(ONE_CHART_PER_QUERY_ENABLED_KEY) === 'true';

	const [showOneChartPerQuery, toggleShowOneChartPerQuery] = useState(
		isOneChartPerQueryEnabled,
	);
	const [selectedTab] = useState<ExplorerTabs>(ExplorerTabs.TIME_SERIES);

	const handleToggleShowOneChartPerQuery = (): void => {
		toggleShowOneChartPerQuery(!showOneChartPerQuery);
		setSearchParams({
			...Object.fromEntries(searchParams),
			[ONE_CHART_PER_QUERY_ENABLED_KEY]: (!showOneChartPerQuery).toString(),
		});
	};

	const exportDefaultQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				currentQuery || initialQueriesMap[DataSource.METRICS],
				PANEL_TYPES.TIME_SERIES,
				DataSource.METRICS,
			),
		[currentQuery, updateAllQueriesOperators],
	);

	useShareBuilderUrl(exportDefaultQuery);

	const handleExport = useCallback(
		(
			dashboard: Dashboard | null,
			_isNewDashboard?: boolean,
			queryToExport?: Query,
		): void => {
			if (!dashboard) return;

			const widgetId = uuid();

			const dashboardEditView = generateExportToDashboardLink({
				query: queryToExport || exportDefaultQuery,
				panelType: PANEL_TYPES.TIME_SERIES,
				dashboardId: dashboard.id,
				widgetId,
			});

			safeNavigate(dashboardEditView);
		},
		[exportDefaultQuery, safeNavigate],
	);

	const splitedQueries = useMemo(
		() =>
			splitQueryIntoOneChartPerQuery(
				stagedQuery || initialQueriesMap[DataSource.METRICS],
			),
		[stagedQuery],
	);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className="metrics-explorer-explore-container">
				<div className="explore-header">
					<div className="explore-header-left-actions">
						<span>1 chart/query</span>
						<Switch
							checked={showOneChartPerQuery}
							onChange={handleToggleShowOneChartPerQuery}
							size="small"
						/>
					</div>
					<div className="explore-header-right-actions">
						<DateTimeSelector showAutoRefresh />
						<RightToolbarActions onStageRunQuery={handleRunQuery} />
					</div>
				</div>
				<QuerySection />
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
						<TimeSeries showOneChartPerQuery={showOneChartPerQuery} />
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
		</Sentry.ErrorBoundary>
	);
}

export default Explorer;
