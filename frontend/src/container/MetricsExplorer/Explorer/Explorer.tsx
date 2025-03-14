import './Explorer.styles.scss';

import * as Sentry from '@sentry/react';
import { Button, Switch, Typography } from 'antd';
import axios from 'axios';
import classNames from 'classnames';
import { LOCALSTORAGE } from 'constants/localStorage';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ExplorerOptionWrapper from 'container/ExplorerOptions/ExplorerOptionWrapper';
import { useOptionsMenu } from 'container/OptionsMenu';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import DateTimeSelector from 'container/TopNav/DateTimeSelectionV2';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { addEmptyWidgetInDashboardJSONWithQuery } from 'hooks/dashboard/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useNotifications } from 'hooks/useNotifications';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useCallback, useMemo, useState } from 'react';
import { Dashboard } from 'types/api/dashboard/getAll';
import { DataSource } from 'types/common/queryBuilder';
import { generateExportToDashboardLink } from 'utils/dashboard/generateExportToDashboardLink';
import { v4 as uuid } from 'uuid';

import QuerySection from './QuerySection';
import RelatedMetrics from './RelatedMetrics';
import TimeSeries from './TimeSeries';
import { ExplorerTabs } from './types';

function Explorer(): JSX.Element {
	const {
		handleRunQuery,
		stagedQuery,
		updateAllQueriesOperators,
		currentQuery,
	} = useQueryBuilder();
	const { safeNavigate } = useSafeNavigate();
	const { notifications } = useNotifications();
	const { mutate: updateDashboard, isLoading } = useUpdateDashboard();
	const { options } = useOptionsMenu({
		storageKey: LOCALSTORAGE.METRICS_LIST_OPTIONS,
		dataSource: DataSource.METRICS,
		aggregateOperator: 'noop',
	});

	const [showOneChartPerQuery, toggleShowOneChartPerQuery] = useState(false);
	const [selectedTab, setSelectedTab] = useState<ExplorerTabs>(
		ExplorerTabs.TIME_SERIES,
	);

	const handleToggleShowOneChartPerQuery = (): void =>
		toggleShowOneChartPerQuery(!showOneChartPerQuery);

	const metricNames = useMemo(() => {
		if (!stagedQuery || stagedQuery.builder.queryData.length === 0) {
			return [];
		}
		return stagedQuery.builder.queryData.map(
			(query) => query.aggregateAttribute.key,
		);
	}, [stagedQuery]);

	const exportDefaultQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				currentQuery || initialQueriesMap[DataSource.METRICS],
				PANEL_TYPES.TIME_SERIES,
				DataSource.METRICS,
			),
		[currentQuery, updateAllQueriesOperators],
	);

	const handleExport = useCallback(
		(dashboard: Dashboard | null): void => {
			if (!dashboard) return;

			const widgetId = uuid();

			const updatedDashboard = addEmptyWidgetInDashboardJSONWithQuery(
				dashboard,
				exportDefaultQuery,
				widgetId,
				PANEL_TYPES.TIME_SERIES,
				options.selectColumns,
			);

			updateDashboard(updatedDashboard, {
				onSuccess: (data) => {
					if (data.error) {
						const message =
							data.error === 'feature usage exceeded' ? (
								<span>
									Panel limit exceeded for {DataSource.METRICS} in community edition.
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
						panelType: PANEL_TYPES.TIME_SERIES,
						dashboardId: data.payload?.uuid || '',
						widgetId,
					});

					safeNavigate(dashboardEditView);
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[exportDefaultQuery, notifications, updateDashboard],
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
				<Button.Group className="explore-tabs">
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
				</Button.Group>
				<div className="explore-content">
					{selectedTab === ExplorerTabs.TIME_SERIES && (
						<TimeSeries showOneChartPerQuery={showOneChartPerQuery} />
					)}
					{selectedTab === ExplorerTabs.RELATED_METRICS && (
						<RelatedMetrics metricNames={metricNames} />
					)}
				</div>
			</div>
			<ExplorerOptionWrapper
				disabled={!stagedQuery}
				query={exportDefaultQuery}
				isLoading={isLoading}
				sourcepage={DataSource.METRICS}
				onExport={handleExport}
			/>
		</Sentry.ErrorBoundary>
	);
}

export default Explorer;
