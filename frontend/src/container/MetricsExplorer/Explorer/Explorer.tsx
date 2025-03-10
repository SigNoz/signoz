import './Explorer.styles.scss';

import * as Sentry from '@sentry/react';
import { Button, Switch, Typography } from 'antd';
import classNames from 'classnames';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import DateTimeSelector from 'container/TopNav/DateTimeSelectionV2';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useMemo, useState } from 'react';

import QuerySection from './QuerySection';
import RelatedMetrics from './RelatedMetrics';
import TimeSeries from './TimeSeries';
import { ExplorerTabs } from './types';

function Explorer(): JSX.Element {
	const { handleRunQuery, stagedQuery } = useQueryBuilder();

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
		</Sentry.ErrorBoundary>
	);
}

export default Explorer;
