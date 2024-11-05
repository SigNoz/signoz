import './InfraMonitoring.styles.scss';

import * as Sentry from '@sentry/react';
import { Tabs } from 'antd';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';

import { getTabsItems } from './utils';

function InfraMonitoringHosts(): JSX.Element {
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
