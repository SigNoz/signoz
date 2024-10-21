import './InfraMonitoring.styles.scss';

import * as Sentry from '@sentry/react';
import { Tabs } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';

import { getTabsItems } from './utils';

function InfraMonitoringHosts(): JSX.Element {
	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className="infra-monitoring-hosts-page">
				<Tabs
					items={getTabsItems()}
					activeKey={PANEL_TYPES.LIST}
					defaultActiveKey={PANEL_TYPES.LIST}
					type="card"
				/>
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default InfraMonitoringHosts;
