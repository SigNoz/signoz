import './InfraMonitoring.styles.scss';

import * as Sentry from '@sentry/react';
import { Tabs } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useState } from 'react';

import { getTabsItems } from './utils';

function InfraMonitoringHosts(): JSX.Element {
	const [activeTab, setActiveTab] = useState<string>(PANEL_TYPES.LIST);

	const handleTabChange = (key: string): void => {
		setActiveTab(key);
	};
	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className="infra-monitoring-container">
				<div className="infra-monitoring-header">
					<div className="tabs-wrapper">
						<Tabs
							activeKey={activeTab}
							onChange={handleTabChange}
							items={getTabsItems()}
							className="infra-monitoring-tabs"
							type="card"
							defaultActiveKey={activeTab}
							destroyInactiveTabPane
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
