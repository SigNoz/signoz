import { useEffect } from 'react';
import logEvent from 'api/common/logEvent';
import SystemDashboard from 'container/SystemDashboard/SystemDashboard';
import { createSystemDashboardHost } from 'container/SystemDashboard/systemDashboardHost';
import type { DashboardControlsInput } from 'pages/DashboardPage/DashboardContainer/controls/types';

import styles from './Overview.module.scss';

const AI_OVERVIEW = createSystemDashboardHost(
	'ai-o11y-overview',
	'llm-observability-overview',
);

// Embedded under the AI Observability tabs, which own the page header.
const EMBEDDED_CONTROLS: DashboardControlsInput = {
	header: false,
	title: false,
	dashboardActions: false,
	panelActions: false,
};

function Overview(): JSX.Element {
	useEffect(() => {
		void logEvent('AI Observability Overview: Page visited', {});
	}, []);

	return (
		<div className={styles.overview} data-testid="llm-observability-overview">
			<SystemDashboard host={AI_OVERVIEW} controls={EMBEDDED_CONTROLS} />
		</div>
	);
}

export default Overview;
