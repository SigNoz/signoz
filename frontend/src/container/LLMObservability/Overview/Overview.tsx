import { useEffect } from 'react';
import logEvent from 'api/common/logEvent';
import SystemDashboard from 'container/SystemDashboard/SystemDashboard';
import { createSystemDashboardHost } from 'container/SystemDashboard/systemDashboardHost';
import { CHARTS_ONLY } from 'pages/DashboardPage/DashboardContainer/controls/presets';

import styles from './Overview.module.scss';

const AI_OVERVIEW = createSystemDashboardHost(
	'ai-o11y-overview',
	'llm-observability-overview',
);

function Overview(): JSX.Element {
	useEffect(() => {
		void logEvent('AI Observability Overview: Page visited', {});
	}, []);

	return (
		<div className={styles.overview} data-testid="llm-observability-overview">
			<SystemDashboard host={AI_OVERVIEW} controls={CHARTS_ONLY} />
		</div>
	);
}

export default Overview;
