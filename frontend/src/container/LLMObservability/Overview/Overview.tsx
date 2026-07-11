import { useFullScreenHandle } from 'react-full-screen';
import DashboardVariableSelection from 'container/DashboardContainer/DashboardVariablesSelection';
import GridGraphs from 'container/DashboardContainer/GridGraphs';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';

import { useOverviewDashboardBootstrap } from './hooks/useOverviewDashboardBootstrap';
import styles from './Overview.module.scss';

// Overview tab content for LLM Observability: renders the built-in AI
// observability dashboard (variables bar + widget grid) by reusing the
// dashboard components on top of a store seeded from static JSON.
function Overview(): JSX.Element {
	const handle = useFullScreenHandle();
	const isBootstrapped = useOverviewDashboardBootstrap();

	return (
		<div className={styles.overview} data-testid="llm-observability-overview">
			<header className={styles.pageHeader}>
				<div className={styles.pageHeaderTitle}>
					<h1 className={styles.title}>LLM Observability</h1>
					<p className={styles.subtitle}>
						Monitor and analyze your LLM usage, costs, and performance
					</p>
				</div>
				<DateTimeSelectionV2 showAutoRefresh hideShareModal />
			</header>
			{isBootstrapped && (
				<div className={styles.dashboard}>
					<DashboardVariableSelection />
					<GridGraphs handle={handle} isEmbedded />
				</div>
			)}
		</div>
	);
}

export default Overview;
