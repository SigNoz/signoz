import './InfraMonitoring.styles.scss';

import * as Sentry from '@sentry/react';
import { Tabs } from 'antd';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useEffect } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import { getTabsItems } from './utils';

function InfraMonitoringHosts(): JSX.Element {
	const {
		updateAllQueriesOperators,
		handleSetConfig,
		setSupersetQuery,
		setLastUsedQuery,
	} = useQueryBuilder();

	useEffect(() => {
		const newQuery = updateAllQueriesOperators(
			initialQueriesMap.metrics,
			PANEL_TYPES.TIME_SERIES,
			DataSource.METRICS,
		);

		setSupersetQuery(newQuery);
		setLastUsedQuery(0);
		handleSetConfig(PANEL_TYPES.TIME_SERIES, DataSource.METRICS);

		return (): void => {
			setLastUsedQuery(0);
		};
	}, [
		updateAllQueriesOperators,
		setSupersetQuery,
		setLastUsedQuery,
		handleSetConfig,
	]);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className="infra-monitoring-container">
				<div className="infra-monitoring-header">
					<div className="tabs-wrapper">
						<Tabs
							defaultActiveKey="list"
							items={getTabsItems()}
							className="infra-monitoring-tabs"
							type="card"
						/>
					</div>
				</div>
				<div className="time-selector">
					<DateTimeSelectionV2
						showAutoRefresh={false}
						showRefreshText={false}
						hideShareModal
					/>
				</div>
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default InfraMonitoringHosts;
