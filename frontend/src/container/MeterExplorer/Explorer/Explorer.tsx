import './Explorer.styles.scss';

import * as Sentry from '@sentry/react';
import { Button, Tooltip } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource, SignalType } from 'components/QuickFilters/types';
import { initialQueryMeterWithType, PANEL_TYPES } from 'constants/queryBuilder';
import ExplorerOptionWrapper from 'container/ExplorerOptions/ExplorerOptionWrapper';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import DateTimeSelector from 'container/TopNav/DateTimeSelectionV2';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { Filter } from 'lucide-react';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { generateExportToDashboardLink } from 'utils/dashboard/generateExportToDashboardLink';
import { v4 as uuid } from 'uuid';

import { MeterExplorerEventKeys, MeterExplorerEvents } from '../events';
import TimeSeries from './TimeSeries';
import { splitQueryIntoOneChartPerQuery } from './utils';

function Explorer(): JSX.Element {
	const {
		handleRunQuery,
		stagedQuery,
		updateAllQueriesOperators,
		handleSetQueryData,
		currentQuery,
	} = useQueryBuilder();
	const { safeNavigate } = useSafeNavigate();

	const [showQuickFilters, setShowQuickFilters] = useState(true);

	const defaultQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				initialQueryMeterWithType,
				PANEL_TYPES.BAR,
				DataSource.METRICS,
				'meter' as 'meter' | '',
			),
		[updateAllQueriesOperators],
	);

	useEffect(() => {
		handleSetQueryData(0, {
			...initialQueryMeterWithType.builder.queryData[0],
			source: 'meter',
		});

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const exportDefaultQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				currentQuery || initialQueryMeterWithType,
				PANEL_TYPES.BAR,
				DataSource.METRICS,
				'meter' as 'meter' | '',
			),
		[currentQuery, updateAllQueriesOperators],
	);

	useShareBuilderUrl({ defaultValue: defaultQuery });

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
				panelType: PANEL_TYPES.BAR,
				dashboardId: dashboard.id,
				widgetId,
			});

			safeNavigate(dashboardEditView);
		},
		[exportDefaultQuery, safeNavigate],
	);

	const splitedQueries = useMemo(
		() =>
			splitQueryIntoOneChartPerQuery(stagedQuery || initialQueryMeterWithType),
		[stagedQuery],
	);

	useEffect(() => {
		logEvent(MeterExplorerEvents.TabChanged, {
			[MeterExplorerEventKeys.Tab]: 'explorer',
		});
	}, []);

	const queryComponents = useMemo(
		(): QueryBuilderProps['queryComponents'] => ({}),
		[],
	);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div
				className={cx('meter-explorer-container', {
					'quick-filters-open': showQuickFilters,
				})}
			>
				<div
					className={cx('meter-explorer-quick-filters-section', {
						hidden: !showQuickFilters,
					})}
				>
					<QuickFilters
						className="qf-meter-explorer"
						source={QuickFiltersSource.METER_EXPLORER}
						signal={SignalType.METER_EXPLORER}
						showFilterCollapse
						showQueryName={false}
						handleFilterVisibilityChange={(): void => {
							setShowQuickFilters(!showQuickFilters);
						}}
					/>
				</div>

				<div className="meter-explorer-content-section">
					<div className="meter-explorer-explore-content">
						<div className="explore-header">
							<div className="explore-header-left-actions">
								{!showQuickFilters && (
									<Tooltip title="Show Quick Filters" placement="right" arrow={false}>
										<Button
											className="periscope-btn outline"
											icon={<Filter size={16} />}
											onClick={(): void => setShowQuickFilters(!showQuickFilters)}
										/>
									</Tooltip>
								)}
							</div>

							<div className="explore-header-right-actions">
								<DateTimeSelector showAutoRefresh />
								<RightToolbarActions onStageRunQuery={(): void => handleRunQuery()} />
							</div>
						</div>
						<QueryBuilderV2
							config={{
								initialDataSource: DataSource.METRICS,
								queryVariant: 'static',
								signalSource: 'meter',
							}}
							panelType={PANEL_TYPES.TIME_SERIES}
							queryComponents={queryComponents}
							showFunctions={false}
							version="v3"
						/>

						<div className="explore-content">
							<TimeSeries />
						</div>
					</div>
					<ExplorerOptionWrapper
						disabled={!stagedQuery}
						query={exportDefaultQuery}
						sourcepage={DataSource.METRICS}
						signalSource="meter"
						onExport={handleExport}
						isOneChartPerQuery={false}
						splitedQueries={splitedQueries}
					/>
				</div>
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default Explorer;
